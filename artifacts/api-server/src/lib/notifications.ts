import { db, commitmentsTable, sentRemindersTable, userProfileTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { sendReminderEmail } from "./email";
import { logger } from "./logger";

const REMINDER_DAYS_AHEAD = 2;
let runInFlight = false;

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function ymd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatArabicDate(date: Date): string {
  // e.g. "2026-04-30" → "30 / 04 / 2026"
  return `${pad(date.getDate())} / ${pad(date.getMonth() + 1)} / ${date.getFullYear()}`;
}

/**
 * Compute the next due date for a commitment given its day-of-month, starting
 * from `from`. If today's day already passed dueDay this month, returns next
 * month's same day (clamped to month length).
 */
function nextDueDateFor(dueDay: number, from: Date): Date {
  const candidate = new Date(from.getFullYear(), from.getMonth(), 1);
  const lastDayThisMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
  const dayThisMonth = Math.min(dueDay, lastDayThisMonth);

  if (from.getDate() <= dayThisMonth) {
    candidate.setDate(dayThisMonth);
  } else {
    candidate.setMonth(candidate.getMonth() + 1);
    const lastDayNextMonth = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
    candidate.setDate(Math.min(dueDay, lastDayNextMonth));
  }
  return candidate;
}

export async function runReminderCheck(opts?: { manageLinkBase?: string }): Promise<{
  sent: number;
  skipped: number;
  message: string;
}> {
  if (runInFlight) {
    return { sent: 0, skipped: 0, message: "تشغيل آخر قيد التنفيذ" };
  }
  runInFlight = true;
  try {
    const profile = (await db.select().from(userProfileTable).limit(1))[0];
    if (!profile) {
      return { sent: 0, skipped: 0, message: "لا يوجد ملف مستخدم" };
    }
    if (!profile.emailNotificationsEnabled) {
      return { sent: 0, skipped: 0, message: "التنبيهات غير مفعّلة" };
    }
    if (!profile.notificationEmail) {
      return { sent: 0, skipped: 0, message: "لا يوجد بريد إلكتروني للتنبيهات" };
    }

    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + REMINDER_DAYS_AHEAD);
    const targetKey = ymd(targetDate);

    const allCommitments = await db.select().from(commitmentsTable);

    let sent = 0;
    let skipped = 0;

    for (const c of allCommitments) {
      // Defensive: dueDay should be 1-31. Skip out-of-range values rather than miscompute.
      if (!Number.isInteger(c.dueDay) || c.dueDay < 1 || c.dueDay > 31) {
        skipped++;
        continue;
      }

      const due = nextDueDateFor(c.dueDay, now);
      if (ymd(due) !== targetKey) {
        continue;
      }
      const dueKey = ymd(due);

      // Reserve the row first via unique index. If another worker beats us, we skip.
      const reserved = await db
        .insert(sentRemindersTable)
        .values({ commitmentId: c.id, dueDateKey: dueKey })
        .onConflictDoNothing()
        .returning({ id: sentRemindersTable.id });
      if (reserved.length === 0) {
        skipped++;
        continue;
      }

      try {
        await sendReminderEmail({
          to: profile.notificationEmail,
          userName: profile.userName,
          commitmentTitle: c.title,
          amount: Number(c.amount),
          currency: profile.currency,
          dueDateLabel: formatArabicDate(due),
          manageLink: opts?.manageLinkBase
            ? `${opts.manageLinkBase}/app/commitments`
            : "/app/commitments",
        });
        sent++;
      } catch (err) {
        // Roll back the reservation so a later run can retry.
        logger.error({ err, commitmentId: c.id }, "Reminder send failed; releasing reservation");
        await db
          .delete(sentRemindersTable)
          .where(
            and(
              eq(sentRemindersTable.commitmentId, c.id),
              eq(sentRemindersTable.dueDateKey, dueKey),
            ),
          );
        skipped++;
      }
    }

    return {
      sent,
      skipped,
      message: sent > 0 ? `تم إرسال ${sent} تذكير` : "لا يوجد التزامات تستحق التذكير اليوم",
    };
  } finally {
    runInFlight = false;
  }
}

let intervalHandle: NodeJS.Timeout | null = null;

export function startReminderScheduler(): void {
  if (intervalHandle) return;
  // Run once shortly after start
  setTimeout(() => {
    runReminderCheck()
      .then((r) => logger.info(r, "Reminder scheduler initial run"))
      .catch((err) => logger.error({ err }, "Reminder scheduler initial run failed"));
  }, 30_000);
  // Then every hour
  intervalHandle = setInterval(() => {
    runReminderCheck()
      .then((r) => logger.info(r, "Reminder scheduler hourly run"))
      .catch((err) => logger.error({ err }, "Reminder scheduler hourly run failed"));
  }, 60 * 60 * 1000);
}
