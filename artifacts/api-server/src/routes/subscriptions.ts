import { Router } from "express";
import { db, subscriptionsTable } from "@workspace/db";
import {
  CreateSubscriptionBody,
  UpdateSubscriptionBody,
  UpdateSubscriptionParams,
  DeleteSubscriptionParams,
} from "@workspace/api-zod";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.use(requireAuth);

function toDateString(d: Date | string): string {
  if (typeof d === "string") return d;
  return d.toISOString().slice(0, 10);
}

router.get("/subscriptions", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.userId;
  const subs = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(asc(subscriptionsTable.nextRenewalDate));
  res.json(subs.map((s) => ({ ...s, amount: Number(s.amount) })));
});

router.post("/subscriptions", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.userId;
  const parseResult = CreateSubscriptionBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const body = parseResult.data;
  const [sub] = await db
    .insert(subscriptionsTable)
    .values({
      userId,
      name: body.name,
      amount: String(body.amount),
      frequency: body.frequency,
      category: body.category,
      nextRenewalDate: toDateString(body.nextRenewalDate),
      status: body.status ?? "active",
      brandColor: body.brandColor ?? null,
      brandIcon: body.brandIcon ?? null,
      notes: body.notes ?? null,
    })
    .returning();

  res.status(201).json({ ...sub, amount: Number(sub.amount) });
});

router.put("/subscriptions/:id", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.userId;
  const paramsResult = UpdateSubscriptionParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const bodyResult = UpdateSubscriptionBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const updates: Partial<typeof subscriptionsTable.$inferInsert> = {};
  const body = bodyResult.data;
  if (body.name !== undefined) updates.name = body.name;
  if (body.amount !== undefined) updates.amount = String(body.amount);
  if (body.frequency !== undefined) updates.frequency = body.frequency;
  if (body.category !== undefined) updates.category = body.category;
  if (body.nextRenewalDate !== undefined) updates.nextRenewalDate = toDateString(body.nextRenewalDate);
  if (body.status !== undefined) updates.status = body.status;
  if (body.brandColor !== undefined) updates.brandColor = body.brandColor ?? null;
  if (body.brandIcon !== undefined) updates.brandIcon = body.brandIcon ?? null;
  if (body.notes !== undefined) updates.notes = body.notes ?? null;

  const [sub] = await db
    .update(subscriptionsTable)
    .set(updates)
    .where(and(eq(subscriptionsTable.id, paramsResult.data.id), eq(subscriptionsTable.userId, userId)))
    .returning();

  if (!sub) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({ ...sub, amount: Number(sub.amount) });
});

router.delete("/subscriptions/:id", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.userId;
  const parseResult = DeleteSubscriptionParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  await db
    .delete(subscriptionsTable)
    .where(and(eq(subscriptionsTable.id, parseResult.data.id), eq(subscriptionsTable.userId, userId)));
  res.status(204).send();
});

export default router;
