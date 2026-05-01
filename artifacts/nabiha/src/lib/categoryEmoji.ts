function isActualEmoji(str: string): boolean {
  return /\p{Extended_Pictographic}/u.test(str);
}

const EMOJI_MAP: { keywords: string[]; emoji: string }[] = [
  {
    keywords: ["مطعم", "طعام", "أكل", "غداء", "عشاء", "وجبة", "فطور", "كافيه", "مقهى", "لانش", "restaurant", "food", "lunch", "dinner", "breakfast", "cafe"],
    emoji: "🍽️",
  },
  {
    keywords: ["مقاضي", "بقال", "سوبر", "جمعية", "سوق", "خضار", "فواكه", "تسوق", "شراء", "grocery", "supermarket", "market", "shopping"],
    emoji: "🛒",
  },
  {
    keywords: ["بنزين", "وقود", "سيارة", "محروقات", "ديزل", "محطة", "fuel", "gas", "petrol", "car", "vehicle"],
    emoji: "⛽",
  },
  {
    keywords: ["صحة", "دواء", "طبيب", "مستشفى", "عيادة", "علاج", "صيدلية", "health", "medicine", "doctor", "hospital", "clinic", "pharmacy", "medical"],
    emoji: "💊",
  },
  {
    keywords: ["كهرباء", "كهربا", "electricity", "electric", "power"],
    emoji: "⚡",
  },
  {
    keywords: ["فاتورة", "اشتراك", "خدمات", "bill", "invoice", "subscription", "service"],
    emoji: "📄",
  },
  {
    keywords: ["ماء", "مياه", "شرب", "water"],
    emoji: "💧",
  },
  {
    keywords: ["إيجار", "ايجار", "بيت", "شقة", "سكن", "منزل", "عقار", "rent", "apartment", "house", "housing", "home"],
    emoji: "🏠",
  },
  {
    keywords: ["سفر", "طيران", "تذكرة", "رحلة", "اجازة", "سياحة", "فندق", "travel", "flight", "ticket", "trip", "vacation", "hotel", "airline"],
    emoji: "✈️",
  },
  {
    keywords: ["ترفيه", "ترفية", "سينما", "مسرح", "ألعاب", "نتفليكس", "شاهد", "يوتيوب", "entertainment", "cinema", "movies", "netflix", "youtube", "spotify", "games"],
    emoji: "🎬",
  },
  {
    keywords: ["ملابس", "لبس", "أزياء", "موضة", "ثياب", "clothes", "clothing", "fashion", "apparel"],
    emoji: "👗",
  },
  {
    keywords: ["تعليم", "دراسة", "مدرسة", "جامعة", "كتب", "قرطاسية", "دروس", "تنظيم", "education", "school", "university", "college", "books", "tuition", "course"],
    emoji: "📚",
  },
  {
    keywords: ["انترنت", "إنترنت", "نت", "اتصالات", "جوال", "هاتف", "موبايل", "رصيد", "internet", "phone", "mobile", "telecom", "broadband", "wifi"],
    emoji: "📱",
  },
  {
    keywords: ["رياضة", "نادي", "جيم", "صالة", "تمرين", "sport", "gym", "fitness", "workout", "exercise"],
    emoji: "🏋️",
  },
  {
    keywords: ["قهوة", "شاي", "مشروبات", "عصير", "coffee", "tea", "drinks", "juice", "beverage"],
    emoji: "☕",
  },
  {
    keywords: ["هدايا", "هدية", "عيدية", "مناسبة", "حفلة", "gift", "gifts", "present", "party", "celebration"],
    emoji: "🎁",
  },
  {
    keywords: ["أقساط", "قسط", "بنك", "قرض", "تمويل", "ديون", "installment", "loan", "bank", "finance", "debt", "mortgage", "credit"],
    emoji: "🏦",
  },
  {
    keywords: ["صيانة", "تصليح", "تعمير", "اصلاح", "maintenance", "repair", "fix"],
    emoji: "🔧",
  },
  {
    keywords: ["أطفال", "طفل", "حضانة", "حليب", "حفاضات", "children", "child", "kids", "daycare", "nursery", "baby"],
    emoji: "👶",
  },
  {
    keywords: ["تأمين", "تامين", "بوليصة", "insurance", "policy"],
    emoji: "🛡️",
  },
  {
    keywords: ["مواصلات", "تاكسي", "باص", "حافلة", "اوبر", "كريم", "نقل", "transport", "taxi", "bus", "uber", "careem", "commute"],
    emoji: "🚌",
  },
  {
    keywords: ["تجميل", "صالون", "حلاقة", "عناية", "مكياج", "عطر", "beauty", "salon", "haircut", "makeup", "perfume", "grooming"],
    emoji: "💄",
  },
  {
    keywords: ["حيوانات", "قطة", "كلب", "حيوان", "بيطري", "pet", "pets", "cat", "dog", "vet", "veterinary"],
    emoji: "🐾",
  },
  {
    keywords: ["متفرقات", "أخرى", "عام", "مصاريف", "miscellaneous", "misc", "other", "general", "expenses"],
    emoji: "📦",
  },
];

export function getCategoryEmoji(name: string, icon?: string | null): string {
  if (icon && icon.trim() && isActualEmoji(icon.trim())) return icon.trim();
  const lower = (name ?? "").toLowerCase();
  for (const entry of EMOJI_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.emoji;
  }
  return "📂";
}

export function getEmojiForTitle(title: string): string | null {
  const lower = (title ?? "").toLowerCase();
  for (const entry of EMOJI_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.emoji;
  }
  return null;
}
