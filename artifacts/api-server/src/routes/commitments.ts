import { Router } from "express";
import { db, commitmentsTable, commitmentSkipsTable } from "@workspace/db";
import {
  CreateCommitmentBody,
  UpdateCommitmentBody,
  UpdateCommitmentParams,
  DeleteCommitmentParams,
  SkipCommitmentMonthParams,
  SkipCommitmentMonthBody,
  UnskipCommitmentMonthParams,
} from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/commitments", async (_req, res) => {
  const commitments = await db.select().from(commitmentsTable).orderBy(commitmentsTable.dueDay);
  res.json(commitments.map((c) => ({ ...c, amount: Number(c.amount) })));
});

router.post("/commitments", async (req, res) => {
  const parseResult = CreateCommitmentBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { title, amount, dueDay, notes, endDate, isOneTime, oneTimeMonth } = parseResult.data;

  if (isOneTime && !oneTimeMonth) {
    res.status(400).json({ error: "oneTimeMonth is required when isOneTime is true" });
    return;
  }

  if (isOneTime && oneTimeMonth && !/^\d{4}-\d{2}$/.test(oneTimeMonth)) {
    res.status(400).json({ error: "oneTimeMonth must be in YYYY-MM format" });
    return;
  }

  const endDateStr = endDate ? endDate.toISOString().slice(0, 10) : null;
  const [commitment] = await db
    .insert(commitmentsTable)
    .values({
      title,
      amount: String(amount),
      dueDay,
      notes: notes ?? null,
      endDate: endDateStr,
      isOneTime: isOneTime ?? false,
      oneTimeMonth: oneTimeMonth ?? null,
    })
    .returning();

  res.status(201).json({ ...commitment, amount: Number(commitment.amount) });
});

router.put("/commitments/:id", async (req, res) => {
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
  if (body.endDate !== undefined) {
    updates.endDate = body.endDate
      ? body.endDate.toISOString().slice(0, 10)
      : null;
  }

  const [commitment] = await db
    .update(commitmentsTable)
    .set(updates)
    .where(eq(commitmentsTable.id, paramsResult.data.id))
    .returning();

  if (!commitment) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({ ...commitment, amount: Number(commitment.amount) });
});

router.delete("/commitments/:id", async (req, res) => {
  const parseResult = DeleteCommitmentParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  await db.delete(commitmentsTable).where(eq(commitmentsTable.id, parseResult.data.id));
  res.status(204).send();
});

router.get("/commitment-skips", async (_req, res) => {
  const skips = await db.select().from(commitmentSkipsTable);
  res.json(skips);
});

router.post("/commitments/:id/skip", async (req, res) => {
  const paramsResult = SkipCommitmentMonthParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const bodyResult = SkipCommitmentMonthBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const { id } = paramsResult.data;
  const { month } = bodyResult.data;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month must be in YYYY-MM format" });
    return;
  }

  // Fetch the commitment to check it exists and is not one-time
  const [targetCommitment] = await db
    .select()
    .from(commitmentsTable)
    .where(eq(commitmentsTable.id, id));

  if (!targetCommitment) {
    res.status(404).json({ error: "Commitment not found" });
    return;
  }

  if (targetCommitment.isOneTime) {
    res.status(400).json({ error: "Cannot skip a one-time commitment; delete it entirely instead" });
    return;
  }

  const existing = await db
    .select()
    .from(commitmentSkipsTable)
    .where(
      and(
        eq(commitmentSkipsTable.commitmentId, id),
        eq(commitmentSkipsTable.month, month),
      ),
    );

  if (existing.length > 0) {
    res.status(409).json({ error: "Already skipped for this month" });
    return;
  }

  const [skip] = await db
    .insert(commitmentSkipsTable)
    .values({ commitmentId: id, month })
    .returning();

  res.status(201).json(skip);
});

router.delete("/commitments/:id/skip/:month", async (req, res) => {
  const paramsResult = UnskipCommitmentMonthParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const { id, month } = paramsResult.data;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month must be in YYYY-MM format" });
    return;
  }

  await db
    .delete(commitmentSkipsTable)
    .where(
      and(
        eq(commitmentSkipsTable.commitmentId, id),
        eq(commitmentSkipsTable.month, month),
      ),
    );

  res.status(204).send();
});

export default router;
