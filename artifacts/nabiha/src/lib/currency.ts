export const CURRENCY_OPTIONS = [
  { code: "JOD", labelAr: "دينار أردني", symbol: "د.أ", decimals: 3 },
  { code: "SAR", labelAr: "ريال سعودي", symbol: "ر.س", decimals: 2 },
  { code: "AED", labelAr: "درهم إماراتي", symbol: "د.إ", decimals: 2 },
  { code: "EGP", labelAr: "جنيه مصري", symbol: "ج.م", decimals: 2 },
  { code: "KWD", labelAr: "دينار كويتي", symbol: "د.ك", decimals: 3 },
  { code: "BHD", labelAr: "دينار بحريني", symbol: "د.ب", decimals: 3 },
  { code: "QAR", labelAr: "ريال قطري", symbol: "ر.ق", decimals: 2 },
  { code: "OMR", labelAr: "ريال عماني", symbol: "ر.ع", decimals: 3 },
  { code: "IQD", labelAr: "دينار عراقي", symbol: "د.ع", decimals: 0 },
  { code: "LBP", labelAr: "ليرة لبنانية", symbol: "ل.ل", decimals: 0 },
  { code: "MAD", labelAr: "درهم مغربي", symbol: "د.م", decimals: 2 },
  { code: "TND", labelAr: "دينار تونسي", symbol: "د.ت", decimals: 3 },
  { code: "DZD", labelAr: "دينار جزائري", symbol: "د.ج", decimals: 2 },
  { code: "LYD", labelAr: "دينار ليبي", symbol: "د.ل", decimals: 3 },
  { code: "YER", labelAr: "ريال يمني", symbol: "ر.ي", decimals: 2 },
  { code: "SDG", labelAr: "جنيه سوداني", symbol: "ج.س", decimals: 2 },
  { code: "SYP", labelAr: "ليرة سورية", symbol: "ل.س", decimals: 2 },
  { code: "USD", labelAr: "دولار أمريكي", symbol: "$", decimals: 2 },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"];

export function getCurrency(code: string) {
  return (
    CURRENCY_OPTIONS.find((c) => c.code === code) ??
    CURRENCY_OPTIONS[0]
  );
}

export function formatAmount(value: number, code: string = "JOD"): string {
  const c = getCurrency(code);
  const formatted = new Intl.NumberFormat("ar", {
    minimumFractionDigits: c.decimals,
    maximumFractionDigits: c.decimals,
  }).format(value);
  return `${formatted} ${c.symbol}`;
}

export function formatCompact(value: number, code: string = "JOD"): string {
  const c = getCurrency(code);
  const formatted = new Intl.NumberFormat("ar", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted} ${c.symbol}`;
}
