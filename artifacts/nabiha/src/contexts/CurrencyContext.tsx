import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useGetUserProfile } from "@workspace/api-client-react";
import { convert as fxConvert, formatMoney as baseFormat, getCurrency, CURRENCIES } from "@/lib/currency";

const STORAGE_KEY = "nabiha:displayCurrency";
const DEFAULT_CURRENCY = "JOD";

type CurrencyContextValue = {
  displayCurrency: string;
  setDisplayCurrency: (code: string) => void;
  baseCurrency: string;
  convert: (amount: number, fromCode?: string) => number;
  format: (amount: number, fromCode?: string) => string;
  isConverted: boolean;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readStoredCurrency(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return CURRENCIES.some((c) => c.code === raw) ? raw : null;
  } catch {
    return null;
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useGetUserProfile();
  const baseCurrency = profile?.currency ?? DEFAULT_CURRENCY;

  const [displayCurrency, setDisplayCurrencyState] = useState<string>(
    () => readStoredCurrency() ?? DEFAULT_CURRENCY,
  );

  // Sync from localStorage on mount once (already done in useState init), and react to other tabs.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue == null) {
        setDisplayCurrencyState(DEFAULT_CURRENCY);
        return;
      }
      const code = CURRENCIES.find((c) => c.code === e.newValue)?.code;
      if (code) setDisplayCurrencyState(code);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setDisplayCurrency = useCallback((code: string) => {
    const valid = CURRENCIES.find((c) => c.code === code);
    if (!valid) return;
    setDisplayCurrencyState(valid.code);
    try {
      window.localStorage.setItem(STORAGE_KEY, valid.code);
    } catch {
      /* ignore */
    }
  }, []);

  const convert = useCallback(
    (amount: number, fromCode?: string) => fxConvert(amount, fromCode ?? baseCurrency, displayCurrency),
    [baseCurrency, displayCurrency],
  );

  const format = useCallback(
    (amount: number, fromCode?: string) =>
      baseFormat(fxConvert(amount, fromCode ?? baseCurrency, displayCurrency), displayCurrency),
    [baseCurrency, displayCurrency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      displayCurrency,
      setDisplayCurrency,
      baseCurrency,
      convert,
      format,
      isConverted: displayCurrency !== baseCurrency,
    }),
    [displayCurrency, setDisplayCurrency, baseCurrency, convert, format],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useDisplayCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Fallback so components don't crash if rendered outside the provider (e.g. tests).
    return {
      displayCurrency: DEFAULT_CURRENCY,
      setDisplayCurrency: () => {},
      baseCurrency: DEFAULT_CURRENCY,
      convert: (a) => a,
      format: (a) => baseFormat(a, DEFAULT_CURRENCY),
      isConverted: false,
    };
  }
  return ctx;
}

export function useDisplayCurrencyMeta() {
  const { displayCurrency } = useDisplayCurrency();
  return getCurrency(displayCurrency);
}
