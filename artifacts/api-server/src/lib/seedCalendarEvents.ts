import { db, calendarEventsTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";
import { logger } from "./logger";
import { DEMO_SEED_USER_ID } from "../routes/calendar-events";

function currentYearDate(month: number, day: number): string {
  const year = new Date().getFullYear();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDemoEvents() {
  return [
    {
      title: "عيد الفطر",
      date: currentYearDate(4, 1),
      type: "religious" as const,
      amount: null,
      currency: "JOD",
      recurring: "yearly" as const,
      priority: "high" as const,
      isPaid: false,
      notes: "مصاريف العيد وهدايا الأطفال",
    },
    {
      title: "عيد الأضحى",
      date: currentYearDate(6, 8),
      type: "religious" as const,
      amount: null,
      currency: "JOD",
      recurring: "yearly" as const,
      priority: "high" as const,
      isPaid: false,
      notes: "الأضحية والمصاريف المرتبطة",
    },
    {
      title: "رسوم مدرسية",
      date: currentYearDate(9, 1),
      type: "education" as const,
      amount: "350",
      currency: "JOD",
      recurring: "yearly" as const,
      priority: "high" as const,
      isPaid: false,
      notes: "رسوم الفصل الدراسي الأول",
    },
    {
      title: "فحص طبي دوري",
      date: currentYearDate(4, 15),
      type: "health" as const,
      amount: "45",
      currency: "JOD",
      recurring: "yearly" as const,
      priority: "normal" as const,
      isPaid: false,
      notes: null,
    },
  ];
}

export async function seedCalendarEventsIfEmpty() {
  try {
    const [{ value }] = await db
      .select({ value: count() })
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.userId, DEMO_SEED_USER_ID));

    if (value > 0) return;

    const events = getDemoEvents();
    await db.insert(calendarEventsTable).values(
      events.map((ev) => ({
        userId: DEMO_SEED_USER_ID,
        title: ev.title,
        date: ev.date,
        type: ev.type,
        amount: ev.amount,
        currency: ev.currency,
        recurring: ev.recurring,
        priority: ev.priority,
        isPaid: ev.isPaid,
        notes: ev.notes,
        categoryId: null,
      })),
    );

    logger.info(
      { count: events.length, year: new Date().getFullYear(), userId: DEMO_SEED_USER_ID },
      "Seeded demo calendar events",
    );
  } catch (err) {
    logger.warn({ err }, "Failed to seed calendar events — skipping");
  }
}
