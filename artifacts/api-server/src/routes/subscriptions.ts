import { Router } from "express";
import { db, subscriptionsTable } from "@workspace/db";
import {
  CreateSubscriptionBody,
  UpdateSubscriptionBody,
  UpdateSubscriptionParams,
  DeleteSubscriptionParams,
} from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/subscriptions", async (_req, res) => {
  const rows = await db
    .select()
    .from(subscriptionsTable)
    .orderBy(desc(subscriptionsTable.createdAt));
  res.json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
});

router.post("/subscriptions", async (req, res) => {
  const parseResult = CreateSubscriptionBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { name, amount, billingCycle, color, icon, renewsOnDay, notes } = parseResult.data;
  const [row] = await db
    .insert(subscriptionsTable)
    .values({
      name,
      amount: String(amount),
      billingCycle,
      color: color ?? null,
      icon: icon ?? null,
      renewsOnDay: renewsOnDay ?? null,
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json({ ...row, amount: Number(row.amount) });
});

router.put("/subscriptions/:id", async (req, res) => {
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
  const updates: Record<string, unknown> = {};
  const body = bodyResult.data;
  if (body.name !== undefined) updates.name = body.name;
  if (body.amount !== undefined) updates.amount = String(body.amount);
  if (body.billingCycle !== undefined) updates.billingCycle = body.billingCycle;
  if (body.color !== undefined) updates.color = body.color ?? null;
  if (body.icon !== undefined) updates.icon = body.icon ?? null;
  if (body.renewsOnDay !== undefined) updates.renewsOnDay = body.renewsOnDay ?? null;
  if (body.notes !== undefined) updates.notes = body.notes ?? null;

  const [row] = await db
    .update(subscriptionsTable)
    .set(updates)
    .where(eq(subscriptionsTable.id, paramsResult.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...row, amount: Number(row.amount) });
});

router.delete("/subscriptions/:id", async (req, res) => {
  const parseResult = DeleteSubscriptionParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  await db
    .delete(subscriptionsTable)
    .where(eq(subscriptionsTable.id, parseResult.data.id));
  res.status(204).send();
});

export default router;
