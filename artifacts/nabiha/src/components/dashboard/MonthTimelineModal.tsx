import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  CommitmentFormFields,
  commitmentFormSchema,
  commitmentFormDefaultValues,
  type CommitmentFormValues,
} from "@/components/dashboard/CommitmentFormFields";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useListCommitments,
  useUpdateCommitment,
  useDeleteCommitment,
  useListSubscriptions,
  useListCalendarEvents,
  getListCalendarEventsQueryKey,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  useListExpenses,
  useGetUserProfile,
  type Commitment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateCommitmentsEverywhere } from "@/lib/queryInvalidation";
import { useUser } from "@clerk/react";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { EventFormDialog } from "./EventFormDialog";
import type { CalendarEvent } from "@workspace/api-client-react";

import {
  Plus,
  Home,
  Zap,
  Droplets,
  Wifi,
  Phone,
  Car,
  Landmark,
  Shield,
  GraduationCap,
  Heart,
  Dumbbell,
  CircleDollarSign,
  Tv,
  Music,
  Star,
  AlertTriangle,
  Edit2,
  Trash2,
  Bell,
  Info,
  Cake,
  type LucideIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const DEMO_SEED_USER_ID = "nabiha_demo_seed";

const MONTHS_AR = [
  "يناير", "فبراير", "مارس",
  "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر",
  "أكتوبر", "نوفمبر", "ديسمبر",
];

type EventStatus = "paid" | "overdue" | "upcoming" | "today" | "safe" | "readonly";

interface IconSpec {
  Icon: LucideIcon | null;
  emoji?: string;
  bg: string;
  text: string;
}

interface TimelineItem {
  id: string;
  source: "commitment" | "subscription" | "calendar" | "expense";
  day: number;
  date: Date;
  title: string;
  notes?: string | null;
  amount: number | null;
  currency: string;
  categoryLabel?: string;
  status: EventStatus;
  isPaid?: boolean;
  isSpecialOccasion: boolean;
  canEdit: boolean;
  canMarkPaid: boolean;
  iconSpec: IconSpec;
  rawId?: number;
  calendarEvent?: CalendarEvent;
  commitment?: Commitment;
}

const COLOR_GREEN = { bg: "bg-emerald-100", text: "text-emerald-700" };
const COLOR_ORANGE = { bg: "bg-orange-100", text: "text-orange-700" };
const COLOR_RED = { bg: "bg-red-100", text: "text-red-700" };
const COLOR_PINK = { bg: "bg-pink-100", text: "text-pink-700" };
const COLOR_INDIGO = { bg: "bg-indigo-100", text: "text-indigo-700" };
const COLOR_GRAY = { bg: "bg-gray-100", text: "text-gray-700" };

function getBrandColor(name: string): { bg: string; text: string } | null {
  const n = name.toLowerCase();
  if (/netflix/i.test(n)) return COLOR_RED;
  if (/spotify/i.test(n)) return { bg: "bg-green-100", text: "text-green-700" };
  if (/shahid|شاهد/i.test(n)) return { bg: "bg-sky-100", text: "text-sky-700" };
  if (/apple|أبل/i.test(n)) return { bg: "bg-gray-100", text: "text-gray-700" };
  if (/amazon|أمازون/i.test(n)) return { bg: "bg-amber-100", text: "text-amber-700" };
  if (/youtube|يوتيوب/i.test(n)) return { bg: "bg-red-100", text: "text-red-600" };
  if (/disney|ديزني/i.test(n)) return { bg: "bg-blue-100", text: "text-blue-700" };
  if (/stc|اتصالات|mobily|زين|موبايلي/i.test(n)) return { bg: "bg-teal-100", text: "text-teal-700" };
  return null;
}

function isLoanTitle(title: string): boolean {
  return /قرض|loan|بنك|bank|تمويل|أقساط|قسط|دين/i.test(title);
}

function getCommitmentIcon(title: string): LucideIcon {
  if (/إيجار|rent|منزل|بيت|شقة/i.test(title)) return Home;
  if (/كهرب|electric|ضوء/i.test(title)) return Zap;
  if (/ماء|water|مياه/i.test(title)) return Droplets;
  if (/انترنت|internet|wifi|نت|شبكة/i.test(title)) return Wifi;
  if (/هاتف|phone|جوال|موبايل|اتصال/i.test(title)) return Phone;
  if (/سيارة|car|مواصلات|بنزين|وقود/i.test(title)) return Car;
  if (/قرض|loan|بنك|bank|تمويل|أقساط/i.test(title)) return Landmark;
  if (/تأمين|insurance/i.test(title)) return Shield;
  if (/مدرسة|school|تعليم|جامعة|رسوم/i.test(title)) return GraduationCap;
  if (/صحة|health|طب|doctor|مستشفى/i.test(title)) return Heart;
  if (/نادي|gym|رياضة|fitness/i.test(title)) return Dumbbell;
  return CircleDollarSign;
}

function getCommitmentSpec(title: string): IconSpec {
  const Icon = getCommitmentIcon(title);
  const color = isLoanTitle(title) ? COLOR_ORANGE : COLOR_GREEN;
  return { Icon, ...color };
}

function getSubscriptionSpec(name: string, isYearly: boolean): IconSpec {
  const brand = getBrandColor(name);
  const color = brand ?? COLOR_GREEN;
  return { Icon: isYearly ? Music : Tv, ...color };
}

function getCalendarEventSpec(type: string, title: string): IconSpec {
  switch (type) {
    case "religious":
      return { Icon: Star, ...COLOR_RED };
    case "personal":
      // Birthdays / social occasions → green w/ cake
      if (/عيد ميلاد|birthday|ميلاد/i.test(title)) {
        return { Icon: Cake, ...COLOR_GREEN };
      }
      return { Icon: Star, ...COLOR_PINK };
    case "education":
      return { Icon: GraduationCap, ...COLOR_INDIGO };
    case "health":
      return { Icon: Heart, ...COLOR_RED };
    case "bill":
      return { Icon: getCommitmentIcon(title), ...COLOR_GREEN };
    case "subscription":
      return getSubscriptionSpec(title, false);
    case "loan":
      return { Icon: Landmark, ...COLOR_ORANGE };
    default:
      return { Icon: CircleDollarSign, ...COLOR_GRAY };
  }
}

function getCategoryLabel(type: string): string {
  switch (type) {
    case "bill": return "فاتورة";
    case "subscription": return "اشتراك";
    case "loan": return "قسط";
    case "religious": return "مناسبة دينية";
    case "personal": return "مناسبة شخصية";
    case "education": return "تعليم";
    case "health": return "صحة";
    default: return "مناسبة";
  }
}

function isReligiousOccasion(type: string | null | undefined): boolean {
  return type === "religious";
}

function relativeArabic(daysFromNow: number): string {
  if (daysFromNow <= 0) return "اليوم";
  if (daysFromNow === 1) return "غداً";
  if (daysFromNow === 2) return "بعد يومين";
  if (daysFromNow <= 10) return `بعد ${daysFromNow} أيام`;
  return `بعد ${daysFromNow} يوماً`;
}

interface MonthTimelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: number;
  year: number;
}

export function MonthTimelineModal({ open, onOpenChange, month, year }: MonthTimelineModalProps) {
  const { user } = useUser();
  const currentUserId = user?.id ?? null;
  const { data: commitments } = useListCommitments();
  const { data: subscriptions } = useListSubscriptions();
  const { data: profile } = useGetUserProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fromDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const toDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const { data: calendarEvents } = useListCalendarEvents({ from: fromDate, to: toDate });
  const { data: expenses } = useListExpenses({ month: monthStr });

  const updateCommitment = useUpdateCommitment({
    mutation: {
      onSuccess: () => {
        invalidateCommitmentsEverywhere(queryClient);
      },
    },
  });

  const updateCalendarEvent = useUpdateCalendarEvent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCalendarEventsQueryKey() });
      },
    },
  });

  const deleteCalendarEvent = useDeleteCalendarEvent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCalendarEventsQueryKey() });
      },
    },
  });

  const deleteCommitment = useDeleteCommitment({
    mutation: {
      onSuccess: () => {
        invalidateCommitmentsEverywhere(queryClient);
      },
    },
  });

  const { format, baseCurrency } = useDisplayCurrency();
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<CalendarEvent | null>(null);
  const [editCommitment, setEditCommitment] = useState<Commitment | null>(null);
  const [deleteConfirmCommitment, setDeleteConfirmCommitment] = useState<Commitment | null>(null);

  const editCommitmentForm = useForm<CommitmentFormValues>({
    resolver: zodResolver(commitmentFormSchema),
    defaultValues: commitmentFormDefaultValues,
  });

  useEffect(() => {
    if (editCommitment) {
      editCommitmentForm.reset({
        title: editCommitment.title,
        amount: Number(editCommitment.amount),
        dueDay: editCommitment.dueDay,
        notes: editCommitment.notes ?? "",
        endDate: editCommitment.endDate ?? "",
      });
    }
  }, [editCommitment, editCommitmentForm]);

  const submitCommitmentEdit = (values: CommitmentFormValues) => {
    if (!editCommitment) return;
    updateCommitment.mutate(
      {
        id: editCommitment.id,
        data: {
          ...values,
          endDate:
            values.endDate && values.endDate.length > 0 ? values.endDate : null,
          notes:
            values.notes && values.notes.length > 0 ? values.notes : null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "تم تعديل الالتزام بنجاح" });
          setEditCommitment(null);
        },
        onError: () => {
          toast({ title: "فشل تعديل الالتزام", variant: "destructive" });
        },
      },
    );
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const todayDay = isCurrentMonth ? today.getDate() : null;
  const isPastMonth =
    year < today.getFullYear() ||
    (year === today.getFullYear() && month < today.getMonth());

  function getStatus(day: number, isPaid: boolean): EventStatus {
    if (isPaid) return "paid";
    if (todayDay === null) return "safe";
    if (day < todayDay) return "overdue";
    if (day === todayDay) return "today";
    if (day - todayDay <= 3) return "upcoming";
    return "safe";
  }

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    (commitments ?? []).forEach((c) => {
      const day = Math.min(c.dueDay, lastDay);
      const date = new Date(year, month, day);
      if (c.endDate) {
        const end = new Date(c.endDate);
        if (!Number.isNaN(end.getTime()) && date.getTime() > end.getTime()) {
          return;
        }
      }
      items.push({
        id: `commitment-${c.id}`,
        source: "commitment",
        day,
        date,
        title: c.title,
        notes: c.notes,
        amount: Number(c.amount),
        currency: baseCurrency,
        categoryLabel: isLoanTitle(c.title) ? "قسط" : "التزام",
        status: getStatus(day, isCurrentMonth ? c.isPaid : false),
        isPaid: isCurrentMonth ? c.isPaid : false,
        isSpecialOccasion: false,
        canEdit: true,
        canMarkPaid: isCurrentMonth,
        iconSpec: getCommitmentSpec(c.title),
        rawId: c.id,
        commitment: c,
      });
    });

    (subscriptions ?? []).forEach((s) => {
      const day = Math.min(s.renewsOnDay ?? 1, lastDay);
      const date = new Date(year, month, day);
      const monthlyAmt = s.billingCycle === "yearly" ? Number(s.amount) / 12 : Number(s.amount);
      items.push({
        id: `subscription-${s.id}`,
        source: "subscription",
        day,
        date,
        title: s.name,
        notes: s.notes,
        amount: monthlyAmt,
        currency: baseCurrency,
        categoryLabel: "اشتراك",
        status: getStatus(day, false),
        isPaid: false,
        isSpecialOccasion: false,
        canEdit: false,
        canMarkPaid: false,
        iconSpec: getSubscriptionSpec(s.name, s.billingCycle === "yearly"),
        rawId: s.id,
      });
    });

    (calendarEvents ?? []).forEach((ev) => {
      const dateStr = String(ev.date).slice(0, 10);
      const parts = dateStr.split("-");
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      const iconSpec = getCalendarEventSpec(ev.type ?? "other", ev.title);
      const isOwned = currentUserId !== null && ev.userId === currentUserId;
      const isDemo = ev.userId === DEMO_SEED_USER_ID;
      const hasAmount = ev.amount !== undefined && ev.amount !== null;
      items.push({
        id: `calendar-${ev.id}`,
        source: "calendar",
        day,
        date,
        title: ev.title,
        notes: ev.notes,
        amount: hasAmount ? Number(ev.amount) : null,
        currency: ev.currency,
        categoryLabel: getCategoryLabel(ev.type ?? "other") + (isDemo ? " ✦" : ""),
        status: hasAmount
          ? getStatus(day, ev.isPaid)
          : (day < (todayDay ?? Infinity) ? "paid" : "safe"),
        isPaid: ev.isPaid,
        isSpecialOccasion: isReligiousOccasion(ev.type),
        canEdit: isOwned,
        canMarkPaid: isOwned && hasAmount,
        iconSpec,
        rawId: ev.id,
        calendarEvent: ev,
      });
    });

    (expenses ?? []).forEach((ex) => {
      const dateStr = String(ex.date).slice(0, 10);
      const parts = dateStr.split("-");
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      items.push({
        id: `expense-${ex.id}`,
        source: "expense",
        day,
        date,
        title: ex.title,
        notes: ex.notes,
        amount: Number(ex.amount),
        currency: baseCurrency,
        categoryLabel: "مصروف",
        status: "readonly",
        isPaid: true,
        isSpecialOccasion: false,
        canEdit: false,
        canMarkPaid: false,
        iconSpec: { Icon: CircleDollarSign, ...COLOR_GRAY },
        rawId: ex.id,
      });
    });

    return items.sort((a, b) => a.day - b.day || a.title.localeCompare(b.title));
  }, [commitments, subscriptions, calendarEvents, expenses, baseCurrency, month, year, isCurrentMonth, todayDay, lastDay, currentUserId]);

  const totalFinancial = useMemo(
    () => timelineItems
      .filter((i) => i.amount !== null && i.source !== "expense")
      .reduce((s, i) => s + (i.amount ?? 0), 0),
    [timelineItems],
  );

  const eventCount = timelineItems.length;

  // Upcoming = unpaid events in this month that haven't already passed
  // (current month: from today onwards; future month: all events; past month: none)
  const upcomingItems = useMemo(() => {
    if (isPastMonth) return [] as TimelineItem[];
    return timelineItems
      .filter((i) => {
        if (i.source === "expense" || i.isPaid) return false;
        if (isCurrentMonth) return i.day >= (todayDay ?? 1);
        return true; // future month: all unpaid events count as upcoming
      })
      .sort((a, b) => a.day - b.day);
  }, [timelineItems, todayDay, isPastMonth, isCurrentMonth]);

  const upcomingCount = upcomingItems.length;
  const nextUpcoming = upcomingItems[0];
  // Real day-difference between today and the event's date (works for current
  // and future months alike). For past months we never read this value.
  const nextUpcomingDays = nextUpcoming
    ? Math.max(
        0,
        Math.round(
          (nextUpcoming.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : null;
  const nextUpcomingLabel = nextUpcomingDays !== null ? relativeArabic(nextUpcomingDays) : null;

  const salary = Number(profile?.monthlySalary ?? 0);
  const committed = totalFinancial;
  const capacityPct = salary > 0 ? Math.min(100, Math.round((committed / salary) * 100)) : 0;
  const safetyPct = salary > 0 ? Math.max(0, 100 - capacityPct) : 100;
  const safetyLabel =
    safetyPct >= 60 ? "آمن" : safetyPct >= 30 ? "حذر" : "مرتفع الخطورة";
  const safetyLabelColor =
    safetyPct >= 60 ? "text-emerald-700" : safetyPct >= 30 ? "text-amber-700" : "text-red-700";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          dir="rtl"
          className="w-full sm:w-[85vw] max-w-none sm:max-w-[1100px] max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0"
        >
          {/* === HEADER === */}
          <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 shrink-0 border-b border-border/40 space-y-0">
            <div className="flex items-center justify-between gap-3 pl-9">
              {/* In RTL, first child renders on the right (trailing edge of viewport, "trailing side" per spec) */}
              <DialogTitle className="text-base sm:text-lg font-extrabold text-foreground text-right">
                {MONTHS_AR[month]} {year}
                <span className="text-muted-foreground font-bold"> - التزاماتك المالية</span>
              </DialogTitle>
              {/* Add button on the leading (visually left) side */}
              <Button
                size="sm"
                className="rounded-xl gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shrink-0"
                onClick={() => { setEditEvent(null); setFormOpen(true); }}
                data-testid="button-add-event"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة حدث
              </Button>
            </div>
          </DialogHeader>

          {/* === SUMMARY AREA ===
              On wide screens the three summary cards sit on the leading edge
              (visually right in RTL) and the borrowing-safety gauge sits on the
              trailing edge (visually left in RTL), matching the mockup that
              places the gauge to the side of the cards. On narrow screens
              everything stacks. */}
          <div
            className={`px-5 sm:px-6 pt-4 pb-4 shrink-0 bg-muted/20 border-b border-border/40 ${salary > 0 ? "grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)] lg:items-stretch" : "space-y-3"}`}
          >
            {/* Three summary cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* 1. Total payments */}
              <div
                className="rounded-2xl p-3 bg-card border border-border/60 shadow-sm flex flex-col items-center justify-center text-center gap-1"
                data-testid="card-summary-total"
              >
                <div className="text-[10px] sm:text-xs text-muted-foreground font-bold">إجمالي المدفوعات</div>
                <div className="text-base sm:text-lg font-extrabold text-foreground tabular-nums leading-tight">
                  {format(totalFinancial, baseCurrency)}
                </div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">دفع</div>
              </div>

              {/* 2. Event count */}
              <div
                className="rounded-2xl p-3 bg-card border border-border/60 shadow-sm flex flex-col items-center justify-center text-center gap-1"
                data-testid="card-summary-events"
              >
                <div className="text-[10px] sm:text-xs text-muted-foreground font-bold">عدد المناسبات</div>
                <div className="text-base sm:text-lg font-extrabold text-foreground tabular-nums leading-tight">
                  {eventCount}
                </div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">مناسبة</div>
              </div>

              {/* 3. Upcoming alerts */}
              <div
                className="rounded-2xl p-3 bg-card border border-border/60 shadow-sm flex flex-col items-center justify-center text-center gap-1"
                data-testid="card-summary-alerts"
              >
                <div className="text-[10px] sm:text-xs text-muted-foreground font-bold flex items-center justify-center gap-1">
                  <Bell className="w-3 h-3 text-amber-500" />
                  تنبيهات قادمة
                </div>
                <div className="text-base sm:text-lg font-extrabold text-foreground tabular-nums leading-tight">
                  {upcomingCount}
                </div>
                {nextUpcomingLabel ? (
                  <Badge
                    className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 h-5 px-2 text-[10px] font-bold gap-0.5"
                    variant="outline"
                    data-testid="badge-next-upcoming"
                  >
                    {nextUpcomingLabel}
                  </Badge>
                ) : (
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">لا تنبيهات</div>
                )}
              </div>
            </div>

            {/* Borrowing safety gauge */}
            {salary > 0 && (
              <div
                className="rounded-2xl p-3 sm:p-4 bg-card border border-border/60 shadow-sm"
                data-testid="card-borrowing-safety"
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs sm:text-sm font-extrabold text-foreground truncate">
                      مؤشر الأمان المالي
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">
                      / محاكي الاقتراض
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          aria-label="معلومات عن مؤشر الأمان المالي"
                          data-testid="button-safety-info"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent dir="rtl" side="bottom" className="max-w-xs text-[11px] leading-relaxed">
                        يحسب هذا المؤشر مدى قدرتك على تحمّل دين إضافي بناءً على دخلك الشهري والتزاماتك الحالية. كلما كانت التزاماتك أقل من دخلك، زادت مساحة الأمان وقدرتك على الاقتراض بأمان.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className={`text-xs sm:text-sm font-extrabold tabular-nums ${safetyLabelColor} shrink-0`}>
                    {safetyPct}% — {safetyLabel}
                  </div>
                </div>

                {/* Gauge bar (rendered LTR so the gradient direction is consistent) */}
                <div dir="ltr" className="relative">
                  <div className="h-3 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-orange-400 to-emerald-500 shadow-inner" />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-6 bg-white border-2 border-foreground rounded-sm shadow-md transition-all duration-500"
                    style={{ left: `${safetyPct}%` }}
                    aria-label={`موقع المؤشر عند ${safetyPct} بالمئة`}
                  />
                </div>
                <div dir="ltr" className="flex justify-between mt-1.5 text-[9px] sm:text-[10px] text-muted-foreground font-medium tabular-nums">
                  <span>0% خطر</span>
                  <span>50%</span>
                  <span>100% آمن</span>
                </div>

                <div className="flex items-center justify-between mt-2 text-[10px] sm:text-[11px] text-muted-foreground">
                  <span>الالتزامات: <span className="font-bold text-foreground tabular-nums">{format(committed, baseCurrency)}</span></span>
                  <span>الراتب: <span className="font-bold text-foreground tabular-nums">{format(salary, baseCurrency)}</span></span>
                </div>
              </div>
            )}
          </div>

          {/* === TIMELINE === */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4" dir="rtl">
            {timelineItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground text-sm gap-3 text-center">
                <CircleDollarSign className="w-10 h-10 opacity-20" />
                <p>لا توجد أحداث في هذا الشهر</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => { setEditEvent(null); setFormOpen(true); }}
                >
                  إضافة حدث
                </Button>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical green spine — sits at the position of the icon column.
                    In RTL, the icon sits visually in the middle of the row; we place
                    the spine through the icon center. The icon column is 40px wide,
                    so the line sits at right-[60px] relative to the row container. */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-300 rounded-full pointer-events-none"
                  style={{ right: "calc(2.5rem + 1.25rem)" }}
                  aria-hidden
                />

                <div className="space-y-2.5">
                  {timelineItems.map((item, i) => {
                    const { Icon, emoji, bg, text } = item.iconSpec;
                    const animStyle = { animationDelay: `${i * 35}ms` };
                    const special = item.isSpecialOccasion;

                    const baseRowClasses = special
                      ? "bg-yellow-50 border-yellow-300"
                      : "bg-card border-border/60 hover:border-emerald-300/60";

                    return (
                      <div
                        key={item.id}
                        className={`relative flex items-stretch gap-3 p-3 sm:p-3.5 rounded-2xl border shadow-sm transition-all animate-in fade-in slide-in-from-bottom-1 duration-300 ${baseRowClasses}`}
                        style={animStyle}
                        data-testid={`timeline-row-${item.id}`}
                      >
                        {/* Date column (right / leading edge in RTL) */}
                        <div className="shrink-0 w-10 flex flex-col items-center justify-center text-center">
                          <div className="text-lg sm:text-xl font-extrabold text-foreground leading-none tabular-nums">
                            {item.day}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-muted-foreground font-bold mt-0.5">
                            {MONTHS_AR[month]}
                          </div>
                        </div>

                        {/* Colored circular icon (sits over the spine) */}
                        <div
                          className={`relative shrink-0 w-10 h-10 rounded-full flex items-center justify-center self-center ring-4 ring-white shadow-sm ${bg} ${text}`}
                        >
                          {emoji ? (
                            <span className="text-base">{emoji}</span>
                          ) : Icon ? (
                            <Icon className="w-4 h-4" />
                          ) : (
                            <CircleDollarSign className="w-4 h-4" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-sm text-foreground truncate">{item.title}</span>
                            {special && (
                              <Badge
                                variant="outline"
                                className="border-yellow-400 bg-yellow-100 text-yellow-800 gap-1 h-5 px-1.5 text-[10px] font-bold"
                                data-testid="badge-special-occasion"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                مناسبة خاصة
                              </Badge>
                            )}
                            {item.isPaid && !special && (
                              <Badge
                                variant="outline"
                                className="border-emerald-300 bg-emerald-50 text-emerald-700 h-5 px-1.5 text-[10px] font-bold"
                              >
                                مدفوع
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                            {item.categoryLabel}
                            {item.notes ? ` · ${item.notes}` : ""}
                          </div>
                          {special && (
                            <div className="text-[10px] sm:text-[11px] text-yellow-800 font-bold mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              توقع مصاريف إضافية
                            </div>
                          )}
                        </div>

                        {/* Amount + Actions (left / trailing edge in RTL) */}
                        <div className="shrink-0 flex flex-col items-end justify-center gap-1.5">
                          {item.amount !== null && (
                            <div
                              className="text-sm sm:text-base font-extrabold text-foreground tabular-nums whitespace-nowrap"
                              dir="ltr"
                            >
                              {format(item.amount, item.currency)}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            {item.canMarkPaid && item.source === "commitment" && (
                              <Button
                                size="sm"
                                variant={item.isPaid ? "outline" : "default"}
                                className={`rounded-lg h-7 text-[11px] px-2 ${item.isPaid ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                                disabled={updateCommitment.isPending}
                                onClick={async () => {
                                  try {
                                    await updateCommitment.mutateAsync({ id: item.rawId!, data: { isPaid: !item.isPaid } });
                                    toast({ title: item.isPaid ? "تم إلغاء الدفع" : "تم تسجيل الدفع" });
                                  } catch {
                                    toast({ title: "فشل تحديث حالة الدفع", variant: "destructive" });
                                  }
                                }}
                                data-testid={`button-toggle-paid-${item.id}`}
                              >
                                {item.isPaid ? "إلغاء الدفع" : "دفع"}
                              </Button>
                            )}
                            {item.canMarkPaid && item.source === "calendar" && (
                              <Button
                                size="sm"
                                variant={item.isPaid ? "outline" : "default"}
                                className={`rounded-lg h-7 text-[11px] px-2 ${item.isPaid ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                                disabled={updateCalendarEvent.isPending}
                                onClick={async () => {
                                  try {
                                    await updateCalendarEvent.mutateAsync({ id: item.rawId!, data: { isPaid: !item.isPaid } });
                                    toast({ title: item.isPaid ? "تم إلغاء الدفع" : "تم تسجيل الدفع" });
                                  } catch {
                                    toast({ title: "فشل تحديث حالة الدفع", variant: "destructive" });
                                  }
                                }}
                                data-testid={`button-toggle-paid-${item.id}`}
                              >
                                {item.isPaid ? "إلغاء الدفع" : "دفع"}
                              </Button>
                            )}
                            {item.canEdit && item.calendarEvent && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => { setEditEvent(item.calendarEvent!); setFormOpen(true); }}
                                  aria-label="تعديل"
                                  data-testid={`button-edit-${item.id}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  disabled={deleteCalendarEvent.isPending}
                                  onClick={() => setDeleteConfirmEvent(item.calendarEvent!)}
                                  aria-label="حذف"
                                  data-testid={`button-delete-${item.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                            {item.canEdit && item.commitment && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => setEditCommitment(item.commitment!)}
                                  aria-label="تعديل الالتزام"
                                  data-testid={`button-edit-${item.id}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  disabled={deleteCommitment.isPending}
                                  onClick={() => setDeleteConfirmCommitment(item.commitment!)}
                                  aria-label="حذف الالتزام"
                                  data-testid={`button-delete-${item.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editEvent={editEvent}
        defaultDate={fromDate}
      />

      <AlertDialog open={!!deleteConfirmEvent} onOpenChange={(o) => { if (!o) setDeleteConfirmEvent(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحدث؟</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deleteConfirmEvent?.title}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCalendarEvent.isPending}
              onClick={async () => {
                if (!deleteConfirmEvent) return;
                await deleteCalendarEvent.mutateAsync({ id: deleteConfirmEvent.id });
                toast({ title: "تم حذف الحدث" });
                setDeleteConfirmEvent(null);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!editCommitment}
        onOpenChange={(o) => {
          if (!o) setEditCommitment(null);
        }}
      >
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل الالتزام</DialogTitle>
            <DialogDescription>
              عدّل تفاصيل الالتزام، وأضف تاريخ انتهاء عند الحاجة.
            </DialogDescription>
          </DialogHeader>
          <Form {...editCommitmentForm}>
            <form
              onSubmit={editCommitmentForm.handleSubmit(submitCommitmentEdit)}
              className="space-y-4"
            >
              <CommitmentFormFields
                control={editCommitmentForm.control}
                baseCurrency={baseCurrency}
              />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditCommitment(null)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={updateCommitment.isPending}
                >
                  حفظ التعديلات
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteConfirmCommitment}
        onOpenChange={(o) => {
          if (!o) setDeleteConfirmCommitment(null);
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الالتزام؟</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deleteConfirmCommitment?.title}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCommitment.isPending}
              onClick={async () => {
                if (!deleteConfirmCommitment) return;
                try {
                  await deleteCommitment.mutateAsync({ id: deleteConfirmCommitment.id });
                  toast({ title: "تم حذف الالتزام" });
                } catch {
                  toast({ title: "فشل حذف الالتزام", variant: "destructive" });
                }
                setDeleteConfirmCommitment(null);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
