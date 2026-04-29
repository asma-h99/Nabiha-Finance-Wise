import { Coins, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CURRENCIES, getCurrency } from "@/lib/currency";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CurrencySwitcher({ className }: { className?: string }) {
  const { displayCurrency, setDisplayCurrency, isConverted } = useDisplayCurrency();
  const [open, setOpen] = useState(false);
  const current = getCurrency(displayCurrency);

  const arab = CURRENCIES.filter((c) => c.isArab);
  const intl = CURRENCIES.filter((c) => !c.isArab);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "rounded-xl gap-2 h-9 px-3 font-semibold border-primary/20 hover:bg-primary/5 hover:border-primary/40",
            isConverted && "border-accent/50 bg-accent/5",
            className,
          )}
          data-testid="button-currency-switcher"
          aria-label="اختر عملة العرض"
        >
          <Coins className="w-4 h-4 text-primary" />
          <span className="text-base leading-none">{current.symbol}</span>
          <span className="hidden sm:inline text-xs text-muted-foreground font-medium">{current.code}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        dir="rtl"
        className="w-72 p-0 rounded-2xl shadow-xl border-primary/10"
      >
        <div className="p-3 border-b bg-gradient-to-l from-primary/5 to-transparent">
          <div className="text-sm font-bold text-foreground">عملة العرض</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            تتحوّل كل المبالغ في التطبيق تلقائياً
          </div>
          <div className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
            ملاحظة: أسعار الصرف تقريبية وثابتة، وليست أسعاراً لحظية.
          </div>
        </div>
        <ScrollArea className="h-[60vh] sm:h-[380px]">
          <div className="p-2">
            <div className="px-2 pt-1 pb-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              العملات العربية
            </div>
            <ul role="listbox" className="space-y-0.5">
              {arab.map((c) => (
                <CurrencyRow
                  key={c.code}
                  code={c.code}
                  symbol={c.symbol}
                  arabicName={c.arabicName}
                  selected={c.code === displayCurrency}
                  onSelect={() => {
                    setDisplayCurrency(c.code);
                    setOpen(false);
                  }}
                />
              ))}
            </ul>
            <div className="px-2 pt-3 pb-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              عملات عالمية
            </div>
            <ul role="listbox" className="space-y-0.5">
              {intl.map((c) => (
                <CurrencyRow
                  key={c.code}
                  code={c.code}
                  symbol={c.symbol}
                  arabicName={c.arabicName}
                  selected={c.code === displayCurrency}
                  onSelect={() => {
                    setDisplayCurrency(c.code);
                    setOpen(false);
                  }}
                />
              ))}
            </ul>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function CurrencyRow({
  code,
  symbol,
  arabicName,
  selected,
  onSelect,
}: {
  code: string;
  symbol: string;
  arabicName: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        role="option"
        aria-selected={selected}
        data-testid={`option-display-currency-${code}`}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-colors",
          "hover:bg-primary/5 focus:outline-none focus:bg-primary/10",
          selected && "bg-primary/10",
        )}
      >
        <span
          className={cn(
            "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base font-extrabold",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          )}
        >
          {symbol}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-foreground truncate">
            {arabicName}
          </span>
          <span className="block text-[11px] text-muted-foreground font-medium tracking-wide">
            {code}
          </span>
        </span>
        {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
      </button>
    </li>
  );
}
