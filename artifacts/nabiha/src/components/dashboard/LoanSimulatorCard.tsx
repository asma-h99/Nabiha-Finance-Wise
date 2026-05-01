import { useState, useMemo } from "react";
import { useGetBalanceSummary } from "@workspace/api-client-react";
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

/* ─── Verdict type ────────────────────────────────────────────────── */
type Verdict = "safe" | "risky" | "dangerous";

/* ─── Derive verdict from formula ────────────────────────────────────
   availableIncome = salary − subscriptionsMonthly − commitmentsTotal
   safeLimit       = availableIncome × 30%
   pmt             = loanAmount / durationMonths

   Safe      → pmt < safeLimit
   Risky     → safeLimit ≤ pmt ≤ availableIncome
   Dangerous → pmt > availableIncome  OR  availableIncome ≤ 0         */
function calcVerdict(
  availableIncome: number,
  safeLimit: number,
  pmt: number
): Verdict {
  if (availableIncome <= 0) return "dangerous";
  if (pmt < safeLimit) return "safe";
  if (pmt <= availableIncome) return "risky";
  return "dangerous";
}

/* ─── Gauge score 0-100 derived from new formula ─────────────────────
   pmt = 0            → 100
   pmt = safeLimit    → 50
   pmt = availableIncome → 0
   pmt > availableIncome → 0
   availableIncome ≤ 0  → 0
   Linear interpolation in each segment.                              */
function calcGaugeScore(
  availableIncome: number,
  safeLimit: number,
  pmt: number
): number {
  if (availableIncome <= 0 || pmt <= 0) {
    return availableIncome <= 0 ? 0 : 100;
  }
  if (pmt >= availableIncome) return 0;
  if (pmt >= safeLimit) {
    const range = availableIncome - safeLimit;
    if (range <= 0) return 0;
    return Math.round(50 * (1 - (pmt - safeLimit) / range));
  }
  return Math.round(100 - 50 * (pmt / safeLimit));
}

/* ─── Eligibility label — Safe / Risky / Dangerous ───────────────── */
function verdictInfo(verdict: Verdict) {
  if (verdict === "safe")      return { label: "✅ آمن",      color: "#1B7E63", bg: "bg-emerald-50/80 border-emerald-200" };
  if (verdict === "risky")     return { label: "⚠️ مخاطرة",  color: "#d97706", bg: "bg-amber-50/80  border-amber-200"   };
  return                              { label: "🚨 خطر",      color: "#dc2626", bg: "bg-red-50/80    border-red-200"     };
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
  const { format, baseCurrency }         = useDisplayCurrency();

  const [loanAmount,    setLoanAmount]    = useState(5_000);
  const [durationMonths, setDuration]     = useState(24);

  const salary  = balance?.monthlySalary       ?? 0;
  const cTotal  = balance?.commitmentsTotal     ?? 0;
  const subsMo  = balance?.subscriptionsMonthly ?? 0;

  const availableIncome = salary - subsMo - cTotal;
  const safeLimit       = availableIncome * 0.3;
  const pmt             = loanAmount / Math.max(durationMonths, 1);

  const verdict = useMemo(
    () => calcVerdict(availableIncome, safeLimit, pmt),
    [availableIncome, safeLimit, pmt]
  );

  const gaugeScore = useMemo(
    () => calcGaugeScore(availableIncome, safeLimit, pmt),
    [availableIncome, safeLimit, pmt]
  );

  const pctOfAvail = availableIncome > 0 ? Math.round((pmt / availableIncome) * 100) : null;
  const info       = verdictInfo(verdict);
  const tip        = needleTip(gaugeScore);
  const hasSalary  = salary > 0;

  if (lb) return <Skeleton className="h-full w-full min-h-[340px] rounded-3xl" />;

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
                  {gaugeScore}
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
                <text x={6}       y={G_CY + 3} textAnchor="middle" fontSize={9} fill="#ef4444" fontWeight="700">خطر</text>
                <text x={G_W - 6} y={G_CY + 3} textAnchor="middle" fontSize={9} fill="#1B7E63" fontWeight="700">آمن</text>
              </svg>
            </div>

            {/* ── Verdict badge ──────────────────────────────────────── */}
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
                {" "}لمدة{" "}
                <span className="font-semibold text-foreground">{durationMonths} شهر</span>
                {pctOfAvail !== null && <span> — {pctOfAvail}% من دخلك المتاح</span>}
                {availableIncome <= 0 && <span className="text-red-500"> · دخلك المتاح سلبي</span>}
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
            {(verdict === "risky" || verdict === "dangerous") && (
              <div className="text-[10px] text-muted-foreground bg-muted/40 rounded-xl px-2.5 py-1.5 text-center leading-snug">
                {availableIncome <= 0
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
