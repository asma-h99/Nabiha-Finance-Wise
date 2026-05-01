import { Router } from "express";
import { db, commitmentsTable, commitmentSkipsTable, categoriesTable } from "@workspace/db";
import {
  CreateCommitmentBody,
  UpdateCommitmentBody,
  UpdateCommitmentParams,
  DeleteCommitmentParams,
  SkipCommitmentMonthParams,
  SkipCommitmentMonthBody,
  UnskipCommitmentMonthParams,
} from "@workspace/api-zod";
import { eq, and, isNull } from "drizzle-orm";

const router = Router();

/* ── keyword → emoji mapping (mirrors categoryEmoji.ts on the client) ──────── */
const EMOJI_MAP: { keywords: string[]; emoji: string }[] = [
  { keywords: ["مطعم", "طعام", "أكل", "غداء", "عشاء", "وجبة", "فطور", "كافيه", "مقهى", "لانش", "restaurant", "food", "lunch", "dinner", "breakfast", "cafe"], emoji: "🍽️" },
  { keywords: ["مقاضي", "بقال", "سوبر", "جمعية", "سوق", "خضار", "فواكه", "تسوق", "شراء", "grocery", "supermarket", "market", "shopping"], emoji: "🛒" },
  { keywords: ["بنزين", "وقود", "سيارة", "محروقات", "ديزل", "محطة", "fuel", "gas", "petrol", "car", "vehicle"], emoji: "⛽" },
  { keywords: ["صحة", "دواء", "طبيب", "مستشفى", "عيادة", "علاج", "صيدلية", "health", "medicine", "doctor", "hospital", "clinic", "pharmacy", "medical"], emoji: "💊" },
  { keywords: ["كهرباء", "كهربا", "electricity", "electric", "power"], emoji: "⚡" },
  { keywords: ["فاتورة", "اشتراك", "خدمات", "bill", "invoice", "subscription", "service"], emoji: "📄" },
  { keywords: ["ماء", "مياه", "شرب", "water"], emoji: "💧" },
  { keywords: ["إيجار", "ايجار", "بيت", "شقة", "سكن", "منزل", "عقار", "rent", "apartment", "house", "housing", "home"], emoji: "🏠" },
  { keywords: ["سفر", "طيران", "تذكرة", "رحلة", "اجازة", "سياحة", "فندق", "travel", "flight", "ticket", "trip", "vacation", "hotel", "airline"], emoji: "✈️" },
  { keywords: ["ترفيه", "ترفية", "سينما", "مسرح", "ألعاب", "نتفليكس", "شاهد", "يوتيوب", "entertainment", "cinema", "movies", "netflix", "youtube", "spotify", "games"], emoji: "🎬" },
  { keywords: ["ملابس", "لبس", "أزياء", "موضة", "ثياب", "clothes", "clothing", "fashion", "apparel"], emoji: "👗" },
  { keywords: ["تعليم", "دراسة", "مدرسة", "جامعة", "كتب", "قرطاسية", "دروس", "تنظيم", "education", "school", "university", "college", "books", "tuition", "course"], emoji: "📚" },
  { keywords: ["انترنت", "إنترنت", "نت", "اتصالات", "جوال", "هاتف", "موبايل", "رصيد", "internet", "phone", "mobile", "telecom", "broadband", "wifi"], emoji: "📱" },
  { keywords: ["رياضة", "نادي", "جيم", "صالة", "تمرين", "sport", "gym", "fitness", "workout", "exercise"], emoji: "🏋️" },
  { keywords: ["قهوة", "شاي", "مشروبات", "عصير", "coffee", "tea", "drinks", "juice", "beverage"], emoji: "☕" },
  { keywords: ["هدايا", "هدية", "عيدية", "مناسبة", "حفلة", "gift", "gifts", "present", "party", "celebration"], emoji: "🎁" },
  { keywords: ["أقساط", "قسط", "بنك", "قرض", "تمويل", "ديون", "installment", "loan", "bank", "finance", "debt", "mortgage", "credit"], emoji: "🏦" },
  { keywords: ["صيانة", "تصليح", "تعمير", "اصلاح", "maintenance", "repair", "fix"], emoji: "🔧" },
  { keywords: ["أطفال", "طفل", "حضانة", "حليب", "حفاضات", "children", "child", "kids", "daycare", "nursery", "baby"], emoji: "👶" },
  { keywords: ["تأمين", "تامين", "بوليصة", "insurance", "policy"], emoji: "🛡️" },
  { keywords: ["مواصلات", "تاكسي", "باص", "حافلة", "اوبر", "كريم", "نقل", "transport", "taxi", "bus", "uber", "careem", "commute"], emoji: "🚌" },
  { keywords: ["تجميل", "صالون", "حلاقة", "عناية", "مكياج", "عطر", "beauty", "salon", "haircut", "makeup", "perfume", "grooming"], emoji: "💄" },
  { keywords: ["حيوانات", "قطة", "كلب", "حيوان", "بيطري", "pet", "pets", "cat", "dog", "vet", "veterinary"], emoji: "🐾" },
  { keywords: ["متفرقات", "أخرى", "عام", "مصاريف", "miscellaneous", "misc", "other", "general", "expenses"], emoji: "📦" },
];

function isActualEmoji(str: string): boolean {
  return /\p{Extended_Pictographic}/u.test(str);
}

function getEmojiForText(text: string): string | null {
  const lower = (text ?? "").toLowerCase();
  for (const entry of EMOJI_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.emoji;
  }
  return null;
}

function getCategoryEmojiForCategory(name: string, icon: string | null | undefined): string {
  if (icon && icon.trim() && isActualEmoji(icon.trim())) return icon.trim();
  return getEmojiForText(name) ?? "📂";
}

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
  const { title, amount, dueDay, notes, endDate, isOneTime, oneTimeMonth, categoryId } = parseResult.data;

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
      categoryId: categoryId ?? null,
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
  if ("categoryId" in body) updates.categoryId = body.categoryId ?? null;

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

/* ── Auto-assign categories to commitments that have none ───────────────── */
router.post("/commitments/auto-assign-categories", async (_req, res) => {
  const updated = await autoAssignCategories();
  res.json({ updated });
});

export async function autoAssignCategories(): Promise<number> {
  const unassigned = await db
    .select()
    .from(commitmentsTable)
    .where(isNull(commitmentsTable.categoryId));

  if (unassigned.length === 0) return 0;

  const allCategories = await db.select().from(categoriesTable);
  if (allCategories.length === 0) return 0;

  // Build category emoji → id lookup
  const categoryByEmoji = new Map<string, number>();
  for (const cat of allCategories) {
    const emoji = getCategoryEmojiForCategory(cat.name, cat.icon);
    if (!categoryByEmoji.has(emoji)) {
      categoryByEmoji.set(emoji, cat.id);
    }
  }

  let count = 0;
  for (const commitment of unassigned) {
    const emoji = getEmojiForText(commitment.title);
    if (!emoji) continue;
    const catId = categoryByEmoji.get(emoji);
    if (!catId) continue;
    await db
      .update(commitmentsTable)
      .set({ categoryId: catId })
      .where(eq(commitmentsTable.id, commitment.id));
    count++;
  }
  return count;
}

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
