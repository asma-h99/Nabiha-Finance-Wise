import { useGetBalanceSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { getCurrency } from "@/lib/currency";
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

export function BalanceCard() {
  const { data, isLoading } = useGetBalanceSummary();
  const { format, displayCurrency } = useDisplayCurrency();

  if (isLoading || !data) {
    return <Skeleton className="h-44 w-full rounded-3xl" />;
  }

  const remaining = data.projectedRemaining;
  const salary = data.monthlySalary;
  const outflow = salary - remaining;
  const usedPercent = salary > 0 ? Math.min(100, Math.max(0, (outflow / salary) * 100)) : 0;
  const isHealthy = remaining > salary * 0.2;
  const isWarning = remaining > 0 && remaining <= salary * 0.2;
  const isCritical = remaining <= 0;

  let stateColor = "text-emerald-600";
  let stateBg = "bg-emerald-50 border-emerald-200";
  let stateIcon = CheckCircle2;
  let stateLabel = "وضعك ممتاز";
  if (isCritical) {
    stateColor = "text-destructive";
    stateBg = "bg-destructive/10 border-destructive/20";
    stateIcon = AlertTriangle;
    stateLabel = "تنبيه: تجاوزتي راتبك";
  } else if (isWarning) {
    stateColor = "text-amber-600";
    stateBg = "bg-amber-50 border-amber-200";
    stateIcon = TrendingDown;
    stateLabel = "خفّفي شوي، باقي قليل";
  }

  const StateIcon = stateIcon;

  return (
    <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm" data-testid="card-balance">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          المتوقع المتبقي هذا الشهر
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className={`text-3xl md:text-4xl font-extrabold tracking-tight ${
            isCritical ? "text-destructive" : "text-foreground"
          }`}
          data-testid="text-balance-remaining"
        >
          {format(remaining, data.currency)}
        </div>
        <div className="text-xs text-muted-foreground -mt-2" data-testid="text-balance-currency-name">
          {getCurrency(displayCurrency).arabicName}
          <span className="opacity-70"> ({displayCurrency})</span>
        </div>
        {salary > 0 && (
          <div className="space-y-1.5">
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCritical ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>صرف: {format(outflow, data.currency)}</span>
              <span>راتب: {format(salary, data.currency)}</span>
            </div>
          </div>
        )}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border ${stateBg} ${stateColor}`} data-testid="badge-balance-state">
          <StateIcon className="w-4 h-4" />
          {stateLabel}
        </div>
      </CardContent>
    </Card>
  );
}
