export interface IslamicOccasion {
  name: string;
  monthIdx: number;
  emoji: string;
  hint: string;
  approxDate: string;
}

// Approximate Gregorian months/dates for major Islamic occasions by year.
// Dates shift ~11 days earlier each Gregorian year (lunar calendar drift).
export const ISLAMIC_OCCASIONS: Record<number, IslamicOccasion[]> = {
  2025: [
    { name: "رمضان المبارك",      monthIdx: 2, emoji: "🌙", hint: "خطط لميزانية رمضان مسبقاً",       approxDate: "2025-03-01" },
    { name: "عيد الفطر",          monthIdx: 3, emoji: "🎊", hint: "خصص ميزانية ملابس وهدايا العيد",  approxDate: "2025-04-01" },
    { name: "عيد الأضحى",         monthIdx: 5, emoji: "🐑", hint: "خصص ميزانية الأضحية والولائم",   approxDate: "2025-06-07" },
    { name: "رأس السنة الهجرية", monthIdx: 6, emoji: "🌟", hint: "بداية السنة الهجرية الجديدة",     approxDate: "2025-07-18" },
    { name: "المولد النبوي",      monthIdx: 8, emoji: "🕌", hint: "ذكرى المولد النبوي الشريف",       approxDate: "2025-09-26" },
  ],
  2026: [
    { name: "رمضان المبارك",      monthIdx: 1, emoji: "🌙", hint: "خطط لميزانية رمضان مسبقاً",       approxDate: "2026-02-18" },
    { name: "عيد الفطر",          monthIdx: 2, emoji: "🎊", hint: "خصص ميزانية ملابس وهدايا العيد",  approxDate: "2026-03-20" },
    { name: "عيد الأضحى",         monthIdx: 4, emoji: "🐑", hint: "خصص ميزانية الأضحية والولائم",   approxDate: "2026-05-27" },
    { name: "رأس السنة الهجرية", monthIdx: 6, emoji: "🌟", hint: "بداية السنة الهجرية الجديدة",     approxDate: "2026-07-07" },
    { name: "المولد النبوي",      monthIdx: 8, emoji: "🕌", hint: "ذكرى المولد النبوي الشريف",       approxDate: "2026-09-15" },
  ],
  2027: [
    { name: "رمضان المبارك",      monthIdx: 1, emoji: "🌙", hint: "خطط لميزانية رمضان مسبقاً",       approxDate: "2027-02-07" },
    { name: "عيد الفطر",          monthIdx: 2, emoji: "🎊", hint: "خصص ميزانية ملابس وهدايا العيد",  approxDate: "2027-03-09" },
    { name: "عيد الأضحى",         monthIdx: 4, emoji: "🐑", hint: "خصص ميزانية الأضحية والولائم",   approxDate: "2027-05-17" },
    { name: "رأس السنة الهجرية", monthIdx: 5, emoji: "🌟", hint: "بداية السنة الهجرية الجديدة",     approxDate: "2027-06-26" },
    { name: "المولد النبوي",      monthIdx: 8, emoji: "🕌", hint: "ذكرى المولد النبوي الشريف",       approxDate: "2027-09-04" },
  ],
};

export function getIslamicOccasionsForMonth(year: number, monthIdx: number): IslamicOccasion[] {
  return (ISLAMIC_OCCASIONS[year] ?? []).filter((o) => o.monthIdx === monthIdx);
}
