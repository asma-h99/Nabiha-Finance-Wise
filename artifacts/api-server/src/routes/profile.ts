import { Router } from "express";
import { db, userProfileTable } from "@workspace/db";
import { UpdateUserProfileBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

const PROFILE_ID = 1;

async function ensureProfile() {
  const [existing] = await db
    .select()
    .from(userProfileTable)
    .where(eq(userProfileTable.id, PROFILE_ID));
  if (existing) return existing;
  const [created] = await db
    .insert(userProfileTable)
    .values({ id: PROFILE_ID })
    .returning();
  return created;
}

router.get("/profile", async (_req, res) => {
  const profile = await ensureProfile();
  res.json({
    monthlySalary: Number(profile.monthlySalary),
    currency: profile.currency,
    payday: profile.payday,
    updatedAt: profile.updatedAt,
  });
});

router.put("/profile", async (req, res) => {
  const parseResult = UpdateUserProfileBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  await ensureProfile();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const body = parseResult.data;
  if (body.monthlySalary !== undefined) updates.monthlySalary = String(body.monthlySalary);
  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.payday !== undefined) updates.payday = body.payday;

  const [profile] = await db
    .update(userProfileTable)
    .set(updates)
    .where(eq(userProfileTable.id, PROFILE_ID))
    .returning();

  res.json({
    monthlySalary: Number(profile.monthlySalary),
    currency: profile.currency,
    payday: profile.payday,
    updatedAt: profile.updatedAt,
  });
});

export default router;
