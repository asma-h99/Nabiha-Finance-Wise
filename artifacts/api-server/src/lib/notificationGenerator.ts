import {
  db,
  notificationsTable,
  subscriptionsTable,
  commitmentsTable,
  expensesTable,
  userProfilesTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

const COOLDOWN_HOURS = 12;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateString: string): number {
  const d = new Date(dateString + "T00:00:00");
  const today = startOfToday();
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function nextDueDate(dueDay: number): string {
  const today = startOfToday();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDayThisMonth = new Date(year, month + 1, 0).getDate();
  const dueThisMonth = new Date(year, month, Math.min(dueDay, lastDayThisMonth));
  if (dueThisMonth >= today) {
    return dueThisMonth.toISOString().slice(0, 10);
  }
  const lastDayNextMonth = new Date(year, month + 2, 0).getDate();
  return new Date(year, month + 1, Math.min(dueDay, lastDayNextMonth))
    .toISOString()
    .slice(0, 10);
}

interface PendingNotification {
  key: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "danger";
  link?: string;
}

async function emitIfNew(userId: string, n: PendingNotification): Promise<void> {
  const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
  const [existing] = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.title, n.title),
        eq(notificationsTable.message, n.message),
        sql`${notificationsTable.createdAt} > ${cutoff.toISOString()}`,
      ),
    )
    .limit(1);
  if (existing) return;

  await db.insert(notificationsTable).values({
    userId,
    title: n.title,
    message: n.message,
    type: n.type,
    link: n.link ?? null,
  });
}

function frequencyToMonthlyFactor(freq: string): number {
  if (freq === "yearly") return 1 / 12;
  if (freq === "weekly") return 4.333;
  if (freq === "quarterly") return 1 / 3;
  return 1;
}

export async function generateUpcomingNotifications(userId: string): Promise<void> {
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId))
    .limit(1);

  // Subscriptions renewing within 3 days
  const subs = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.userId, userId),
        eq(subscriptionsTable.status, "active"),
      ),
    );

  // Trigger reminders at exactly 3 days, 1 day, and day-of (0)
  const REMINDER_OFFSETS = new Set([3, 1, 0]);

  for (const s of subs) {
    const days = daysUntil(s.nextRenewalDate);
    if (!REMINDER_OFFSETS.has(days)) continue;
    const message =
      days === 0
        ? `يتجدد اليوم — تأكد من توفر الرصيد لاشتراك ${s.name}`
        : `سيتم تجديد ${s.name} خلال ${days} يوم`;
    await emitIfNew(userId, {
      key: `sub-${s.id}-${days}`,
      title: "تجديد اشتراك قادم",
      message,
      type: days === 0 ? "warning" : "info",
      link: "/app/subscriptions",
    });
  }

  // Commitments due at 3d / 1d / day-of
  const commitments = await db
    .select()
    .from(commitmentsTable)
    .where(eq(commitmentsTable.userId, userId));

  for (const c of commitments) {
    const due = nextDueDate(c.dueDay);
    const days = daysUntil(due);
    if (!REMINDER_OFFSETS.has(days)) continue;
    const message =
      days === 0
        ? `موعد دفع ${c.title} اليوم`
        : `موعد دفع ${c.title} بعد ${days} يوم`;
    await emitIfNew(userId, {
      key: `comm-${c.id}-${days}`,
      title: "التزام مستحق قريباً",
      message,
      type: days === 0 ? "warning" : "info",
      link: "/app/commitments",
    });
  }

  // Low balance: monthly leftover after subs + commitments + this-month expenses < 10% of salary
  if (profile && profile.monthlySalary && Number(profile.monthlySalary) > 0) {
    const salary = Number(profile.monthlySalary);
    const monthlySubs = subs.reduce(
      (s, x) => s + Number(x.amount) * frequencyToMonthlyFactor(x.frequency),
      0,
    );
    const monthlyCommitments = commitments.reduce(
      (s, c) => s + Number(c.amount),
      0,
    );

    const monthPrefix = new Date().toISOString().slice(0, 7);
    const [{ total } = { total: 0 }] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${expensesTable.amount}), 0)::float`,
      })
      .from(expensesTable)
      .where(
        and(
          eq(expensesTable.userId, userId),
          sql`${expensesTable.date} LIKE ${monthPrefix + "%"}`,
        ),
      );

    const leftover = salary - monthlySubs - monthlyCommitments - Number(total ?? 0);
    if (leftover < salary * 0.1) {
      await emitIfNew(userId, {
        key: `low-balance-${monthPrefix}`,
        title: "تنبيه: الرصيد المتبقي منخفض",
        message:
          leftover < 0
            ? "تجاوزت دخلك هذا الشهر — راجع مصاريفك واشتراكاتك"
            : "اقترب رصيدك المتاح من النفاد لهذا الشهر",
        type: leftover < 0 ? "danger" : "warning",
        link: "/app",
      });
    }
  }
}
