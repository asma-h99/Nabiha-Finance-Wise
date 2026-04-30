import { useState, useMemo } from "react";
import { useGetBalanceSummary, useGetAccumulatedSavings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { PieChart, Pie, Cell } from "recharts";
import { Landmark, Sparkles } from "lucide-react";

/* ─── Gauge config ─────────────────────────────────────────────── */
// 5 equal segments: red → orange → yellow → lime → green
const GAUGE_SEGMENTS = [
  { value: 20, color: "#ef4444" },
  { value: 20, color: "#f97316" },
  { value: 20, color: "#eab308" },
  { value: 20, color: "#84cc16" },
  { value: 20, color: "#22c55e" },
];

// Fixed gauge dimensions – both PieChart and SVG needle use these exact values
const G_W = 240;   // total width of the gauge canvas
const G_H = 135;   // total height (only the top semicircle is visible)
const G_CX = 120;  // x of the donut centre (horizontally centred)
const G_CY = 128;  // y of the donut centre – sits just below the visible arc
const G_OUTER = 100;
const G_INNER = 56;
const G_NEEDLE = 88; // needle length (between inner and outer radii)

/* ─── Score calculation (0–100) ────────────────────────────────── */
function calcScore(
  salary: number,
  commitmentsTotal: number,
  subscriptionsMonthly: number,
  projectedRemaining: number,
  totalSavings: number,
  loanAmount: number,
  durationMonths: number
): number {
  if (!salary || !durationMonths || loanAmount <= 0) return 0;

  const monthlyPayment = loanAmount / durationMonths;
  const disposable = projectedRemaining; // can be negative (already in deficit)

  // ── 1. Affordability (50 pts): how comfortably can monthly payment be covered?
  //      Full marks if payment ≤ 30% of disposable; 0 if disposable ≤ 0 or payment ≥ disposable
  let affordability = 0;
  if (disposable > 0) {
    affordability = Math.max(0, 1 - monthlyPayment / disposable);
  }

  // ── 2. Total debt ratio after loan (30 pts): total fixed obligations vs salary
  //      < 35% = great, ≥ 55% = 0 pts
  const totalFixed = commitmentsTotal + subscriptionsMonthly + monthlyPayment;
  const debtRatio = totalFixed / Math.max(salary, 1);
  const debtScore = Math.max(0, (0.55 - debtRatio) / 0.55); // linear: 0.55→0, 0→1

  // ── 3. Savings buffer (20 pts): savings ≥ 3 months salary = full marks
  const savingsScore = Math.min(1, totalSavings / Math.max(salary * 3, 1));

  const raw = affordability * 50 + debtScore * 30 + savingsScore * 20;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

/* ─── Eligibility labels aligned with gauge colour bands ────────── */
// Gauge segments: 0-20 red, 20-40 orange, 40-60 yellow, 60-80 lime, 80-100 green
// Labels: < 40 = low (red zone), 40–70 = medium (yellow zone), > 70 = high (green zone)
function getEligibilityInfo(score: number) {
  if (score >= 70)
    return { label: "مؤهليتك عالية", color: "#22c55e", bgColor: "bg-green-50 border-green-200" };
  if (score >= 40)
    return { label: "مؤهليتك متوسطة", color: "#eab308", bgColor: "bg-yellow-50 border-yellow-200" };
  return { label: "مؤهليتك منخفضة", color: "#ef4444", bgColor: "bg-red-50 border-red-100" };
}

/* ─── Needle position ──────────────────────────────────────────── */
// score 0 → angle 180° (left, red); score 100 → angle 0° (right, green)
// Standard math convention, then flip y for SVG
function needleCoords(score: number) {
  const angleDeg = 180 - (score / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: G_CX + G_NEEDLE * Math.cos(angleRad),
    y: G_CY - G_NEEDLE * Math.sin(angleRad), // minus = SVG y-flip
  };
}

/* ─── Component ─────────────────────────────────────────────────── */
export function LoanSimulatorCard() {
  const { data: balance, isLoading: loadingB } = useGetBalanceSummary();
  const { data: savings, isLoading: loadingS } = useGetAccumulatedSavings();
  const { format, baseCurrency } = useDisplayCurrency();

  const [loanAmount, setLoanAmount] = useState(5000);
  const [durationMonths, setDurationMonths] = useState(24);

  const salary               = balance?.monthlySalary          ?? 0;
  const commitmentsTotal     = balance?.commitmentsTotal        ?? 0;
  const subscriptionsMonthly = balance?.subscriptionsMonthly    ?? 0;
  const projectedRemaining   = balance?.projectedRemaining      ?? 0;
  const totalSavings         = savings?.totalSavings            ?? 0;

  const score = useMemo(
    () => calcScore(salary, commitmentsTotal, subscriptionsMonthly, projectedRemaining, totalSavings, loanAmount, durationMonths),
    [salary, commitmentsTotal, subscriptionsMonthly, projectedRemaining, totalSavings, loanAmount, durationMonths]
  );

  const monthlyPayment = loanAmount / Math.max(durationMonths, 1);
  const disposable     = Math.max(0, projectedRemaining);
  const paymentPct     = disposable > 0 ? Math.round((monthlyPayment / disposable) * 100) : null;
  const eligibility    = getEligibilityInfo(score);
  const needle         = needleCoords(score);
  const hasSalary      = salary > 0;

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
            {/* ── Gauge: fixed-width wrapper so needle SVG shares the same coordinate origin ── */}
            <div
              className="mx-auto"
              style={{ position: "relative", width: G_W, height: G_H }}
            >
              {/* Recharts half-donut */}
              <PieChart width={G_W} height={G_H + 10} style={{ overflow: "visible" }}>
                <Pie
                  data={GAUGE_SEGMENTS}
                  startAngle={180}
                  endAngle={0}
                  innerRadius={G_INNER}
                  outerRadius={G_OUTER}
                  dataKey="value"
                  cx={G_CX}
                  cy={G_CY}
                  isAnimationActive={false}
                  paddingAngle={1}
                  strokeWidth={0}
                >
                  {GAUGE_SEGMENTS.map((seg, i) => (
                    <Cell key={i} fill={seg.color} />
                  ))}
                </Pie>
              </PieChart>

              {/* Needle – same coordinate space as PieChart (G_CX, G_CY) */}
              <svg
                width={G_W}
                height={G_H + 10}
                style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}
              >
                {/* Needle line */}
                <line
                  x1={G_CX}
                  y1={G_CY}
                  x2={needle.x.toFixed(2)}
                  y2={needle.y.toFixed(2)}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                />
                {/* Pivot dot */}
                <circle cx={G_CX} cy={G_CY} r={7} fill="hsl(var(--foreground))" />
                {/* Score label at the centre of the donut */}
                <text
                  x={G_CX}
                  y={G_CY - G_INNER + 4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={13}
                  fontWeight="700"
                  fill="hsl(var(--foreground))"
                >
                  {score}
                </text>
                <text
                  x={G_CX}
                  y={G_CY - G_INNER + 18}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  fill="hsl(var(--muted-foreground))"
                >
                  / 100
                </text>

                {/* Low / High labels at the ends of the arc */}
                <text x={8} y={G_CY + 4} textAnchor="middle" fontSize={10} fill="#ef4444" fontWeight="600">منخفض</text>
                <text x={G_W - 8} y={G_CY + 4} textAnchor="middle" fontSize={10} fill="#22c55e" fontWeight="600">عالٍ</text>
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
            <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1 flex-wrap">
              <Sparkles className="w-3 h-3 text-accent shrink-0" />
              <span>
                القسط الشهري:{" "}
                <span className="font-semibold text-foreground">{format(monthlyPayment, baseCurrency)}</span>
                {paymentPct !== null && (
                  <span className="text-muted-foreground"> — {paymentPct}% من دخلك المتاح</span>
                )}
                {projectedRemaining <= 0 && (
                  <span className="text-red-500"> · دخلك المتاح سلبي حالياً</span>
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
                  min={500}
                  max={100000}
                  step={500}
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                  dir="ltr"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/60">
                  <span>500</span>
                  <span>100,000</span>
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
            {score < 40 && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-2xl px-3 py-2 text-center">
                💡 {projectedRemaining <= 0
                  ? "نفقاتك الحالية تتجاوز دخلك — راجع ميزانيتك أولاً"
                  : "جرّب تمديد المدة أو تخفيض مبلغ القرض لتحسين المؤهلية"}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
