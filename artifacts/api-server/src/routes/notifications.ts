import { Router } from "express";
import { getAuth } from "@clerk/express";
import { SendTestNotificationBody } from "@workspace/api-zod";
import { sendReminderEmail } from "../lib/email";
import { runReminderCheck } from "../lib/notifications";

const router = Router();

router.post("/notifications/test", async (req, res) => {
  // Require an authenticated session so this email-sending endpoint cannot be
  // abused by unauthenticated callers to send arbitrary mail through Resend.
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = SendTestNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { email, userName } = parsed.data;
  try {
    await sendReminderEmail({
      to: email,
      userName: userName ?? null,
      commitmentTitle: "اشتراك تجريبي (مثال)",
      amount: 9.99,
      currency: "JOD",
      dueDateLabel: "—",
      manageLink: "/app/commitments",
    });
    res.json({ sent: 1, skipped: 0, message: "تم إرسال البريد التجريبي بنجاح" });
  } catch (err) {
    req.log.error({ err }, "Test email failed");
    const msg = err instanceof Error ? err.message : "فشل إرسال البريد";
    res.status(500).json({ sent: 0, skipped: 0, message: msg });
  }
});

router.post("/notifications/run", async (req, res) => {
  try {
    const result = await runReminderCheck();
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Manual reminder run failed");
    res.status(500).json({ sent: 0, skipped: 0, message: "فشل تشغيل المجدول" });
  }
});

export default router;
