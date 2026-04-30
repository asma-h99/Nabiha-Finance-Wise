import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, calendarEventsTable } from "@workspace/db";
import {
  ListCalendarEventsQueryParams,
  CreateCalendarEventBody,
  UpdateCalendarEventBody,
  GetCalendarEventParams,
  UpdateCalendarEventParams,
  DeleteCalendarEventParams,
} from "@workspace/api-zod";
import { eq, and, gte, lte, sql, or } from "drizzle-orm";

/**
 * Sentinel userId used for shared demo/seed events inserted at startup.
 * These events are visible to all authenticated users (read-only) but cannot
 * be mutated — PUT/DELETE strictly require the calling user's own userId.
 */
export const DEMO_SEED_USER_ID = "nabiha_demo_seed";

const router = Router();

function serializeEvent(row: typeof calendarEventsTable.$inferSelect) {
  return {
    ...row,
    amount: row.amount !== null ? Number(row.amount) : null,
  };
}

function getAuthUserId(req: Parameters<typeof getAuth>[0]): string | null {
  try {
    return getAuth(req).userId ?? null;
  } catch {
    return null;
  }
}

function requireAuth(req: Parameters<typeof getAuth>[0]): string | null {
  return getAuthUserId(req);
}

function coerceDate(d: unknown): string {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d);
}

/** Read filter: own events + read-only demo seed events. */
function readFilter(userId: string) {
  return or(eq(calendarEventsTable.userId, userId), eq(calendarEventsTable.userId, DEMO_SEED_USER_ID))!;
}

/** Write filter: strictly the calling user's own events (excludes demo seed records). */
function writeFilter(userId: string) {
  return eq(calendarEventsTable.userId, userId);
}

router.get("/calendar-events", async (req, res) => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parseResult = ListCalendarEventsQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const { from, to } = parseResult.data;

  const conditions = [readFilter(userId)];
  if (from) conditions.push(gte(calendarEventsTable.date, from));
  if (to) conditions.push(lte(calendarEventsTable.date, to));

  const rows = await db
    .select()
    .from(calendarEventsTable)
    .where(and(...conditions))
    .orderBy(calendarEventsTable.date);

  res.json(rows.map(serializeEvent));
});

router.post("/calendar-events", async (req, res) => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parseResult = CreateCalendarEventBody.safeParse(req.body);
  if (!parseResult.success) {
    req.log.warn({ err: parseResult.error }, "Invalid create calendar event body");
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const data = parseResult.data;

  const [row] = await db
    .insert(calendarEventsTable)
    .values({
      userId,
      title: data.title,
      date: coerceDate(data.date),
      type: (data.type as typeof calendarEventsTable.$inferInsert["type"]) ?? "other",
      amount: data.amount !== undefined && data.amount !== null ? String(data.amount) : null,
      currency: data.currency ?? "JOD",
      categoryId: data.categoryId ?? null,
      recurring: (data.recurring as typeof calendarEventsTable.$inferInsert["recurring"]) ?? "none",
      priority: (data.priority as typeof calendarEventsTable.$inferInsert["priority"]) ?? "normal",
      notes: data.notes ?? null,
      isPaid: data.isPaid ?? false,
    })
    .returning();

  res.status(201).json(serializeEvent(row));
});

router.get("/calendar-events/:id", async (req, res) => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parseResult = GetCalendarEventParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [row] = await db
    .select()
    .from(calendarEventsTable)
    .where(and(eq(calendarEventsTable.id, parseResult.data.id), readFilter(userId)));

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(serializeEvent(row));
});

router.put("/calendar-events/:id", async (req, res) => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const paramsResult = UpdateCalendarEventParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const bodyResult = UpdateCalendarEventBody.safeParse(req.body);
  if (!bodyResult.success) {
    req.log.warn({ err: bodyResult.error }, "Invalid update calendar event body");
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const body = bodyResult.data;
  const updates: Record<string, unknown> = { updatedAt: sql`now()` };
  if (body.title !== undefined) updates.title = body.title;
  if (body.date !== undefined) updates.date = coerceDate(body.date);
  if (body.type !== undefined) updates.type = body.type;
  if (body.amount !== undefined) updates.amount = body.amount !== null ? String(body.amount) : null;
  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId ?? null;
  if (body.recurring !== undefined) updates.recurring = body.recurring;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.notes !== undefined) updates.notes = body.notes ?? null;
  if (body.isPaid !== undefined) updates.isPaid = body.isPaid;

  const [row] = await db
    .update(calendarEventsTable)
    .set(updates)
    .where(and(eq(calendarEventsTable.id, paramsResult.data.id), writeFilter(userId)))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found or not authorized" });
    return;
  }

  res.json(serializeEvent(row));
});

router.delete("/calendar-events/:id", async (req, res) => {
  const userId = requireAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parseResult = DeleteCalendarEventParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  await db
    .delete(calendarEventsTable)
    .where(and(eq(calendarEventsTable.id, parseResult.data.id), writeFilter(userId)));

  res.status(204).send();
});

export default router;
