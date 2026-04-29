import { useState } from "react";
import {
  useSimulateBorrowingCapacity,
  useGetProfile,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatAmount } from "@/lib/currency";
import {
  Calculator,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Area,
  AreaChart,
} from "recharts";

type Affordability =
  | "excellent"
  | "safe"
  | "caution"
  | "risky"
  | "very-risky";

const VERDICT_META: Record<
  Affordability,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: LucideIcon;
    msg: string;
  }
> = {
  excellent: {
    label: "آمن جداً",
    color: "text-emerald-800",
    bg: "bg-emerald-50",
    border: "border-emerald-400",
    icon: CheckCircle2,
    msg: "ممتاز! القسط أقل من 15% من دخلك المتاح بعد الاشتراكات. مساحة مريحة.",
  },
  safe: {
    label: "آمن",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-300",
    icon: CheckCircle2,
    msg: "هالقرض ضمن قدرتك. القسط بين 15%-30% من دخلك المتاح بعد الاشتراكات.",
  },
  caution: {
    label: "محفوف بالمخاطر",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    icon: AlertTriangle,
    msg: "حذر — القسط بين 30%-45% من دخلك المتاح. فكّر فيه مرتين.",
  },
  risky: {
    label: "غير موصى به",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-300",
    icon: AlertTriangle,
    msg: "القسط بين 45%-60% من دخلك المتاح. خطر كبير على ميزانيتك.",
  },
  "very-risky": {
    label: "غير ممكن",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-300",
    icon: XCircle,
    msg: "القسط أكثر من 60% من دخلك المتاح. هالقرض غير قابل للتنفيذ.",
  },
};

// Gauge zones: dark-green (very safe) → green → yellow → orange → red (very risky).
// Each spans 36° of the 180° half-circle (5 × 36 = 180).
const GAUGE_ZONES = [
  { color: "#047857", thresholdPct: 15 },
  { color: "#10B981", thresholdPct: 30 },
  { color: "#F59E0B", thresholdPct: 45 },
  { color: "#F97316", thresholdPct: 60 },
  { color: "#EF4444", thresholdPct: 100 },
];

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const toRad = (a: number) => ((a - 180) * Math.PI) / 180;
  const start = { x: cx + r * Math.cos(toRad(startAngleDeg)), y: cy + r * Math.sin(toRad(startAngleDeg)) };
  const end = { x: cx + r * Math.cos(toRad(endAngleDeg)), y: cy + r * Math.sin(toRad(endAngleDeg)) };
  const largeArc = endAngleDeg - startAngleDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function Simulator() {
  const { data: profile } = useGetProfile();
  const currency = profile?.currency ?? "JOD";

  const [loanAmount, setLoanAmount] = useState(10000);
  const [years, setYears] = useState(5);
  const [annualRate, setAnnualRate] = useState(7);

  const simulate = useSimulateBorrowingCapacity();

  const handleSimulate = () => {
    simulate.mutate({
      data: {
        loanAmount,
        termMonths: years * 12,
        annualInterestRate: annualRate,
      },
    });
  };

  const result = simulate.data;
  const verdict = result
    ? VERDICT_META[result.affordability as Affordability]
    : null;
  const VerdictIcon = verdict?.icon;

  // Gauge represents the % of available income (post-subscriptions) that
  // the loan payment would consume. This matches the backend's
  // `currentDebtToIncomeRatio` and `affordability` thresholds.
  const dtiPct = result?.currentDebtToIncomeRatio ?? 0;
  const gaugePct = Math.min(Math.max(dtiPct, 0), 100);
  // Map DTI% (0–100) to needle angle along the half-circle (-90° to +90°).
  const needleAngle = -90 + (gaugePct / 100) * 180;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
          <Calculator className="w-7 h-7 text-orange-600" />
          محاكي القدرة على الاقتراض
        </h1>
        <p className="text-muted-foreground">
          احسب قسطك الشهري وقدرتك الفعلية قبل ما توقّع أي قرض
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              تفاصيل القرض
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>مبلغ القرض</Label>
                <span className="text-sm font-bold text-primary">
                  {formatAmount(loanAmount, currency)}
                </span>
              </div>
              <Slider
                value={[loanAmount]}
                onValueChange={(v) => setLoanAmount(v[0])}
                min={500}
                max={200000}
                step={500}
                className="mb-2"
                data-testid="slider-amount"
              />
              <Input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(parseFloat(e.target.value) || 0)}
                className="text-left"
                data-testid="input-amount"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>مدة القرض (سنوات)</Label>
                <span className="text-sm font-bold text-primary">
                  {years} سنة
                </span>
              </div>
              <Slider
                value={[years]}
                onValueChange={(v) => setYears(v[0])}
                min={1}
                max={30}
                step={1}
                data-testid="slider-years"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>نسبة الفائدة السنوية</Label>
                <span className="text-sm font-bold text-primary">
                  {annualRate}%
                </span>
              </div>
              <Slider
                value={[annualRate]}
                onValueChange={(v) => setAnnualRate(v[0])}
                min={0}
                max={25}
                step={0.25}
                data-testid="slider-rate"
              />
            </div>

            <Button
              onClick={handleSimulate}
              disabled={simulate.isPending}
              className="w-full h-12 bg-gradient-to-l from-orange-600 to-amber-600 text-white shadow-lg gap-2"
              data-testid="btn-simulate"
            >
              <Calculator className="w-5 h-5" />
              {simulate.isPending ? "جارٍ الحساب..." : "احسب قدرتي"}
            </Button>
          </CardContent>
        </Card>

        {/* Gauge / Result */}
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              النتيجة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calculator className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>عبّي البيانات واضغط "احسب قدرتي" لتشوف النتيجة</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 5-zone gauge */}
                <div className="relative">
                  <svg
                    viewBox="0 0 220 130"
                    className="w-full max-w-xs mx-auto"
                  >
                    {/* Five distinct color zones, each 36° of the 180° arc */}
                    {GAUGE_ZONES.map((zone, i) => {
                      const startAngle = i * 36;
                      const endAngle = (i + 1) * 36;
                      return (
                        <path
                          key={i}
                          d={describeArc(110, 110, 85, startAngle, endAngle)}
                          fill="none"
                          stroke={zone.color}
                          strokeWidth="18"
                          strokeLinecap="butt"
                          data-testid={`gauge-zone-${i}`}
                        />
                      );
                    })}
                    {/* Tick labels at zone boundaries (15/30/45/60) */}
                    {[15, 30, 45, 60].map((pct) => {
                      const a = (pct / 100) * 180;
                      const rad = ((a - 180) * Math.PI) / 180;
                      const x = 110 + 102 * Math.cos(rad);
                      const y = 110 + 102 * Math.sin(rad);
                      return (
                        <text
                          key={pct}
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-muted-foreground"
                          style={{ fontSize: 8 }}
                        >
                          {pct}%
                        </text>
                      );
                    })}
                    {/* Needle */}
                    <g
                      style={{
                        transform: `rotate(${needleAngle}deg)`,
                        transformOrigin: "110px 110px",
                        transition: "transform 0.6s ease",
                      }}
                    >
                      <line
                        x1="110"
                        y1="110"
                        x2="110"
                        y2="35"
                        stroke="#1F2A2C"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <circle cx="110" cy="110" r="7" fill="#1F2A2C" />
                    </g>
                  </svg>
                  <div className="text-center -mt-2">
                    <p className="text-sm text-muted-foreground">
                      نسبة القسط من دخلك المتاح
                    </p>
                    <p className="text-4xl font-bold text-foreground">
                      {dtiPct.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Verdict */}
                {verdict && VerdictIcon && (
                  <Alert className={`${verdict.bg} ${verdict.border} border-2`}>
                    <VerdictIcon className={`w-5 h-5 ${verdict.color}`} />
                    <AlertTitle className={`${verdict.color} font-bold`}>
                      {verdict.label}
                    </AlertTitle>
                    <AlertDescription className="text-foreground/80">
                      {verdict.msg}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      القسط الشهري
                    </p>
                    <p
                      className="text-xl font-bold"
                      data-testid="text-monthly-payment"
                    >
                      {formatAmount(result.monthlyPayment, currency)}
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      الفائدة الإجمالية
                    </p>
                    <p
                      className="text-xl font-bold text-orange-600"
                      data-testid="text-total-interest"
                    >
                      {formatAmount(result.totalInterest, currency)}
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      المبلغ الإجمالي
                    </p>
                    <p className="text-xl font-bold">
                      {formatAmount(result.totalRepayment, currency)}
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      نسبة القسط من الدخل المتاح
                    </p>
                    <p
                      className={`text-xl font-bold ${result.currentDebtToIncomeRatio < 45 ? "text-green-600" : "text-red-600"}`}
                      data-testid="text-affordability-ratio"
                    >
                      {result.currentDebtToIncomeRatio.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projected balance over loan term */}
      {result?.projectedBalance?.length ? (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>الرصيد المتوقّع خلال فترة القرض</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.projectedBalance}>
                  <defs>
                    <linearGradient id="bal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    label={{ value: "الشهر", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis />
                  <RechartsTooltip
                    formatter={(v: number) => formatAmount(v, currency)}
                    labelFormatter={(l) => `الشهر ${l}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="remainingBalance"
                    stroke="#7C3AED"
                    strokeWidth={3}
                    fill="url(#bal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
