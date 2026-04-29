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
  PieChart,
  Pie,
  Cell,
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
} from "recharts";
import happyMascot from "@assets/Gemini_Generated_Image_d3nzkdd3nzkdd3nz_1777144269395.png";
import { SalaryCard } from "@/components/dashboard/SalaryCard";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { FinancialCalendarCard } from "@/components/dashboard/FinancialCalendarCard";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { formatMoney } from "@/lib/currency";
import { useMemo } from "react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
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
      {/* Money KPIs: Salary, Balance, Subscriptions Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <BalanceCard />
        <SalaryCard />
        <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm" data-testid="card-this-month">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              صرفياتي هذا الشهر
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <div className="text-xl md:text-2xl font-bold text-foreground mb-1">
              {format(summary?.totalThisMonth || 0, baseCurrency)}
            </div>
            <div className={`text-xs flex items-center gap-1 mt-2 font-medium ${isOverspending ? "text-destructive" : "text-emerald-600"}`}>
              {isOverspending ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {format(Math.abs((summary?.totalThisMonth || 0) - (summary?.totalLastMonth || 0)), baseCurrency)}{" "}
                {isOverspending ? "أكثر من الشهر الماضي" : "أقل من الشهر الماضي"}
              </span>
            </div>
          </CardContent>
        </Card>
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
              إجمالي الالتزامات
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <div className="text-xl font-bold text-foreground mb-1">
              {format(summary?.commitmentsTotal || 0, baseCurrency)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              منها {summary?.unpaidCommitmentsCount} بانتظار الدفع
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Breakdown */}
        <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">توزيع الأولويات</CardTitle>
            <CardDescription>كيف توزع صرفياتك؟</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center p-6 min-h-[300px]">
            {loadingPriority ? (
              <Skeleton className="w-full h-full rounded-full" />
            ) : priorityChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={priorityChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="total"
                    nameKey="priority"
                  >
                    {priorityChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS] || COLORS[0]} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => [formatMoney(value, displayCurrency), "المبلغ"]}
                    labelFormatter={(label: string) => PRIORITY_LABELS[label as keyof typeof PRIORITY_LABELS] || label}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                  />
                  <Legend
                    formatter={(value) => <span className="text-foreground font-medium pr-2">{PRIORITY_LABELS[value as keyof typeof PRIORITY_LABELS] || value}</span>}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground text-center">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">توزيع الفئات</CardTitle>
            <CardDescription>أين تذهب أموالك؟</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center p-6 min-h-[300px]">
            {loadingCategory ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : categoryChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryChart} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="categoryName" type="category" axisLine={false} tickLine={false} width={80} style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", fill: "hsl(var(--foreground))" }} />
                  <RechartsTooltip
                    cursor={{ fill: "transparent" }}
                    formatter={(value: number) => [formatMoney(value, displayCurrency), "المبلغ"]}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={24}>
                    {categoryChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground text-center">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>

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
