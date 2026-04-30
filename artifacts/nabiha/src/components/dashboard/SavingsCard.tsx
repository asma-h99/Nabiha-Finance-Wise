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
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          المدخرات المتراكمة
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-4 flex flex-col items-center text-center gap-2">
        <div
          className={`text-xl font-extrabold tracking-tight ${
            isPositive ? "text-primary" : "text-destructive"
          }`}
          data-testid="text-total-savings"
        >
          {isPositive ? "+" : ""}
          {format(totalSavings, currency)}
        </div>

        <div className="w-full grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center bg-secondary/40 rounded-2xl p-2 border border-border/40">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
              <History className="w-3 h-3" />
              <span>أشهر سابقة</span>
            </div>
            <span
              className={`text-sm font-bold ${
                previousMonthsSavings >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {previousMonthsSavings >= 0 ? "+" : ""}
              {format(previousMonthsSavings, currency)}
            </span>
          </div>

          <div className="flex flex-col items-center bg-secondary/40 rounded-2xl p-2 border border-border/40">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
              <CalendarDays className="w-3 h-3" />
              <span>هذا الشهر</span>
            </div>
            <span
              className={`text-sm font-bold flex items-center gap-0.5 ${
                currentMonthSavings >= 0 ? "text-emerald-600" : "text-destructive"
              }`}
            >
              {currentMonthSavings >= 0 ? (
                <ArrowUp className="w-3 h-3" />
              ) : (
                <ArrowDown className="w-3 h-3" />
              )}
              {Math.abs(currentMonthSavings) > 0
                ? format(Math.abs(currentMonthSavings), currency)
                : "—"}
            </span>
          </div>
        </div>

        <p className={`text-[10px] font-medium ${isPositive ? "text-muted-foreground" : "text-destructive"}`}>
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}
