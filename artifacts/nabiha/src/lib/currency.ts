export interface CurrencyOption {
  code: string;
  symbol: string;
  arabicName: string;
  englishName: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "JOD", symbol: "د.أ", arabicName: "دينار أردني", englishName: "Jordanian Dinar" },
  { code: "AED", symbol: "د.إ", arabicName: "درهم إماراتي", englishName: "UAE Dirham" },
  { code: "SAR", symbol: "ر.س", arabicName: "ريال سعودي", englishName: "Saudi Riyal" },
  { code: "EGP", symbol: "ج.م", arabicName: "جنيه مصري", englishName: "Egyptian Pound" },
  { code: "KWD", symbol: "د.ك", arabicName: "دينار كويتي", englishName: "Kuwaiti Dinar" },
  { code: "QAR", symbol: "ر.ق", arabicName: "ريال قطري", englishName: "Qatari Riyal" },
  { code: "BHD", symbol: "د.ب", arabicName: "دينار بحريني", englishName: "Bahraini Dinar" },
  { code: "OMR", symbol: "ر.ع", arabicName: "ريال عماني", englishName: "Omani Rial" },
  { code: "MAD", symbol: "د.م", arabicName: "درهم مغربي", englishName: "Moroccan Dirham" },
  { code: "TND", symbol: "د.ت", arabicName: "دينار تونسي", englishName: "Tunisian Dinar" },
  { code: "DZD", symbol: "د.ج", arabicName: "دينار جزائري", englishName: "Algerian Dinar" },
  { code: "LBP", symbol: "ل.ل", arabicName: "ليرة لبنانية", englishName: "Lebanese Pound" },
  { code: "IQD", symbol: "د.ع", arabicName: "دينار عراقي", englishName: "Iraqi Dinar" },
  { code: "USD", symbol: "$", arabicName: "دولار أمريكي", englishName: "US Dollar" },
  { code: "EUR", symbol: "€", arabicName: "يورو", englishName: "Euro" },
];

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code: string): CurrencyOption {
  return BY_CODE.get(code) ?? CURRENCIES[0];
}

export function getDecimals(code: string): number {
  return ["JOD", "KWD", "BHD", "OMR"].includes(code) ? 3 : 2;
}

export function formatMoney(value: number, currency = "JOD"): string {
  const c = getCurrency(currency);
  const decimals = getDecimals(c.code);
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted} ${c.symbol}`;
}

export function formatCompact(value: number, currency = "JOD"): string {
  const c = getCurrency(currency);
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K ${c.symbol}`;
  }
  return formatMoney(value, currency);
}
