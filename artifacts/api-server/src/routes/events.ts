import { Router } from "express";
import { db, eventsTable } from "@workspace/db";
import {
  ListEventsQueryParams,
  CreateEventBody,
  DeleteEventParams,
} from "@workspace/api-zod";
import { eq, and, sql, asc, type SQL } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.use(requireAuth);

router.get("/events", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
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

  res.json(events.map((e) => ({ ...e, amount: e.amount === null ? null : Number(e.amount) })));
});

router.post("/events", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
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
      date: typeof body.date === "string" ? body.date : body.date.toISOString().slice(0, 10),
      type: body.type,
      notes: body.notes ?? null,
    })
    .returning();

  res.status(201).json({ ...event, amount: event.amount === null ? null : Number(event.amount) });
});

router.delete("/events/:id", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
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
