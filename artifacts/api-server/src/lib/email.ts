import { Resend } from "resend";
import { logger } from "./logger";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || "Nabiha <onboarding@resend.dev>";

let client: Resend | null = null;
function getClient(): Resend {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!client) client = new Resend(apiKey);
  return client;
}

export interface ReminderEmailInput {
  to: string;
  userName: string | null;
  commitmentTitle: string;
  amount: number;
  currency: string;
  dueDateLabel: string;
  manageLink: string;
}

function formatAmount(amount: number, currency: string): string {
  const v = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${v} ${currency}`;
}

function buildSubject(commitmentTitle: string): string {
  return `💡 نَبِيهَة تذكّرك: يومان فقط على موعد ${commitmentTitle}`;
}

function buildHtml(input: ReminderEmailInput): string {
  const greetingName = input.userName?.trim() || "صديقي العزيز";
  const amount = formatAmount(input.amount, input.currency);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>تذكير من نَبِيهَة</title>
  </head>
  <body style="margin:0;padding:0;background:#f6faf8;font-family:-apple-system,Segoe UI,Tahoma,Arial,sans-serif;color:#0f172a;direction:rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6faf8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:24px;box-shadow:0 4px 20px rgba(15,23,42,0.06);overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="padding:28px 28px 8px;background:linear-gradient(135deg,#1B7E63 0%,#16654f 100%);color:#ffffff;text-align:right;">
                <div style="font-size:26px;font-weight:800;letter-spacing:-0.5px;">نَبِيهَة</div>
                <div style="font-size:13px;opacity:0.9;margin-top:4px;">رفيقك المالي الذكي</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 4px;text-align:right;">
                <h1 style="margin:0 0 6px;font-size:20px;font-weight:800;color:#0f172a;">يومان فقط ونجدّد طاقتنا معاً! 💡</h1>
                <p style="margin:0;color:#475569;font-size:14px;line-height:1.7;">
                  مرحباً <strong style="color:#1B7E63">${escapeHtml(greetingName)}</strong>، أتمنى أن يكون يومك سعيداً!
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 28px 8px;text-align:right;color:#334155;font-size:14px;line-height:1.8;">
                أنا نَبِيهَة، جئت لألقي عليك تحية سريعة وأذكّرك بأن موعد
                <strong style="color:#0f172a">${escapeHtml(input.commitmentTitle)}</strong>
                سيكون بعد يومين فقط (بتاريخ <strong>${escapeHtml(input.dueDateLabel)}</strong>).
                <br/><br/>
                حرصتُ على مراسلتك الآن لنضمن بقاء كل أمورك تسير بسلاسة دون أي انقطاع. نحن سعداء جداً بوجودك معنا، ويهمّنا أن تستمر تجربتك بنفس الراحة.
              </td>
            </tr>

            <!-- Details box -->
            <tr>
              <td style="padding:8px 28px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f4;border-radius:16px;border:1px solid #e2e8f0;">
                  <tr>
                    <td style="padding:14px 16px;text-align:right;">
                      <div style="font-size:12px;color:#64748b;font-weight:600;">تفاصيل التجديد</div>
                      <div style="font-size:18px;color:#0f172a;font-weight:800;margin-top:4px;">${escapeHtml(input.commitmentTitle)}</div>
                    </td>
                    <td style="padding:14px 16px;text-align:left;direction:ltr;">
                      <div style="font-size:12px;color:#64748b;font-weight:600;">المبلغ</div>
                      <div style="font-size:18px;color:#1B7E63;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums;">${escapeHtml(amount)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:0 16px 14px;text-align:right;">
                      <div style="font-size:12px;color:#64748b;font-weight:600;">تاريخ التجديد</div>
                      <div style="font-size:14px;color:#0f172a;font-weight:700;margin-top:2px;">${escapeHtml(input.dueDateLabel)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding:24px 28px 8px;text-align:center;">
                <a href="${escapeAttr(input.manageLink)}" style="display:inline-block;background:#1B7E63;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:14px;font-weight:800;font-size:15px;">
                  مراجعة الالتزام أو التجديد
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 28px 24px;text-align:right;color:#475569;font-size:13px;line-height:1.7;">
                إذا واجهتك أي مشكلة، أنا وفريق نَبِيهَة بجانبك دائماً.
                <br/><br/>
                دمت بخير،
                <br/>
                <strong style="color:#1B7E63">نَبِيهَة 🌿</strong>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px;">
                "درهمك بأمان مع نبيهة الزمان"
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export async function sendReminderEmail(input: ReminderEmailInput): Promise<{ id: string | null }> {
  const html = buildHtml(input);
  const subject = buildSubject(input.commitmentTitle);
  const resend = getClient();
  const result = await resend.emails.send({
    from: FROM,
    to: [input.to],
    subject,
    html,
  });
  if (result.error) {
    logger.error({ err: result.error }, "Resend email failed");
    throw new Error(`Email send failed: ${result.error.message ?? "unknown"}`);
  }
  return { id: result.data?.id ?? null };
}
