import { useState, useMemo } from "react";
import { useGetBalanceSummary, useGetAccumulatedSavings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { PieChart, Pie, Cell } from "recharts";
import { Landmark, Sparkles } from "lucide-react";

/* ─── Gauge palette — brand-aligned ───────────────────────────────
   red (danger) → orange → brand-gold → teal → brand-emerald (safe)   */
const GAUGE_SEGMENTS = [
  { value: 20, color: "#ef4444" },   // منخفض جداً
  { value: 20, color: "#f97316" },   // منخفض
  { value: 20, color: "#f59e0b" },   // متوسط  (brand accent gold)
  { value: 20, color: "#0d9488" },   // جيد    (teal)
  { value: 20, color: "#1B7E63" },   // عالٍ   (brand emerald)
];

/* ─── Fixed gauge canvas ──────────────────────────────────────────
   Both PieChart and SVG needle share EXACTLY these pixel dimensions.
   Any change here must be reflected in both.                        */
const G_W  = 200;   // canvas width
const G_H  = 110;   // canvas height (only top arc is visible)
const G_CX = 100;   // donut centre x
const G_CY = 106;   // donut centre y (near bottom of canvas)
const G_OR = 92;    // outer radius
const G_IR = 50;    // inner radius
const G_NL = 80;    // needle length (falls inside the ring)

/* ─── Score 0-100 ─────────────────────────────────────────────────
   Three weighted factors:
     50 pts  Affordability  – how comfortably the monthly payment fits disposable income
     30 pts  Debt ratio     – total fixed obligations vs salary after adding the loan
     20 pts  Savings buffer – savings as a multiple of monthly salary                */
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
  const pmt = loanAmount / durationMonths;

  // 1. Affordability (50 pts)
  const disposable = projectedRemaining;
  const afford = disposable > 0 ? Math.max(0, 1 - pmt / disposable) : 0;

  // 2. Debt ratio after loan (30 pts); 0 pts when ratio ≥ 55%
  const totalFixed = commitmentsTotal + subscriptionsMonthly + pmt;
  const debtRatio  = totalFixed / Math.max(salary, 1);
  const debt = Math.max(0, (0.55 - debtRatio) / 0.55);

  // 3. Savings buffer (20 pts); full at ≥ 3 months salary
  const savings = Math.min(1, totalSavings / Math.max(salary * 3, 1));

  return Math.round(Math.min(100, Math.max(0, afford * 50 + debt * 30 + savings * 20)));
}

/* ─── Eligibility label – colours match gauge bands ───────────────
   < 40  → منخفضة  (red / orange zone)
   40-69 → متوسطة  (gold zone)
   ≥ 70  → عالية   (teal / emerald zone)                           */
function eligibilityInfo(score: number) {
  if (score >= 70) return { label: "مؤهليتك عالية",    color: "#1B7E63", bg: "bg-emerald-50/80 border-emerald-200" };
  if (score >= 40) return { label: "مؤهليتك متوسطة",  color: "#d97706", bg: "bg-amber-50/80  border-amber-200"   };
  return              { label: "مؤهليتك منخفضة",  color: "#dc2626", bg: "bg-red-50/80    border-red-200"     };
}

/* ─── Needle tip (standard math → SVG coord) ─────────────────────
   score 0 → left (red); score 100 → right (emerald)               */
function needleTip(score: number) {
  const rad = ((180 - (score / 100) * 180) * Math.PI) / 180;
  return {
    x: G_CX + G_NL * Math.cos(rad),
    y: G_CY - G_NL * Math.sin(rad),
  };
}

/* ─── Component ──────────────────────────────────────────────────── */
export function LoanSimulatorCard() {
  const { data: balance, isLoading: lb } = useGetBalanceSummary();
  const { data: savings, isLoading: ls } = useGetAccumulatedSavings();
  const { format, baseCurrency }         = useDisplayCurrency();

  const [loanAmount,    setLoanAmount]    = useState(5_000);
  const [durationMonths, setDuration]     = useState(24);

  const salary    = balance?.monthlySalary       ?? 0;
  const cTotal    = balance?.commitmentsTotal     ?? 0;
  const subsMo    = balance?.subscriptionsMonthly ?? 0;
  const projected = balance?.projectedRemaining   ?? 0;
  const saved     = savings?.totalSavings         ?? 0;

  const score = useMemo(
    () => calcScore(salary, cTotal, subsMo, projected, saved, loanAmount, durationMonths),
    [salary, cTotal, subsMo, projected, saved, loanAmount, durationMonths]
  );

  const pmt        = loanAmount / Math.max(durationMonths, 1);
  const disposable = Math.max(0, projected);
  const pctOfDisp  = disposable > 0 ? Math.round((pmt / disposable) * 100) : null;
  const info       = eligibilityInfo(score);
  const tip        = needleTip(score);
  const hasSalary  = salary > 0;

  if (lb || ls) return <Skeleton className="h-full w-full min-h-[340px] rounded-3xl" />;

  return (
    <Card
      className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col h-full"
      dir="rtl"
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          <Landmark className="w-3.5 h-3.5 text-primary shrink-0" />
          محاكي القدرة على الاقتراض
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 px-4 pb-4 pt-0 flex flex-col gap-2">
        {!hasSalary ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground text-sm">
            <Landmark className="w-8 h-8 opacity-20" />
            <p className="text-xs">أضف راتبك في الإعدادات لتفعيل المحاكي</p>
          </div>
        ) : (
          <>
            {/* ── Gauge ─────────────────────────────────────────────── */}
            <div className="mx-auto" style={{ position: "relative", width: G_W, height: G_H }}>
              {/* Half-donut */}
              <PieChart width={G_W} height={G_H + 8} style={{ overflow: "visible" }}>
                <Pie
                  data={GAUGE_SEGMENTS}
                  startAngle={180}
                  endAngle={0}
                  innerRadius={G_IR}
                  outerRadius={G_OR}
                  dataKey="value"
                  cx={G_CX}
                  cy={G_CY}
                  isAnimationActive={false}
                  paddingAngle={1}
                  strokeWidth={0}
                >
                  {GAUGE_SEGMENTS.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
              </PieChart>

              {/* Needle overlay – same origin as PieChart (G_CX, G_CY) */}
              <svg
                width={G_W}
                height={G_H + 8}
                style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}
              >
                {/* Needle */}
                <line
                  x1={G_CX} y1={G_CY}
                  x2={tip.x.toFixed(2)} y2={tip.y.toFixed(2)}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Pivot */}
                <circle cx={G_CX} cy={G_CY} r={6} fill="hsl(var(--foreground))" />

                {/* Score inside the ring hole */}
                <text
                  x={G_CX} y={G_CY - G_IR + 8}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={15} fontWeight="800"
                  fill="hsl(var(--foreground))"
                >
                  {score}
                </text>
                <text
                  x={G_CX} y={G_CY - G_IR + 22}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={8}
                  fill="hsl(var(--muted-foreground))"
                >
                  / 100
                </text>

                {/* Arc endpoint labels */}
                <text x={6}       y={G_CY + 3} textAnchor="middle" fontSize={9} fill="#ef4444" fontWeight="700">منخفض</text>
                <text x={G_W - 6} y={G_CY + 3} textAnchor="middle" fontSize={9} fill="#1B7E63" fontWeight="700">عالٍ</text>
              </svg>
            </div>

            {/* ── Eligibility badge ──────────────────────────────────── */}
            <div
              className={`text-center text-xs font-bold py-1 px-3 rounded-xl border ${info.bg}`}
              style={{ color: info.color }}
            >
              {info.label}
            </div>

            {/* ── Monthly payment insight ────────────────────────────── */}
            <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1 flex-wrap leading-tight">
              <Sparkles className="w-2.5 h-2.5 text-accent shrink-0" />
              <span>
                القسط:{" "}
                <span className="font-semibold text-foreground">{format(pmt, baseCurrency)}</span>
                {pctOfDisp !== null && <span> — {pctOfDisp}% من دخلك المتاح</span>}
                {projected <= 0 && <span className="text-red-500"> · دخلك المتاح سلبي</span>}
              </span>
            </div>

            {/* ── Sliders ────────────────────────────────────────────── */}
            <div className="space-y-2.5">
              {/* Loan Amount */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">مقدار القرض</span>
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    {format(loanAmount, baseCurrency)}
                  </span>
                </div>
                <input
                  type="range" min={500} max={100000} step={500}
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary"
                  dir="ltr"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground/50">
                  <span>500</span><span>100,000</span>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">المدة</span>
                  <span className="text-xs font-bold text-foreground">{durationMonths} شهر</span>
                </div>
                <input
                  type="range" min={6} max={120} step={6}
                  value={durationMonths}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary"
                  dir="ltr"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground/50">
                  <span>6 أشهر</span><span>120 شهر</span>
                </div>
              </div>
            </div>

            {/* ── Suggestion ────────────────────────────────────────── */}
            {score < 40 && (
              <div className="text-[10px] text-muted-foreground bg-muted/40 rounded-xl px-2.5 py-1.5 text-center leading-snug">
                {projected <= 0
                  ? "💡 نفقاتك تتجاوز دخلك — راجع ميزانيتك أولاً"
                  : "💡 جرّب تمديد المدة أو تخفيض مبلغ القرض"}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
