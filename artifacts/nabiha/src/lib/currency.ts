export interface CurrencyOption {
  code: string;
  symbol: string;
  arabicName: string;
  englishName: string;
  isArab: boolean;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "JOD", symbol: "د.أ", arabicName: "دينار أردني", englishName: "Jordanian Dinar", isArab: true },
  { code: "AED", symbol: "د.إ", arabicName: "درهم إماراتي", englishName: "UAE Dirham", isArab: true },
  { code: "SAR", symbol: "ر.س", arabicName: "ريال سعودي", englishName: "Saudi Riyal", isArab: true },
  { code: "EGP", symbol: "ج.م", arabicName: "جنيه مصري", englishName: "Egyptian Pound", isArab: true },
  { code: "KWD", symbol: "د.ك", arabicName: "دينار كويتي", englishName: "Kuwaiti Dinar", isArab: true },
  { code: "QAR", symbol: "ر.ق", arabicName: "ريال قطري", englishName: "Qatari Riyal", isArab: true },
  { code: "BHD", symbol: "د.ب", arabicName: "دينار بحريني", englishName: "Bahraini Dinar", isArab: true },
  { code: "OMR", symbol: "ر.ع", arabicName: "ريال عماني", englishName: "Omani Rial", isArab: true },
  { code: "MAD", symbol: "د.م", arabicName: "درهم مغربي", englishName: "Moroccan Dirham", isArab: true },
  { code: "TND", symbol: "د.ت", arabicName: "دينار تونسي", englishName: "Tunisian Dinar", isArab: true },
  { code: "DZD", symbol: "د.ج", arabicName: "دينار جزائري", englishName: "Algerian Dinar", isArab: true },
  { code: "LBP", symbol: "ل.ل", arabicName: "ليرة لبنانية", englishName: "Lebanese Pound", isArab: true },
  { code: "IQD", symbol: "د.ع", arabicName: "دينار عراقي", englishName: "Iraqi Dinar", isArab: true },
  { code: "LYD", symbol: "د.ل", arabicName: "دينار ليبي", englishName: "Libyan Dinar", isArab: true },
  { code: "SYP", symbol: "ل.س", arabicName: "ليرة سورية", englishName: "Syrian Pound", isArab: true },
  { code: "YER", symbol: "ر.ي", arabicName: "ريال يمني", englishName: "Yemeni Rial", isArab: true },
  { code: "SDG", symbol: "ج.س", arabicName: "جنيه سوداني", englishName: "Sudanese Pound", isArab: true },
  { code: "USD", symbol: "$", arabicName: "دولار أمريكي", englishName: "US Dollar", isArab: false },
  { code: "EUR", symbol: "€", arabicName: "يورو", englishName: "Euro", isArab: false },
  { code: "GBP", symbol: "£", arabicName: "جنيه إسترليني", englishName: "British Pound", isArab: false },
];

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code: string): CurrencyOption {
  return BY_CODE.get(code) ?? CURRENCIES[0];
}

export function getDecimals(code: string): number {
  return ["JOD", "KWD", "BHD", "OMR", "LYD"].includes(code) ? 3 : 2;
}

// Approximate exchange rates relative to 1 USD (snapshot for in-app display only).
// All conversions pivot through USD: amount_to = amount * (RATES[to] / RATES[from]).
export const FX_RATES_PER_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JOD: 0.709,
  AED: 3.673,
  SAR: 3.75,
  EGP: 49.0,
  KWD: 0.307,
  QAR: 3.64,
  BHD: 0.376,
  OMR: 0.385,
  MAD: 9.95,
  TND: 3.1,
  DZD: 134.5,
  LBP: 89500,
  IQD: 1310,
  LYD: 4.85,
  SYP: 13000,
  YER: 250,
  SDG: 600,
};

export function convert(amount: number, fromCode: string, toCode: string): number {
  if (!Number.isFinite(amount)) return 0;
  if (fromCode === toCode) return amount;
  const from = FX_RATES_PER_USD[fromCode];
  const to = FX_RATES_PER_USD[toCode];
  if (!from || !to) return amount;
  return amount * (to / from);
}

export function formatMoney(value: number, currency = "JOD"): string {
  const c = getCurrency(currency);
  const decimals = getDecimals(c.code);
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted} ${c.code}`;
}

export function formatCompact(value: number, currency = "JOD"): string {
  const c = getCurrency(currency);
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K ${c.code}`;
  }
  return formatMoney(value, currency);
}
