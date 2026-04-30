import { useGetAccumulatedSavings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import {
  TrendingUp,
  CalendarDays,
  History,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export function SavingsCard() {
  const { data, isLoading } = useGetAccumulatedSavings();
  const { format } = useDisplayCurrency();

  if (isLoading || !data) {
    return <Skeleton className="h-44 w-full rounded-3xl" />;
  }

  const { totalSavings, previousMonthsSavings, currentMonthSavings, currency } = data;

  const isPositive = totalSavings >= 0;

  let subtitle: string;
  if (!isPositive) {
    subtitle = "تجاوزت المصاريف الدخل — راجع مصاريفك";
  } else if (totalSavings === 0) {
    subtitle = "ابدأ التوفير من هذا الشهر";
  } else {
    subtitle = "استمر في التوفير — أنت على المسار الصحيح!";
  }

  return (
    <Card
      className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm"
      data-testid="card-savings"
    >
      <CardHeader className="pb-0 pt-3 px-3">
        <CardTitle className="text-[10px] font-medium text-muted-foreground flex items-center justify-center gap-1">
          <TrendingUp className="w-3 h-3 text-primary" />
          المدخرات المتراكمة
        </CardTitle>
      </CardHeader>

      <CardContent className="px-3 pb-3 flex flex-col items-center text-center gap-1.5">
        <div
          className={`text-base font-extrabold tracking-tight tabular-nums ${
            isPositive ? "text-primary" : "text-destructive"
          }`}
          data-testid="text-total-savings"
        >
          {isPositive ? "+" : ""}
          {format(totalSavings, currency)}
        </div>

        <div className="w-full grid grid-cols-2 gap-1">
          <div className="flex flex-col items-center bg-secondary/40 rounded-xl p-1.5 border border-border/40">
            <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground mb-0.5">
              <History className="w-2.5 h-2.5" />
              <span>سابقة</span>
            </div>
            <span
              className={`text-[11px] font-bold tabular-nums ${
                previousMonthsSavings >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {previousMonthsSavings >= 0 ? "+" : ""}
              {format(previousMonthsSavings, currency)}
            </span>
          </div>

          <div className="flex flex-col items-center bg-secondary/40 rounded-xl p-1.5 border border-border/40">
            <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground mb-0.5">
              <CalendarDays className="w-2.5 h-2.5" />
              <span>هذا الشهر</span>
            </div>
            <span
              className={`text-[11px] font-bold flex items-center gap-0.5 tabular-nums ${
                currentMonthSavings >= 0 ? "text-emerald-600" : "text-destructive"
              }`}
            >
              {currentMonthSavings >= 0 ? (
                <ArrowUp className="w-2.5 h-2.5" />
              ) : (
                <ArrowDown className="w-2.5 h-2.5" />
              )}
              {Math.abs(currentMonthSavings) > 0
                ? format(Math.abs(currentMonthSavings), currency)
                : "—"}
            </span>
          </div>
        </div>

        <p className={`text-[9px] font-medium leading-tight ${isPositive ? "text-muted-foreground" : "text-destructive"}`}>
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}
