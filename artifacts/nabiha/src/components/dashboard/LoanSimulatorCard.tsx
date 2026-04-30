import { useState, useMemo } from "react";
import { useGetBalanceSummary, useGetAccumulatedSavings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { PieChart, Pie, Cell } from "recharts";
import { Landmark, Sparkles } from "lucide-react";

const GAUGE_SEGMENTS = [
  { value: 20, color: "#ef4444" },
  { value: 20, color: "#f97316" },
  { value: 20, color: "#eab308" },
  { value: 20, color: "#84cc16" },
  { value: 20, color: "#22c55e" },
];

function calcScore(
  salary: number,
  commitmentsTotal: number,
  subscriptionsMonthly: number,
  projectedRemaining: number,
  totalSavings: number,
  loanAmount: number,
  durationMonths: number
): number {
  if (!salary || !durationMonths) return 0;
  const monthlyPayment = loanAmount / durationMonths;
  const disposable = Math.max(0, projectedRemaining);

  const paymentAffordability = disposable > 0 ? monthlyPayment / disposable : 1;
  const newDebtRatio =
    (commitmentsTotal + subscriptionsMonthly + monthlyPayment) / Math.max(salary, 1);
  const savingsBonus = Math.min(20, (totalSavings / Math.max(salary, 1)) * 10);

  const affordabilityScore = Math.max(0, 1 - Math.min(1, paymentAffordability)) * 40;
  const debtScore = Math.max(0, 1 - newDebtRatio / 0.5) * 40;

  return Math.round(Math.min(100, affordabilityScore + debtScore + savingsBonus));
}

function getEligibilityInfo(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 67)
    return { label: "مؤهليتك عالية", color: "#22c55e", bgColor: "bg-green-50 border-green-200" };
  if (score >= 34)
    return {
      label: "مؤهليتك متوسطة",
      color: "#eab308",
      bgColor: "bg-yellow-50 border-yellow-200",
    };
  return { label: "مؤهليتك منخفضة", color: "#ef4444", bgColor: "bg-red-50 border-red-100" };
}

export function LoanSimulatorCard() {
  const { data: balance, isLoading: loadingB } = useGetBalanceSummary();
  const { data: savings, isLoading: loadingS } = useGetAccumulatedSavings();
  const { format, baseCurrency } = useDisplayCurrency();

  const [loanAmount, setLoanAmount] = useState(5000);
  const [durationMonths, setDurationMonths] = useState(24);

  const salary = balance?.monthlySalary ?? 0;
  const commitmentsTotal = balance?.commitmentsTotal ?? 0;
  const subscriptionsMonthly = balance?.subscriptionsMonthly ?? 0;
  const projectedRemaining = balance?.projectedRemaining ?? 0;
  const totalSavings = savings?.totalSavings ?? 0;

  const score = useMemo(
    () =>
      calcScore(
        salary,
        commitmentsTotal,
        subscriptionsMonthly,
        projectedRemaining,
        totalSavings,
        loanAmount,
        durationMonths
      ),
    [salary, commitmentsTotal, subscriptionsMonthly, projectedRemaining, totalSavings, loanAmount, durationMonths]
  );

  const monthlyPayment = loanAmount / durationMonths;
  const disposable = Math.max(0, projectedRemaining);
  const paymentPct = disposable > 0 ? Math.round((monthlyPayment / disposable) * 100) : 100;
  const eligibility = getEligibilityInfo(score);

  const needleAngleRad = ((180 - (score / 100) * 180) * Math.PI) / 180;
  const cx = 130;
  const cy = 135;
  const needleLength = 82;
  const needleX = cx + needleLength * Math.cos(needleAngleRad);
  const needleY = cy - needleLength * Math.sin(needleAngleRad);

  const hasSalary = salary > 0;

  if (loadingB || loadingS) {
    return <Skeleton className="h-full w-full min-h-[360px] rounded-3xl" />;
  }

  return (
    <Card
      className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col h-full"
      dir="rtl"
    >
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Landmark className="w-4 h-4 text-primary" />
          محاكي القدرة على الاقتراض
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-4 flex flex-col gap-3">
        {!hasSalary ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-8 text-muted-foreground text-sm">
            <Landmark className="w-10 h-10 opacity-20" />
            <p>أضف راتبك الشهري في الإعدادات لتفعيل المحاكي</p>
          </div>
        ) : (
          <>
            {/* Gauge */}
            <div className="relative flex justify-center" style={{ height: 148 }}>
              <PieChart width={260} height={148}>
                <Pie
                  data={GAUGE_SEGMENTS}
                  startAngle={180}
                  endAngle={0}
                  innerRadius={58}
                  outerRadius={108}
                  dataKey="value"
                  cx={130}
                  cy={135}
                  isAnimationActive={false}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {GAUGE_SEGMENTS.map((seg, i) => (
                    <Cell key={i} fill={seg.color} />
                  ))}
                </Pie>
              </PieChart>

              {/* Needle overlay */}
              <svg
                width={260}
                height={148}
                style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
              >
                <line
                  x1={cx}
                  y1={cy}
                  x2={needleX.toFixed(1)}
                  y2={needleY.toFixed(1)}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={7}
                  fill="hsl(var(--foreground))"
                />
              </svg>
            </div>

            {/* Eligibility label */}
            <div
              className={`text-center text-sm font-bold py-1.5 px-3 rounded-2xl border ${eligibility.bgColor}`}
              style={{ color: eligibility.color }}
            >
              {eligibility.label}
            </div>

            {/* Monthly payment insight */}
            <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-accent shrink-0" />
              <span>
                القسط الشهري:{" "}
                <span className="font-semibold text-foreground">
                  {format(monthlyPayment, baseCurrency)}
                </span>
                {disposable > 0 && (
                  <span className="text-muted-foreground"> — {paymentPct}% من دخلك المتاح</span>
                )}
              </span>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-1">
              {/* Loan Amount */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">مقدار القرض</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {format(loanAmount, baseCurrency)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={50000}
                  step={500}
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                  dir="ltr"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/60">
                  <span>1,000</span>
                  <span>50,000</span>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">المدة</span>
                  <span className="text-sm font-bold text-foreground">
                    {durationMonths} شهر
                  </span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={120}
                  step={6}
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                  dir="ltr"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/60">
                  <span>6 أشهر</span>
                  <span>120 شهر</span>
                </div>
              </div>
            </div>

            {/* Suggestion */}
            {score < 40 && disposable > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-2xl px-3 py-2 text-center">
                💡 جرّب تمديد المدة أو تخفيض مبلغ القرض لتحسين المؤهلية
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
