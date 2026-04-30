import { useGetAccumulatedSavings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import {
  TrendingUp,
  Sparkles,
  CalendarDays,
  History,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from "recharts";
import { formatMoney } from "@/lib/currency";

const MONTH_AR: Record<string, string> = {
  "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
  "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
  "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
};

function monthLabel(m: string) {
  const [, mm] = m.split("-");
  return MONTH_AR[mm] ?? m;
}

function CustomTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { month: string; savings: number; isCurrent: boolean } }>;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const { month, savings } = payload[0].payload;
  const positive = savings >= 0;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-right text-xs" dir="rtl">
      <p className="font-bold text-foreground">{monthLabel(month)}</p>
      <p className={`font-extrabold ${positive ? "text-primary" : "text-destructive"}`}>
        {positive ? "+" : ""}
        {formatMoney(savings, currency)}
      </p>
    </div>
  );
}

export function SavingsCard() {
  const { data, isLoading } = useGetAccumulatedSavings();
  const { format } = useDisplayCurrency();

  if (isLoading || !data) {
    return <Skeleton className="h-56 w-full rounded-3xl" />;
  }

  const { totalSavings, previousMonthsSavings, currentMonthSavings, monthlyBreakdown, currency } = data;

  const isPositive = totalSavings >= 0;
  const hasPrevious = monthlyBreakdown.filter((m) => !m.isCurrent).length > 0;

  return (
    <Card
      className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden"
      data-testid="card-savings"
    >
      {/* Subtle emerald gradient top strip */}
      <div className="h-1 w-full bg-gradient-to-l from-primary via-teal-500 to-emerald-400" />

      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          المدخرات المتراكمة
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5 pb-5 flex flex-col items-center text-center gap-3">
        {/* Main total */}
        <div className="space-y-0.5">
          <div
            className={`text-2xl font-extrabold tracking-tight ${
              isPositive ? "text-primary" : "text-destructive"
            }`}
            data-testid="text-total-savings"
          >
            {isPositive ? "+" : ""}
            {format(totalSavings, currency)}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {isPositive
              ? "رصيدك التراكمي منذ بداية التتبع 🌿"
              : "تجاوزت المصاريف الدخل — راجعي مصاريفك"}
          </p>
        </div>

        {/* Breakdown row */}
        <div className="w-full grid grid-cols-2 gap-2">
          {/* Previous months */}
          <div className="flex flex-col items-center bg-secondary/40 rounded-2xl p-2.5 border border-border/40">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
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

          {/* Current month */}
          <div className="flex flex-col items-center bg-secondary/40 rounded-2xl p-2.5 border border-border/40">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
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

        {/* Mini bar chart — only when there's more than one month */}
        {monthlyBreakdown.length > 1 && (
          <div className="w-full" style={{ height: 52 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyBreakdown}
                barCategoryGap="20%"
                margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
              >
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                <RechartsTooltip
                  content={<CustomTooltip currency={currency} />}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.5, radius: 4 }}
                />
                <Bar dataKey="savings" radius={[3, 3, 0, 0]}>
                  {monthlyBreakdown.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={
                        entry.savings >= 0
                          ? entry.isCurrent
                            ? "#10b981"
                            : "#1B7E63"
                          : "hsl(var(--destructive))"
                      }
                      opacity={entry.isCurrent ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Motivational badge */}
        {isPositive && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3 h-3" />
            {totalSavings > 0
              ? hasPrevious
                ? "استمري في التوفير — أنت على المسار الصحيح!"
                : "شهرك الأول — بداية موفقة!"
              : "ابدأي التوفير من هذا الشهر"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
