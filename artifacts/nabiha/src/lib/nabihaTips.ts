import { useEffect, useState } from "react";
import type { UserProfile, BalanceSummary, DashboardSummary, Subscription, Commitment } from "@workspace/api-client-react";

export type TipSeverity = "info" | "warning" | "danger";

export interface NabihaTipNavTarget {
  route: string;
  commitmentId?: number;
}

export interface NabihaTip {
  id: string;
  severity: TipSeverity;
  headline: string;
  body: string;
  why: string;
  navTarget?: NabihaTipNavTarget;
}

export interface AlertItem {
  id: string;
  kind: "subscription" | "commitment";
  name: string;
  amount: number;
  currency: string;
  daysUntil: number;
  renewsOnDay?: number | null;
  dueDay?: number;
  severity: "neutral" | "amber" | "red";
  label: string;
  explanation: string;
}

function daysUntilSubscription(renewsOnDay: number, now: Date): number {
  const today = now.getDate();
  if (renewsOnDay >= today) {
    return renewsOnDay - today;
  }
  const year = now.getFullYear();
  const month = now.getMonth();
  const nextMonth = new Date(year, month + 1, renewsOnDay);
  const diffMs = nextMonth.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function daysUntilCommitment(dueDay: number, now: Date): number {
  const today = now.getDate();
  if (dueDay >= today) {
    return dueDay - today;
  }
  return -(today - dueDay);
}

function alertSeverity(days: number): "neutral" | "amber" | "red" {
  if (days <= 1) return "red";
  if (days <= 3) return "amber";
  return "neutral";
}

function dayWord(days: number): string {
  if (days < 0) return `متأخر بـ ${Math.abs(days)} يوم`;
  if (days === 0) return "اليوم";
  if (days === 1) return "غداً";
  return `بعد ${days} يوم`;
}

const SEEN_KEY = "nabiha:seenAlerts";

export function getSeenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function markAlertsSeen(ids: string[]): void {
  try {
    const seen = getSeenIds();
    for (const id of ids) seen.add(id);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* ignore */
  }
}

export function computeUpcomingAlerts(
  subscriptions: Subscription[],
  commitments: Commitment[],
  currency: string,
  now: Date = new Date(),
): AlertItem[] {
  const items: AlertItem[] = [];

  for (const sub of subscriptions) {
    if (sub.renewsOnDay == null) continue;
    const days = daysUntilSubscription(sub.renewsOnDay, now);
    if (days > 14) continue;
    const severity = alertSeverity(days);
    items.push({
      id: `sub-${sub.id}`,
      kind: "subscription",
      name: sub.name,
      amount: Number(sub.amount),
      currency,
      daysUntil: days,
      renewsOnDay: sub.renewsOnDay,
      severity,
      label: `يتجدد اشتراك ${sub.name} ${dayWord(days)}`,
      explanation:
        "الاشتراك الشهري يُخصم تلقائياً من حسابك في هذا اليوم من كل شهر. تأكدي من وجود رصيد كافٍ قبل موعد التجديد.",
    });
  }

  for (const c of commitments) {
    if (c.isPaid) continue;
    const days = daysUntilCommitment(c.dueDay, now);
    if (days > 7 || days < -7) continue;
    const severity = alertSeverity(days);
    items.push({
      id: `com-${c.id}`,
      kind: "commitment",
      name: c.title,
      amount: Number(c.amount),
      currency,
      daysUntil: days,
      dueDay: c.dueDay,
      severity,
      label: days < 0
        ? `${c.title} متأخر بـ ${Math.abs(days)} يوم — لم يُدفع بعد`
        : `موعد ${c.title} ${dayWord(days)}`,
      explanation:
        "هذا التزام شهري ثابت يستحق في هذا اليوم. الدفع في موعده يحمي تصنيفك المالي ويتجنب الغرامات.",
    });
  }

  items.sort((a, b) => a.daysUntil - b.daysUntil);
  return items;
}

export function computeNabihaTips(
  profile: UserProfile | undefined,
  balance: BalanceSummary | undefined,
  summary: DashboardSummary | undefined,
  subscriptions: Subscription[],
  commitments: Commitment[],
  userName?: string,
  now: Date = new Date(),
): NabihaTip[] {
  const tips: NabihaTip[] = [];
  const salary = profile?.monthlySalary ? Number(profile.monthlySalary) : 0;
  const payday = profile?.payday ?? 1;

  if (salary > 0) {
    const daysToPayday = daysUntilSubscription(payday, now);
    const commitmentsThisWeek = commitments
      .filter((c) => !c.isPaid && daysUntilCommitment(c.dueDay, now) <= 7)
      .reduce((s, c) => s + Number(c.amount), 0);

    if (daysToPayday <= 5 && commitmentsThisWeek > 0) {
      tips.push({
        id: "payday-commitments",
        severity: "warning",
        headline: `راتبك ${daysToPayday === 0 ? "اليوم" : daysToPayday === 1 ? "غداً" : `بعد ${daysToPayday} يوم`}`,
        body: `عندك التزامات بقيمة ${commitmentsThisWeek.toLocaleString("ar-EG")} هذا الأسبوع، خذي بالك من الرصيد.`,
        why: "هذه النصيحة تظهر لأن راتبك على وشك الوصول وعندك التزامات في نفس الأسبوع.",
      });
    }

    const soonSub = subscriptions.find(
      (s) => s.renewsOnDay != null && daysUntilSubscription(s.renewsOnDay, now) <= 2,
    );
    if (soonSub) {
      const d = daysUntilSubscription(soonSub.renewsOnDay!, now);
      const when = d === 0 ? "اليوم" : d === 1 ? "غداً" : `بعد ${d} أيام`;
      tips.push({
        id: `sub-soon-${soonSub.id}`,
        severity: "danger",
        headline: `اشتراك ${soonSub.name} يتجدد ${when}`,
        body: "تأكدي من وجود رصيد كافٍ لتجنب انقطاع الخدمة.",
        why: `هذه النصيحة تظهر لأن اشتراك ${soonSub.name} يتجدد خلال يومين أو أقل.`,
      });
    }

    const subsMonthly = balance?.subscriptionsMonthly ?? 0;
    if (subsMonthly > 0) {
      const pct = Math.round((subsMonthly / salary) * 100);
      if (pct >= 15) {
        tips.push({
          id: "subs-pct",
          severity: pct >= 25 ? "danger" : "warning",
          headline: `اشتراكاتك ${pct}% من راتبك`,
          body: `إجمالي اشتراكاتك الشهرية ${subsMonthly.toLocaleString("ar-EG")} — يُنصح ألا تتجاوز 10-15%.`,
          why: "هذه النصيحة تظهر لأن إجمالي اشتراكاتك يمثل نسبة مرتفعة من راتبك الشهري.",
        });
      }
    }

    const spent = summary?.totalThisMonth ?? 0;
    if (spent > 0) {
      const pct = Math.round((spent / salary) * 100);
      if (pct >= 70) {
        tips.push({
          id: "spend-pct",
          severity: pct >= 90 ? "danger" : "warning",
          headline: `صرفت ${pct}% من راتبك هذا الشهر`,
          body: "حاولي تقليل المصاريف الكمالية حتى نهاية الشهر.",
          why: "هذه النصيحة تظهر لأن مصروفاتك تجاوزت 70% من راتبك الشهري.",
        });
      }
    }

    const unpaidCount = summary?.unpaidCommitmentsCount ?? 0;
    if (unpaidCount > 0) {
      const unpaidCommitments = commitments
        .filter((c) => !c.isPaid)
        .sort((a, b) => daysUntilCommitment(a.dueDay, now) - daysUntilCommitment(b.dueDay, now));

      const primary = unpaidCommitments[0];
      const remainingCount = unpaidCommitments.length - 1;

      const headline =
        primary == null
          ? `${unpaidCount} ${unpaidCount === 1 ? "التزام غير مدفوع" : "التزامات غير مدفوعة"}`
          : remainingCount === 0
            ? `التزام '${primary.title}' غير مدفوع`
            : `'${primary.title}' و${remainingCount} ${remainingCount === 1 ? "آخر" : "آخرون"} غير مدفوعة`;

      const body =
        primary == null
          ? "راجع التزاماتك وتأكد من دفع المستحقات لتجنب الغرامات."
          : remainingCount === 0
            ? `التزام ${primary.title} لم يُسدَّد بعد — راجعيه وتأكدي من الدفع لتجنب الغرامات.`
            : `${primary.title} هو الأكثر إلحاحاً — راجع التزاماتك وتأكد من دفع المستحقات لتجنب الغرامات.`;

      const why =
        primary == null
          ? "هذه النصيحة تظهر لأن عندك التزامات شهرية لم تُدفع بعد."
          : remainingCount === 0
            ? `هذه النصيحة تظهر لأن التزام '${primary.title}' لم يُدفع بعد في هذا الشهر.`
            : `هذه النصيحة تظهر لأن التزام '${primary.title}' و${remainingCount} ${remainingCount === 1 ? "آخر" : "آخرون"} لم تُدفع بعد في هذا الشهر.`;

      tips.push({
        id: "unpaid-commitments",
        severity: "warning",
        headline,
        body,
        why,
        navTarget: {
          route: "/app/money?tab=commitments" + (primary != null ? `&highlight=${primary.id}` : ""),
          commitmentId: primary?.id,
        },
      });
    }
  }

  if (tips.length === 0) {
    tips.push({
      id: "all-good",
      severity: "info",
      headline: `أهلاً${userName ? ` ${userName}` : ""}، وضعك المالي ممتاز 🌿`,
      body: "لا توجد تنبيهات عاجلة الآن. استمري على هذا النهج!",
      why: "لا توجد مخاوف مالية تستدعي التنبيه في الوقت الحالي.",
    });
  }

  return tips;
}

export function hasPriorityAlert(alerts: AlertItem[], tips: NabihaTip[]): boolean {
  const seen = getSeenIds();
  const hasImminentAlert = alerts.some(
    (a) => a.daysUntil <= 3,
  );
  const hasUnreadTip = tips.some(
    (t) => (t.severity === "warning" || t.severity === "danger") && !seen.has(t.id),
  );
  return hasImminentAlert || hasUnreadTip;
}

const TIPS_ENABLED_KEY = "nabiha:tipsEnabled";
const TIPS_TOGGLE_EVENT = "nabiha:tips-toggled";

export function getNabihaTipsEnabled(): boolean {
  try {
    const v = localStorage.getItem(TIPS_ENABLED_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

export function setNabihaTipsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(TIPS_ENABLED_KEY, enabled ? "true" : "false");
    window.dispatchEvent(new CustomEvent(TIPS_TOGGLE_EVENT));
  } catch {
    /* ignore */
  }
}

export function useNabihaTipsEnabled(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabledState] = useState<boolean>(() => getNabihaTipsEnabled());

  useEffect(() => {
    function handler() {
      setEnabledState(getNabihaTipsEnabled());
    }
    window.addEventListener(TIPS_TOGGLE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(TIPS_TOGGLE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  function setEnabled(v: boolean) {
    setNabihaTipsEnabled(v);
    setEnabledState(v);
  }

  return [enabled, setEnabled];
}
