import {
  useGetDashboardSummary,
  useGetMonthlyTrend,
  useGetSubscriptionsBreakdown,
  useGetProfile,
} from "@workspace/api-client-react";
import { formatAmount } from "@/lib/currency";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Wallet,
  Repeat,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Coins,
} from "lucide-react";
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
  Tooltip,
} from "recharts";

import happyMascot from "@assets/Gemini_Generated_Image_d3nzkdd3nzkdd3nz_1777144269395.png";

const LEFTOVER_COLOR = "#0F8F87";
const SUBS_COLOR = "#7C3AED";
const COMMITMENTS_COLOR = "#F97316";
const EXPENSES_COLOR = "#EC4899";

export default function Dashboard() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: profile } = useGetProfile();
  const currency = profile?.currency ?? "JOD";
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    month: currentMonth,
  });
  const { data: trendData, isLoading: loadingTrend } = useGetMonthlyTrend();
  const { data: subsBreakdown } = useGetSubscriptionsBreakdown();

  if (loadingSummary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  const salary = summary?.monthlySalary ?? 0;
  const subsMonthly = subsBreakdown?.monthlyTotal ?? summary?.subscriptionsTotal ?? 0;
  const commitmentsMonthly = summary?.commitmentsTotal ?? 0;
  const expensesThisMonth = summary?.totalThisMonth ?? 0;
  const consumed = subsMonthly + commitmentsMonthly + expensesThisMonth;
  const leftover = Math.max(salary - consumed, 0);
  const overspent = salary > 0 && consumed > salary;
  const leftoverPct = salary > 0 ? (leftover / salary) * 100 : 0;

  const donutData =
    salary > 0
      ? [
          { name: "اشتراكات", value: subsMonthly, color: SUBS_COLOR },
          { name: "التزامات", value: commitmentsMonthly, color: COMMITMENTS_COLOR },
          { name: "مصاريف الشهر", value: expensesThisMonth, color: EXPENSES_COLOR },
          { name: "متبقّي", value: leftover, color: LEFTOVER_COLOR },
        ].filter((d) => d.value > 0)
      : [];

  const lastMonth = summary?.totalLastMonth ?? 0;
  const trendDelta = expensesThisMonth - lastMonth;
  const trendUp = trendDelta > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-l from-primary/10 to-primary/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 border border-primary/10 shadow-sm relative overflow-hidden">
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

        <img
          src={happyMascot}
          alt="Mascot"
          className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-full shadow-lg border-4 border-white dark:border-card z-10"
        />
        <div className="text-center md:text-right z-10 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            أهلاً بك في نَبِيهَة!
          </h1>
          <p className="text-muted-foreground text-lg mb-4">
            هاي صورة سريعة لراتبك وكل التزاماتك واشتراكاتك هذا الشهر.
          </p>

          {summary && summary.unpaidCommitmentsCount > 0 && (
            <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-xl text-sm font-medium border border-destructive/20">
              <AlertCircle className="w-4 h-4" />
              لديك {summary.unpaidCommitmentsCount} التزامات غير مدفوعة
            </div>
          )}
        </div>
      </div>

      {/* Top KPIs: Salary | Active Subs | Remaining Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-white/90">
              الراتب الشهري
            </CardTitle>
            <div className="p-2 bg-white/15 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1" data-testid="text-salary">
              {formatAmount(salary, currency)}
            </div>
            <p className="text-sm text-white/80 mt-2">
              {salary > 0
                ? "هذا دخلك الشهري الأساسي"
                : "أضف راتبك من صفحة الملف الشخصي"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white border-0">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-white/90">
              الاشتراكات الشهرية
            </CardTitle>
            <div className="p-2 bg-white/15 rounded-xl">
              <Repeat className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1" data-testid="text-subs-monthly">
              {formatAmount(subsMonthly, currency)}
            </div>
            <p className="text-sm text-white/80 mt-2">
              {summary?.activeSubscriptionsCount ?? 0} اشتراك نشط
            </p>
          </CardContent>
        </Card>

        <Card
          className={`rounded-3xl text-white border-0 ${
            overspent
              ? "bg-gradient-to-br from-rose-500 to-red-600"
              : "bg-gradient-to-br from-blue-500 to-indigo-600"
          }`}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-white/90">
              الرصيد المتبقي
            </CardTitle>
            <div className="p-2 bg-white/15 rounded-xl">
              <PiggyBank className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1" data-testid="text-leftover">
              {formatAmount(leftover, currency)}
            </div>
            <p className="text-sm text-white/80 mt-2">
              {overspent
                ? "تجاوزت دخلك هذا الشهر"
                : `${leftoverPct.toFixed(0)}% من راتبك`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Donut: Subs vs Commitments vs Expenses vs Leftover */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              توزيع الراتب هذا الشهر
            </CardTitle>
            <CardDescription>
              كيف انقسم راتبك بين الاشتراكات والالتزامات والمصاريف والمتبقّي
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[320px] flex items-center justify-center">
            {donutData.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                {salary === 0
                  ? "أضف راتبك لتشاهد التوزيع"
                  : "لا توجد بيانات كافية بعد"}
              </div>
            ) : (
              <div className="relative w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {donutData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [
                        formatAmount(value, currency),
                        "",
                      ]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-foreground font-medium pr-2">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xs text-muted-foreground">المتبقّي</p>
                  <p
                    className={`text-2xl font-bold ${overspent ? "text-destructive" : "text-primary"}`}
                  >
                    {formatAmount(leftover, currency)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">ملخص سريع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow
              label="اشتراكات"
              value={subsMonthly}
              currency={currency}
              color={SUBS_COLOR}
            />
            <SummaryRow
              label="التزامات شهرية"
              value={commitmentsMonthly}
              currency={currency}
              color={COMMITMENTS_COLOR}
            />
            <SummaryRow
              label="مصاريف الشهر"
              value={expensesThisMonth}
              currency={currency}
              color={EXPENSES_COLOR}
            />
            <div className="border-t pt-3">
              <SummaryRow
                label={overspent ? "تجاوز" : "متبقّي"}
                value={Math.abs(salary - consumed)}
                currency={currency}
                color={overspent ? "#DC2626" : LEFTOVER_COLOR}
                bold
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
              {trendUp ? (
                <TrendingUp className="w-4 h-4 text-rose-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-emerald-600" />
              )}
              <span>
                مصاريف هذا الشهر{" "}
                {trendUp ? "أعلى" : "أقل"}{" "}
                {formatAmount(Math.abs(trendDelta), currency)} عن الشهر الماضي
              </span>
            </div>
            {summary?.activeSubscriptionsCount ? (
              <Badge variant="secondary" className="gap-1 mt-2">
                <Repeat className="w-3 h-3" />
                {summary.activeSubscriptionsCount} اشتراك نشط
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">النمط الشهري للمصاريف</CardTitle>
          <CardDescription>
            تتبّع مجموع مصاريفك خلال الأشهر الماضية
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px]">
          {loadingTrend ? (
            <Skeleton className="w-full h-72 rounded-2xl" />
          ) : trendData && trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={trendData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.875rem",
                    fill: "hsl(var(--foreground))",
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.875rem",
                    fill: "hsl(var(--foreground))",
                  }}
                />
                <RechartsTooltip
                  formatter={(value: number) => [
                    formatAmount(value, currency),
                    "الإجمالي",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-muted-foreground text-center py-12">
              لا توجد بيانات كافية
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  currency,
  color,
  bold,
}: {
  label: string;
  value: number;
  currency: string;
  color: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className={bold ? "font-semibold" : "text-muted-foreground"}>
          {label}
        </span>
      </div>
      <span className={bold ? "text-lg font-bold" : "font-semibold"}>
        {formatAmount(value, currency)}
      </span>
    </div>
  );
}
