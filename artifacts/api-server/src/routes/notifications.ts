import { Router } from "express";
import { SendTestNotificationBody } from "@workspace/api-zod";
import { sendReminderEmail } from "../lib/email";
import { runReminderCheck } from "../lib/notifications";

const router = Router();

router.post("/notifications/test", async (req, res) => {
  const parsed = SendTestNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بريد إلكتروني غير صالح" });
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
    const raw = err instanceof Error ? err.message : "";
    let msg = "فشل إرسال البريد. حاولي مرة أخرى لاحقاً.";
    const sandboxMatch = raw.match(/own email address \(([^)]+)\)/i);
    if (sandboxMatch) {
      const verified = sandboxMatch[1];
      msg = `حساب Resend في وضع الاختبار، لذلك لا يمكن الإرسال إلا للعنوان الموثّق: ${verified}. لإرسال الرسائل لأي عنوان، يجب توثيق نطاق على resend.com/domains وضبط RESEND_FROM_EMAIL.`;
    } else if (/api key/i.test(raw)) {
      msg = "مفتاح Resend غير صالح أو مفقود.";
    } else if (raw) {
      msg = `تعذّر إرسال البريد: ${raw}`;
    }
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
