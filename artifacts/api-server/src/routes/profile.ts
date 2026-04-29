import { Router } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { UpdateProfileBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.use(requireAuth);

router.get("/profile", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.userId;
  let [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  if (!profile) {
    [profile] = await db
      .insert(userProfilesTable)
      .values({ userId })
      .returning();
  }

  res.json({
    ...profile,
    monthlySalary: Number(profile.monthlySalary),
  });
});

router.put("/profile", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.userId;
  const parseResult = UpdateProfileBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const body = parseResult.data;
  const updates: Partial<typeof userProfilesTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.monthlySalary !== undefined) updates.monthlySalary = String(body.monthlySalary);
  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.onboardingComplete !== undefined) updates.onboardingComplete = body.onboardingComplete;
  if (body.displayName !== undefined) updates.displayName = body.displayName ?? null;

  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  let profile;
  if (!existing) {
    [profile] = await db
      .insert(userProfilesTable)
      .values({ userId, ...updates })
      .returning();
  } else {
    [profile] = await db
      .update(userProfilesTable)
      .set(updates)
      .where(eq(userProfilesTable.userId, userId))
      .returning();
  }

  res.json({
    ...profile,
    monthlySalary: Number(profile.monthlySalary),
  });
});

export default router;
