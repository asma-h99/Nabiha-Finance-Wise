import {
  useGetDashboardSummary,
  useGetBalanceSummary,
  useGetMonthlyTrend,
  useGetUserProfile,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Wallet, Target, Info, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
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
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { formatMoney } from "@/lib/currency";
import { useMemo } from "react";

const PRIORITY_COLORS = {
  essential: "hsl(var(--destructive))",
  important: "hsl(var(--chart-3))",
  luxury: "hsl(var(--primary))",
};

const PRIORITY_LABELS = {
  essential: "ضرورية",
  important: "مهمة",
  luxury: "كمالية",
};

export default function Dashboard() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: profile } = useGetUserProfile();
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({ month: currentMonth });
  const { data: balance } = useGetBalanceSummary();
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

  const isOverspending = (summary?.totalThisMonth || 0) > (summary?.totalLastMonth || 0);

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
              صرفياتي هذا الشهر
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 flex flex-col items-center text-center gap-1.5">
            <div className="text-base font-bold text-foreground tabular-nums">
              {format(summary?.totalThisMonth || 0, baseCurrency)}
            </div>
            <div className={`text-[10px] flex items-center gap-0.5 font-medium ${isOverspending ? "text-destructive" : "text-emerald-600"}`}>
              {isOverspending ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{isOverspending ? "أكثر" : "أقل"} من الشهر الماضي</span>
            </div>
          </CardContent>
        </Card>
        <SalaryCard />
      </div>
      {/* Financial Calendar */}
      <div className="grid grid-cols-1 gap-6">
        <FinancialCalendarCard />
      </div>
      {/* CommitmentsBreakdown (left, 3/4) + stat mini-cards (right, 1/4) */}
      <div className="grid grid-cols-4 gap-6">
        {/* Right column: two stat cards stacked (DOM-first = visual right in RTL) */}
        <div className="flex flex-col gap-4">
          <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                الفئة الأكثر استهلاكاً
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <div className="text-xl font-bold text-foreground mb-1 truncate max-w-full">
                {summary?.topCategory || "لا يوجد"}
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>انتبه لهذه الفئة!</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                <Info className="w-4 h-4 text-chart-3" />
                الأعباء الثابتة من الراتب
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <div className="text-xl font-bold text-foreground mb-1">
                {(() => {
                  const salary = profile?.monthlySalary ? Number(profile.monthlySalary) : 0;
                  const fixed = (summary?.commitmentsTotal ?? 0) + (balance?.subscriptionsMonthly ?? 0);
                  if (!salary || !fixed) return "—";
                  return `${Math.min(100, Math.round((fixed / salary) * 100))}%`;
                })()}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground/70">التزامات + اشتراكات</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>يُنصح ألا تتجاوز 50%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Left column: CommitmentsBreakdownCard (takes 3/4 of the row) */}
        <div className="col-span-3">
          <CommitmentsBreakdownCard />
        </div>
      </div>

      {/* Monthly Trend + Loan Simulator side by side */}
      <div className="grid grid-cols-3 gap-6 items-stretch" dir="ltr">
        {/* LEFT: Monthly Trend chart (wider – 2/3) */}
        <Card className="col-span-2 rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col" dir="rtl">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">النمط الشهري</CardTitle>
            <CardDescription>تتبع صرفياتك خلال الأشهر الماضية</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center p-6 min-h-[340px]">
            {loadingTrend ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : trendChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendChart} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", fill: "hsl(var(--foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", fill: "hsl(var(--foreground))" }} />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [
                      formatMoney(value, displayCurrency),
                      name === "total" ? "الإجمالي" : PRIORITY_LABELS[name as keyof typeof PRIORITY_LABELS] || name,
                    ]}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                  />
                  <Legend
                    formatter={(value) => <span className="text-foreground font-medium pr-2">{value === "total" ? "الإجمالي" : PRIORITY_LABELS[value as keyof typeof PRIORITY_LABELS] || value}</span>}
                    iconType="circle"
                  />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--foreground))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="essential" stroke={PRIORITY_COLORS.essential} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="important" stroke={PRIORITY_COLORS.important} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="luxury" stroke={PRIORITY_COLORS.luxury} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground text-center">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Loan Simulator */}
        <LoanSimulatorCard />
      </div>
    </div>
  );
}
