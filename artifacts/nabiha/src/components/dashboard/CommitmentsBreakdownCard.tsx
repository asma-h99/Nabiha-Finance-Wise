import { useMemo } from "react";
import {
  useListCommitments,
  useListCommitmentSkips,
  useGetUserProfile,
  type Commitment,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { CircleDollarSign } from "lucide-react";

const SLICE_COLORS = [
  "#0d9488",
  "#f59e0b",
  "#047857",
  "#0891b2",
  "#84cc16",
  "#14b8a6",
  "#059669",
  "#10b981",
  "#0e7490",
  "#65a30d",
];
const REMAINING_COLOR = "#1B7E63";

function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isExpired(c: Commitment, now: Date): boolean {
  if (!c.endDate) return false;
  const end = new Date(c.endDate);
  if (Number.isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return end.getTime() < now.getTime();
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}

function SliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: LabelProps) {
  if (percent < 0.055) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.52;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  const label = name.length > 9 ? name.slice(0, 9) + "…" : name;
  const pct = `${(percent * 100).toFixed(0)}%`;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="white"
      stroke="rgba(0,0,0,0.35)"
      strokeWidth={3}
      paintOrder="stroke"
    >
      <tspan x={x} dy="-0.55em" fontSize={10} fontWeight="700" fontFamily="var(--font-sans)">
        {label}
      </tspan>
      <tspan x={x} dy="1.25em" fontSize={12} fontWeight="900" fontFamily="var(--font-sans)">
        {pct}
      </tspan>
    </text>
  );
}

export function CommitmentsBreakdownCard() {
  const { data: commitments, isLoading: loadingC } = useListCommitments();
  const { data: skips } = useListCommitmentSkips();
  const { data: profile, isLoading: loadingP } = useGetUserProfile();
  const { format, baseCurrency } = useDisplayCurrency();

  const now = new Date();
  const currentMonth = toYearMonth(now);

  const skippedThisMonth = useMemo(
    () =>
      new Set(
        (skips ?? [])
          .filter((s) => s.month === currentMonth)
          .map((s) => s.commitmentId),
      ),
    [skips, currentMonth],
  );

  const activeList = useMemo(
    () =>
      (commitments ?? []).filter((c) => {
        if (isExpired(c, now)) return false;
        if (c.isOneTime) return c.oneTimeMonth === currentMonth;
        return !skippedThisMonth.has(c.id);
      }),
    [commitments, skippedThisMonth, currentMonth],
  );

  if (loadingC || loadingP) {
    return <Skeleton className="h-80 w-full rounded-3xl" />;
  }

  const salary = Number(profile?.monthlySalary ?? 0);
  const list = activeList.slice().sort((a, b) => a.dueDay - b.dueDay);
  const totalCommitments = list.reduce((s, c) => s + Number(c.amount), 0);
  const remaining = Math.max(0, salary - totalCommitments);
  const isEmpty = list.length === 0 || salary === 0;

  const pieData = [
    ...list.map((c, idx) => ({
      id: c.id,
      name: c.title,
      value: Number(c.amount),
      color: SLICE_COLORS[idx % SLICE_COLORS.length],
    })),
    { id: "remaining", name: "المتبقي", value: remaining, color: REMAINING_COLOR },
  ];

  return (
    <Card
      className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col"
      data-testid="card-commitments-breakdown"
    >
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-bold">التوزيع المالي للالتزامات</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-4 flex items-center justify-center">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm text-center gap-2">
            <CircleDollarSign className="w-10 h-10 opacity-20" />
            <p>أضف راتبك والتزاماتك لترى التوزيع</p>
          </div>
        ) : (
          <div className="relative" style={{ width: 300, height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={78}
                  outerRadius={138}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  labelLine={false}
                  label={(props) => <SliceLabel {...props} />}
                  startAngle={90}
                  endAngle={-270}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: number, name: string) => [format(value, baseCurrency), name]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    direction: "rtl",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center label */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              dir="rtl"
            >
              <span className="text-[10px] text-muted-foreground font-medium">الراتب الأصلي</span>
              <span className="text-base font-extrabold text-foreground leading-tight">
                {format(salary, baseCurrency)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
