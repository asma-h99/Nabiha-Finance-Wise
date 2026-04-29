import { useListCommitments, useGetUserProfile } from "@workspace/api-client-react";
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
import {
  Home,
  Zap,
  Droplets,
  Wifi,
  Phone,
  Car,
  Landmark,
  Shield,
  GraduationCap,
  Heart,
  Dumbbell,
  CircleDollarSign,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";

// Cohesive financial palette anchored to brand emerald + warm gold
const SLICE_COLORS = [
  "#f59e0b", // warm gold  (accent 1)
  "#0d9488", // teal        (adjacent to brand emerald)
  "#1e40af", // navy blue   (trust / finance)
  "#d97706", // amber       (warm accent)
  "#7c3aed", // deep violet (premium)
  "#0891b2", // ocean blue  (cool accent)
  "#059669", // medium green
  "#4f46e5", // indigo
  "#0f766e", // dark teal
  "#9333ea", // purple
];
const REMAINING_COLOR = "#1B7E63"; // brand emerald for the remaining slice

const ICON_COLORS = [
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100",   text: "text-amber-700"   },
  { bg: "bg-blue-100",    text: "text-blue-700"    },
  { bg: "bg-cyan-100",    text: "text-cyan-700"    },
  { bg: "bg-violet-100",  text: "text-violet-700"  },
  { bg: "bg-orange-100",  text: "text-orange-700"  },
  { bg: "bg-teal-100",    text: "text-teal-700"    },
  { bg: "bg-indigo-100",  text: "text-indigo-700"  },
  { bg: "bg-sky-100",     text: "text-sky-700"     },
  { bg: "bg-purple-100",  text: "text-purple-700"  },
];

// Commitments matching this pattern are excluded from the pie (e.g. rent)
const PIE_EXCLUDE_PATTERN = /إيجار|rent|شقة|منزل|بيت/i;

function getIcon(title: string): LucideIcon {
  if (/إيجار|rent|منزل|بيت|شقة/i.test(title)) return Home;
  if (/كهرب|electric|ضوء/i.test(title)) return Zap;
  if (/ماء|water|مياه/i.test(title)) return Droplets;
  if (/انترنت|internet|wifi|نت|شبكة/i.test(title)) return Wifi;
  if (/هاتف|phone|جوال|موبايل|اتصال/i.test(title)) return Phone;
  if (/سيارة|car|مواصلات|بنزين|وقود/i.test(title)) return Car;
  if (/قرض|loan|بنك|bank|تمويل|أقساط/i.test(title)) return Landmark;
  if (/تأمين|insurance/i.test(title)) return Shield;
  if (/مدرسة|school|تعليم|جامعة|رسوم/i.test(title)) return GraduationCap;
  if (/صحة|health|طب|doctor|مستشفى/i.test(title)) return Heart;
  if (/نادي|gym|رياضة|fitness/i.test(title)) return Dumbbell;
  return CircleDollarSign;
}

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: CustomLabelProps) {
  if (percent < 0.05) return null; // skip slivers
  const RADIAN = Math.PI / 180;
  // Position label in the middle of the ring
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight="800"
      // White fill + dark outline so it reads on any slice color
      fill="white"
      stroke="rgba(0,0,0,0.45)"
      strokeWidth={3}
      paintOrder="stroke"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function CommitmentsBreakdownCard() {
  const { data: commitments, isLoading: loadingC } = useListCommitments();
  const { data: profile, isLoading: loadingP } = useGetUserProfile();
  const { format, baseCurrency } = useDisplayCurrency();

  if (loadingC || loadingP) {
    return <Skeleton className="h-[560px] w-full rounded-3xl" />;
  }

  const salary = profile?.monthlySalary ?? 0;
  const list = (commitments ?? []).slice().sort((a, b) => a.dueDay - b.dueDay);
  // Exclude rent/housing from the pie visualization (still counted in totals)
  const pieList = list.filter((c) => !PIE_EXCLUDE_PATTERN.test(c.title));
  const totalCommitments = list.reduce((s, c) => s + Number(c.amount), 0);
  const remaining = Math.max(0, salary - totalCommitments);

  const pieData = [
    ...pieList.map((c, idx) => ({
      id: c.id,
      name: c.title,
      value: Number(c.amount),
      color: SLICE_COLORS[idx % SLICE_COLORS.length],
    })),
    {
      id: "remaining",
      name: "المتبقي",
      value: remaining,
      color: REMAINING_COLOR,
    },
  ];

  const isEmpty = list.length === 0 || salary === 0;

  return (
    <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col" data-testid="card-commitments-breakdown">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-bold">التوزيع المالي للالتزامات</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-4 space-y-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm text-center gap-2">
            <CircleDollarSign className="w-10 h-10 opacity-20" />
            <p>أضف راتبك والتزاماتك لترى التوزيع</p>
          </div>
        ) : (
          <>
            {/* Donut chart */}
            <div className="relative" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={125}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    labelLine={false}
                    label={(props) => <CustomLabel {...props} />}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.id}
                        fill={entry.color}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [
                      format(value, baseCurrency),
                      name,
                    ]}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" dir="rtl">
                <span className="text-[11px] text-muted-foreground font-medium">الراتب الأصلي</span>
                <span className="text-xl font-extrabold text-foreground leading-tight">
                  {format(salary, baseCurrency)}
                </span>
              </div>
            </div>

            {/* Legend rows */}
            <div className="space-y-2" dir="rtl">
              {pieList.map((c, idx) => {
                const Icon = getIcon(c.title);
                const sliceColor = SLICE_COLORS[idx % SLICE_COLORS.length];
                const iconColor = ICON_COLORS[idx % ICON_COLORS.length];
                const pct = salary > 0 ? ((Number(c.amount) / salary) * 100).toFixed(0) : "0";

                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-border/60 bg-background/70 hover:border-border transition-colors"
                    data-testid={`row-breakdown-${c.id}`}
                  >
                    {/* Colored dot */}
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: sliceColor }}
                    />
                    {/* Icon */}
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconColor.bg} ${iconColor.text}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    {/* Name + pct */}
                    <span className="flex-1 font-medium text-sm text-foreground truncate">
                      {c.title}
                    </span>
                    <span className="text-xs text-muted-foreground font-bold">{pct}%</span>
                    <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {/* Amount */}
                    <span className="font-bold text-sm text-foreground tabular-nums shrink-0">
                      {format(Number(c.amount), baseCurrency)}
                    </span>
                  </div>
                );
              })}

              {/* Total commitments */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-border bg-muted/30" data-testid="row-total-commitments">
                <span className="w-3 h-3 rounded-full bg-foreground shrink-0" />
                <span className="flex-1 font-bold text-sm text-foreground">إجمالي الالتزامات</span>
                <span className="font-bold text-sm tabular-nums">{format(totalCommitments, baseCurrency)}</span>
              </div>

              {/* Remaining */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/60" data-testid="row-remaining">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: REMAINING_COLOR }} />
                <span className="flex-1 font-bold text-sm text-emerald-700">الراتب المتبقي</span>
                <span className="font-bold text-sm text-emerald-700 tabular-nums">{format(remaining, baseCurrency)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
