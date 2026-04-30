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

function serialize(profile: typeof userProfileTable.$inferSelect) {
  return {
    monthlySalary: Number(profile.monthlySalary),
    currency: profile.currency,
    payday: profile.payday,
    emailNotificationsEnabled: profile.emailNotificationsEnabled,
    notificationEmail: profile.notificationEmail,
    userName: profile.userName,
    updatedAt: profile.updatedAt,
  };
}

router.get("/profile", async (_req, res) => {
  const profile = await ensureProfile();
  res.json(serialize(profile));
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
  if (body.emailNotificationsEnabled !== undefined)
    updates.emailNotificationsEnabled = body.emailNotificationsEnabled;
  if (body.notificationEmail !== undefined) updates.notificationEmail = body.notificationEmail;
  if (body.userName !== undefined) updates.userName = body.userName;

  const [profile] = await db
    .update(userProfileTable)
    .set(updates)
    .where(eq(userProfileTable.id, PROFILE_ID))
    .returning();

  res.json(serialize(profile));
});

export default router;
