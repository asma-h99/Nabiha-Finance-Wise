import {
  useGetDashboardSummary,
  useGetPriorityBreakdown,
  useGetCategoryBreakdown,
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
  BarChart,
  Bar,
  Cell,
} from "recharts";
import happyMascot from "@assets/Gemini_Generated_Image_d3nzkdd3nzkdd3nz_1777144269395.png";
import { SalaryCard } from "@/components/dashboard/SalaryCard";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { SavingsCard } from "@/components/dashboard/SavingsCard";
import { FinancialCalendarCard } from "@/components/dashboard/FinancialCalendarCard";
import { CommitmentsBreakdownCard } from "@/components/dashboard/CommitmentsBreakdownCard";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { formatMoney } from "@/lib/currency";
import { useMemo } from "react";

// Cohesive financial palette anchored to brand emerald with warm gold accents
const COLORS = [
  "#1B7E63", // brand emerald
  "#0d9488", // teal
  "#10b981", // mint
  "#f59e0b", // warm gold (accent)
  "#047857", // forest
  "#0891b2", // ocean
  "#84cc16", // lime sage
];
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
  const { data: priorityData, isLoading: loadingPriority } = useGetPriorityBreakdown({ month: currentMonth });
  const { data: categoryData, isLoading: loadingCategory } = useGetCategoryBreakdown({ month: currentMonth });
  const { data: trendData, isLoading: loadingTrend } = useGetMonthlyTrend();

  const { format, convert, displayCurrency, baseCurrency } = useDisplayCurrency();

  // Pre-convert chart values into the display currency so axes/bars match tooltips.
  const priorityChart = useMemo(
    () => (priorityData ?? []).map((d) => ({ ...d, total: convert(d.total, baseCurrency) })),
    [priorityData, convert, baseCurrency],
  );
  const categoryChart = useMemo(
    () => (categoryData ?? []).map((d) => ({ ...d, total: convert(d.total, baseCurrency) })),
    [categoryData, convert, baseCurrency],
  );
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
      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm">
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

        <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
              <Info className="w-4 h-4 text-chart-3" />
              نسبة الالتزامات من الراتب
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <div className="text-xl font-bold text-foreground mb-1">
              {profile?.monthlySalary && summary?.commitmentsTotal
                ? `${Math.min(100, Math.round((summary.commitmentsTotal / profile.monthlySalary) * 100))}%`
                : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>يُنصح ألا تتجاوز 50% من الراتب</span>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Charts Row — in RTL the first grid item appears on visual RIGHT,
          so we render Category Breakdown first and CommitmentsBreakdown second
          to put the donut on the visual LEFT and the bar chart on the visual RIGHT. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown — visual RIGHT */}
        <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-bold">الإنفاق حسب الفئة</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">أين تذهب صرفياتك الشهرية؟</CardDescription>
          </CardHeader>

          <CardContent className="flex-1 p-4 space-y-4">
            {loadingCategory ? (
              <Skeleton className="w-full h-[300px] rounded-2xl" />
            ) : categoryChart.length > 0 ? (
              <>
                {/* Horizontal bar chart */}
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryChart}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                      barCategoryGap="30%"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.5)" />
                      <XAxis
                        type="number"
                        hide
                      />
                      <YAxis
                        dataKey="categoryName"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        width={72}
                        tick={{ fontSize: 12, fill: "hsl(var(--foreground))", fontFamily: "var(--font-sans)" }}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                        formatter={(value: number) => [formatMoney(value, displayCurrency), "الإنفاق"]}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          direction: "rtl",
                        }}
                      />
                      <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={20}>
                        {categoryChart.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary legend rows */}
                <div className="space-y-2" dir="rtl">
                  {categoryChart.slice(0, 4).map((entry, index) => {
                    const totalSpend = categoryChart.reduce((s, e) => s + e.total, 0);
                    const pct = totalSpend > 0 ? Math.round((entry.total / totalSpend) * 100) : 0;
                    return (
                      <div
                        key={entry.categoryName}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-2xl border border-border/60 bg-background/70"
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="flex-1 text-sm font-medium text-foreground truncate">{entry.categoryName}</span>
                        <span className="text-xs text-muted-foreground font-bold tabular-nums">{pct}%</span>
                        <span className="font-bold text-sm tabular-nums shrink-0">
                          {formatMoney(entry.total, displayCurrency)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Total spending row */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-border bg-muted/30">
                    <span className="w-3 h-3 rounded-full bg-foreground shrink-0" />
                    <span className="flex-1 font-bold text-sm text-foreground">إجمالي الإنفاق</span>
                    <span className="font-bold text-sm tabular-nums">
                      {formatMoney(categoryChart.reduce((s, e) => s + e.total, 0), displayCurrency)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm text-center gap-2">
                <Wallet className="w-10 h-10 opacity-20" />
                <p>لا توجد صرفيات مسجّلة لهذا الشهر</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commitments Breakdown — visual LEFT */}
        <CommitmentsBreakdownCard />

        {/* Monthly Trend */}
        <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">النمط الشهري</CardTitle>
            <CardDescription>تتبع صرفياتك خلال الأشهر الماضية</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center p-6 min-h-[300px]">
            {loadingTrend ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : trendChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendChart} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
      </div>
    </div>
  );
}
