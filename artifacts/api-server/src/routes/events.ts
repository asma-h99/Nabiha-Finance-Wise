import { Router } from "express";
import { db, eventsTable } from "@workspace/db";
import {
  ListEventsQueryParams,
  CreateEventBody,
  UpdateEventBody,
  UpdateEventParams,
  DeleteEventParams,
} from "@workspace/api-zod";
import { eq, and, sql, asc, type SQL } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.use(requireAuth);

function toDateString(d: Date | string): string {
  return typeof d === "string" ? d : d.toISOString().slice(0, 10);
}

function serializeEvent(e: typeof eventsTable.$inferSelect) {
  return { ...e, amount: e.amount === null ? null : Number(e.amount) };
}

router.get("/events", async (req, res) => {
  const userId = req.userId;
  const parseResult = ListEventsQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { year, month } = parseResult.data;
  const conditions: SQL[] = [eq(eventsTable.userId, userId)];
  if (month) {
    conditions.push(sql`${eventsTable.date} LIKE ${month + "%"}`);
  } else if (year) {
    conditions.push(sql`${eventsTable.date} LIKE ${year + "%"}`);
  }

  const events = await db
    .select()
    .from(eventsTable)
    .where(and(...conditions))
    .orderBy(asc(eventsTable.date));

  res.json(events.map(serializeEvent));
});

router.post("/events", async (req, res) => {
  const userId = req.userId;
  const parseResult = CreateEventBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const body = parseResult.data;
  const [event] = await db
    .insert(eventsTable)
    .values({
      userId,
      title: body.title,
      amount: body.amount === undefined || body.amount === null ? null : String(body.amount),
      date: toDateString(body.date),
      type: body.type,
      recurrence: body.recurrence ?? "none",
      recurrenceEndDate: body.recurrenceEndDate
        ? toDateString(body.recurrenceEndDate)
        : null,
      notes: body.notes ?? null,
    })
    .returning();

  res.status(201).json(serializeEvent(event));
});

router.put("/events/:id", async (req, res) => {
  const userId = req.userId;
  const paramsResult = UpdateEventParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const bodyResult = UpdateEventBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const body = bodyResult.data;
  const updates: Partial<typeof eventsTable.$inferInsert> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.amount !== undefined) {
    updates.amount = body.amount === null ? null : String(body.amount);
  }
  if (body.date !== undefined) updates.date = toDateString(body.date);
  if (body.type !== undefined) updates.type = body.type;
  if (body.recurrence !== undefined) updates.recurrence = body.recurrence;
  if (body.recurrenceEndDate !== undefined) {
    updates.recurrenceEndDate = body.recurrenceEndDate
      ? toDateString(body.recurrenceEndDate)
      : null;
  }
  if (body.notes !== undefined) updates.notes = body.notes ?? null;

  const [event] = await db
    .update(eventsTable)
    .set(updates)
    .where(and(eq(eventsTable.id, paramsResult.data.id), eq(eventsTable.userId, userId)))
    .returning();

  if (!event) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serializeEvent(event));
});

router.delete("/events/:id", async (req, res) => {
  const userId = req.userId;
  const parseResult = DeleteEventParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  await db
    .delete(eventsTable)
    .where(and(eq(eventsTable.id, parseResult.data.id), eq(eventsTable.userId, userId)));
  res.status(204).send();
});

export default router;
