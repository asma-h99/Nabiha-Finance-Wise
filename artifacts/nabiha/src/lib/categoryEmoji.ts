function isActualEmoji(str: string): boolean {
  return /\p{Extended_Pictographic}/u.test(str);
}

const EMOJI_MAP: { keywords: string[]; emoji: string }[] = [
  { keywords: ["مطعم", "طعام", "أكل", "غداء", "عشاء", "وجبة", "فطور", "كافيه", "مقهى", "لانش"], emoji: "🍽️" },
  { keywords: ["مقاضي", "بقال", "سوبر", "جمعية", "سوق", "خضار", "فواكه", "تسوق", "شراء"], emoji: "🛒" },
  { keywords: ["بنزين", "وقود", "سيارة", "محروقات", "ديزل", "محطة"], emoji: "⛽" },
  { keywords: ["صحة", "دواء", "طبيب", "مستشفى", "عيادة", "علاج", "صيدلية"], emoji: "💊" },
  { keywords: ["كهرباء", "كهربا"], emoji: "⚡" },
  { keywords: ["فاتورة", "اشتراك", "خدمات"], emoji: "📄" },
  { keywords: ["ماء", "مياه", "شرب"], emoji: "💧" },
  { keywords: ["إيجار", "ايجار", "بيت", "شقة", "سكن", "منزل", "عقار"], emoji: "🏠" },
  { keywords: ["سفر", "طيران", "تذكرة", "رحلة", "اجازة", "سياحة", "فندق"], emoji: "✈️" },
  { keywords: ["ترفيه", "ترفية", "سينما", "مسرح", "ألعاب", "نتفليكس", "شاهد", "يوتيوب"], emoji: "🎬" },
  { keywords: ["ملابس", "لبس", "أزياء", "موضة", "ثياب"], emoji: "👗" },
  { keywords: ["تعليم", "دراسة", "مدرسة", "جامعة", "كتب", "قرطاسية", "دروس", "تنظيم"], emoji: "📚" },
  { keywords: ["انترنت", "إنترنت", "نت", "اتصالات", "جوال", "هاتف", "موبايل", "رصيد"], emoji: "📱" },
  { keywords: ["رياضة", "نادي", "جيم", "صالة", "تمرين"], emoji: "🏋️" },
  { keywords: ["قهوة", "شاي", "مشروبات", "عصير"], emoji: "☕" },
  { keywords: ["هدايا", "هدية", "عيدية", "مناسبة", "حفلة"], emoji: "🎁" },
  { keywords: ["أقساط", "قسط", "بنك", "قرض", "تمويل", "ديون"], emoji: "🏦" },
  { keywords: ["صيانة", "تصليح", "تعمير", "اصلاح"], emoji: "🔧" },
  { keywords: ["أطفال", "طفل", "حضانة", "حليب", "حفاضات"], emoji: "👶" },
  { keywords: ["تأمين", "تامين", "بوليصة"], emoji: "🛡️" },
  { keywords: ["مواصلات", "تاكسي", "باص", "حافلة", "اوبر", "كريم", "نقل"], emoji: "🚌" },
  { keywords: ["تجميل", "صالون", "حلاقة", "عناية", "مكياج", "عطر"], emoji: "💄" },
  { keywords: ["حيوانات", "قطة", "كلب", "حيوان", "بيطري"], emoji: "🐾" },
  { keywords: ["متفرقات", "أخرى", "عام", "مصاريف"], emoji: "📦" },
];

export function getCategoryEmoji(name: string, icon?: string | null): string {
  if (icon && icon.trim() && isActualEmoji(icon.trim())) return icon.trim();
  const lower = (name ?? "").toLowerCase();
  for (const entry of EMOJI_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.emoji;
  }
  return "📂";
}
