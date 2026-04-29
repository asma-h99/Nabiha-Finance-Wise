import { useGetBalanceSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

export function BalanceCard() {
  const { data, isLoading } = useGetBalanceSummary();
  const { format } = useDisplayCurrency();

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
    stateLabel = "تنبيه: تجاوزت راتبك";
  } else if (isWarning) {
    stateColor = "text-amber-600";
    stateBg = "bg-amber-50 border-amber-200";
    stateIcon = TrendingDown;
    stateLabel = "خفّف شوي، باقي قليل";
  }

  const StateIcon = stateIcon;

  return (
    <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm" data-testid="card-balance">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
          <TrendingUp className="w-4 h-4" />
          المتوقع المتبقي هذا الشهر
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex flex-col items-center text-center">
        <div
          className={`text-xl md:text-2xl font-extrabold tracking-tight ${
            isCritical ? "text-destructive" : "text-foreground"
          }`}
          data-testid="text-balance-remaining"
        >
          {format(remaining, data.currency)}
        </div>
        {salary > 0 && (
          <div className="space-y-1.5 w-full">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
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
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${stateBg} ${stateColor}`} data-testid="badge-balance-state">
          <StateIcon className="w-3.5 h-3.5" />
          {stateLabel}
        </div>
      </CardContent>
    </Card>
  );
}
