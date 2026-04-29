import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { MarkNotificationReadParams } from "@workspace/api-zod";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateUpcomingNotifications } from "../lib/notificationGenerator";

const router = Router();

router.use(requireAuth);

router.get("/notifications", async (req, res) => {
  const userId = req.userId;
  try {
    await generateUpcomingNotifications(userId);
  } catch (err) {
    req.log.error({ err }, "notification generation failed");
  }
  const items = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt));
  res.json(items);
});

router.post("/notifications/:id/read", async (req, res) => {
  const userId = req.userId;
  const parseResult = MarkNotificationReadParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [item] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, parseResult.data.id), eq(notificationsTable.userId, userId)))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(item);
});

router.post("/notifications/read-all", async (req, res) => {
  const userId = req.userId;
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, userId));
  res.status(204).send();
});

export default router;
