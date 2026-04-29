import { Router } from "express";
import { db, commitmentsTable } from "@workspace/db";
import {
  CreateCommitmentBody,
  UpdateCommitmentBody,
  UpdateCommitmentParams,
  DeleteCommitmentParams,
} from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.use(requireAuth);

router.get("/commitments", async (req, res) => {
  const userId = req.userId;
  const commitments = await db
    .select()
    .from(commitmentsTable)
    .where(eq(commitmentsTable.userId, userId))
    .orderBy(commitmentsTable.dueDay);
  res.json(commitments.map((c) => ({ ...c, amount: Number(c.amount) })));
});

router.post("/commitments", async (req, res) => {
  const userId = req.userId;
  const parseResult = CreateCommitmentBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { title, amount, dueDay, notes } = parseResult.data;
  const [commitment] = await db
    .insert(commitmentsTable)
    .values({ userId, title, amount: String(amount), dueDay, notes: notes ?? null })
    .returning();

  res.status(201).json({ ...commitment, amount: Number(commitment.amount) });
});

router.put("/commitments/:id", async (req, res) => {
  const userId = req.userId;
  const paramsResult = UpdateCommitmentParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const bodyResult = UpdateCommitmentBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const updates: Partial<typeof commitmentsTable.$inferInsert> = {};
  const body = bodyResult.data;
  if (body.title !== undefined) updates.title = body.title;
  if (body.amount !== undefined) updates.amount = String(body.amount);
  if (body.dueDay !== undefined) updates.dueDay = body.dueDay;
  if (body.isPaid !== undefined) updates.isPaid = body.isPaid;
  if (body.notes !== undefined) updates.notes = body.notes ?? null;

  const [commitment] = await db
    .update(commitmentsTable)
    .set(updates)
    .where(and(eq(commitmentsTable.id, paramsResult.data.id), eq(commitmentsTable.userId, userId)))
    .returning();

  if (!commitment) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({ ...commitment, amount: Number(commitment.amount) });
});

router.delete("/commitments/:id", async (req, res) => {
  const userId = req.userId;
  const parseResult = DeleteCommitmentParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  await db
    .delete(commitmentsTable)
    .where(and(eq(commitmentsTable.id, parseResult.data.id), eq(commitmentsTable.userId, userId)));
  res.status(204).send();
});

export default router;
