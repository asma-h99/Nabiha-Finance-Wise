import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CURRENCIES, getCurrency } from "@/lib/currency";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CurrencySwitcher({ className }: { className?: string }) {
  const { displayCurrency, setDisplayCurrency, isConverted } = useDisplayCurrency();
  const [open, setOpen] = useState(false);
  const current = getCurrency(displayCurrency);

  const ordered = [
    ...CURRENCIES.filter((c) => c.isArab),
    ...CURRENCIES.filter((c) => !c.isArab),
  ];

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
          <span
            dir="ltr"
            className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-md bg-primary/10 text-primary text-[11px] font-bold leading-none"
          >
            {current.symbol}
          </span>
          <span className="text-sm leading-none font-bold tracking-wide">{current.code}</span>
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
        <div
          className={cn(
            "h-[60vh] sm:h-[380px] overflow-y-scroll p-2 [scrollbar-gutter:stable]",
            "[scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]",
            "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/40",
          )}
        >
          <ul role="listbox" className="space-y-0.5">
            {ordered.map((c) => (
              <CurrencyRow
                key={c.code}
                code={c.code}
                englishName={c.englishName}
                selected={c.code === displayCurrency}
                onSelect={() => {
                  setDisplayCurrency(c.code);
                  setOpen(false);
                }}
              />
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CurrencyRow({
  code,
  englishName,
  selected,
  onSelect,
}: {
  code: string;
  englishName: string;
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
        dir="ltr"
      >
        <span
          className={cn(
            "shrink-0 w-12 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold tracking-wide",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          )}
        >
          {code}
        </span>
        <span className="flex-1 min-w-0 text-left">
          <span className="block text-sm font-semibold text-foreground truncate">
            {englishName}
          </span>
        </span>
        {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
      </button>
    </li>
  );
}
