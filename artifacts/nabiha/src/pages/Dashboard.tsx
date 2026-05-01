import {
  useGetDashboardSummary,
  useGetMonthlyTrend,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Wallet } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import happyMascot from "@assets/Gemini_Generated_Image_d3nzkdd3nzkdd3nz_1777144269395.png";
import { SalaryCard } from "@/components/dashboard/SalaryCard";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { SavingsCard } from "@/components/dashboard/SavingsCard";
import { FinancialCalendarCard } from "@/components/dashboard/FinancialCalendarCard";
import { CommitmentsBreakdownCard } from "@/components/dashboard/CommitmentsBreakdownCard";
import { LoanSimulatorCard } from "@/components/dashboard/LoanSimulatorCard";
import { NabihaTipsCard } from "@/components/dashboard/NabihaTipsCard";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { formatMoney } from "@/lib/currency";
import { useMemo } from "react";

const PRIORITY_COLORS = {
  essential: "hsl(var(--primary))",      // brand emerald
  important: "hsl(38 92% 52%)",          // brand gold accent
  luxury:    "hsl(var(--destructive))",  // red – luxury = risk
};

const PRIORITY_LABELS = {
  essential: "ضرورية",
  important: "مهمة",
  luxury: "كمالية",
};

export default function Dashboard() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({ month: currentMonth });
  const { data: trendData, isLoading: loadingTrend } = useGetMonthlyTrend();

  const { format, convert, displayCurrency, baseCurrency } = useDisplayCurrency();

  const trendChart = useMemo(
    () =>
      (trendData ?? []).map((d) => ({
        ...d,
        total: convert(d.total ?? 0, baseCurrency),
        essential: convert(d.essential ?? 0, baseCurrency),
        important: convert(d.important ?? 0, baseCurrency),
        luxury: convert(d.luxury ?? 0, baseCurrency),
      })),
    [trendData, convert, baseCurrency],
  );

  if (loadingSummary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-44 w-full rounded-3xl" />
          <Skeleton className="h-44 w-full rounded-3xl" />
          <Skeleton className="h-44 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-l from-primary/10 to-primary/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row-reverse items-center gap-6 border border-primary/10 shadow-sm relative overflow-hidden">
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

        <img
          src={happyMascot}
          alt="Mascot"
          className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-full shadow-lg border-4 border-white dark:border-card z-10 shrink-0"
        />
        <div className="text-center md:text-right z-10 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">أهلاً بك في نَبِيهَة!</h1>
          <p className="text-muted-foreground text-lg mb-4">
            أنا هنا لأساعدك في إدارة أموالك بذكاء ووعي. لنلقِ نظرة على وضعك المالي هذا الشهر.
          </p>

          {summary && summary.unpaidCommitmentsCount > 0 && (
            <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-xl text-sm font-medium border border-destructive/20">
              <AlertCircle className="w-4 h-4" />
              لديك {summary.unpaidCommitmentsCount} التزامات غير مدفوعة
            </div>
          )}
        </div>
      </div>
      {/* Money KPIs (right → left by importance): Balance, Savings, This Month, Salary */}
      <div className="grid grid-cols-4 gap-2">
        <BalanceCard />
        <SavingsCard />
        <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm" data-testid="card-this-month">
          <CardHeader className="pb-0 pt-3 px-3">
            <CardTitle className="text-[10px] font-medium text-muted-foreground flex items-center justify-center gap-1">
              <Wallet className="w-3 h-3 text-primary" />
              إجمالي الإنفاق
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 flex flex-col items-center text-center">
            <div className="text-base font-bold text-foreground tabular-nums">
              {format((summary?.totalThisMonth || 0) + (summary?.commitmentsTotal || 0), baseCurrency)}
            </div>
          </CardContent>
        </Card>
        <SalaryCard />
      </div>
      {/* Nabiha Tips Card */}
      <NabihaTipsCard />

      {/* Financial Calendar */}
      <div className="grid grid-cols-1 gap-6">
        <FinancialCalendarCard />
      </div>
      {/* CommitmentsBreakdown (3/4) + Loan Simulator (1/4) */}
      <div className="grid grid-cols-4 gap-6 items-stretch">
        {/* Right col: Loan Simulator (DOM-first = visual right in RTL) */}
        <LoanSimulatorCard />

        {/* Left cols: Commitments donut (read-only analysis) */}
        <div className="col-span-3">
          <CommitmentsBreakdownCard />
        </div>
      </div>

      {/* Monthly Trend — full width */}
      <div dir="rtl">
        <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col" dir="rtl">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">النمط الشهري</CardTitle>
            <CardDescription>تتبع صرفياتك خلال الأشهر الماضية</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center px-4 pt-3 pb-4 min-h-[340px]">
            {loadingTrend ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : trendChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendChart} margin={{ top: 16, right: 52, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    width={46}
                    style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem", fill: "hsl(var(--muted-foreground))" }}
                  />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [
                      formatMoney(value, displayCurrency),
                      name === "total" ? "الإجمالي" : PRIORITY_LABELS[name as keyof typeof PRIORITY_LABELS] || name,
                    ]}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "0.75rem", direction: "rtl" }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.72rem" }} className="text-foreground font-medium px-1">
                        {value === "total" ? "الإجمالي" : PRIORITY_LABELS[value as keyof typeof PRIORITY_LABELS] || value}
                      </span>
                    )}
                  />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--foreground))" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="essential" stroke={PRIORITY_COLORS.essential} strokeWidth={2} dot={false} strokeDasharray="0" />
                  <Line type="monotone" dataKey="important" stroke={PRIORITY_COLORS.important} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="luxury"    stroke={PRIORITY_COLORS.luxury}    strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground text-center text-sm">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
