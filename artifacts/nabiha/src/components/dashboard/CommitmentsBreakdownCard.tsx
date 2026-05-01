import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListCommitments,
  useListCommitmentSkips,
  useGetUserProfile,
  useCreateCommitment,
  useUpdateCommitment,
  useDeleteCommitment,
  useSkipCommitmentMonth,
  type Commitment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateCommitmentsEverywhere } from "@/lib/queryInvalidation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form } from "@/components/ui/form";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import {
  CommitmentFormFields,
  commitmentFormSchema,
  commitmentFormDefaultValues,
  type CommitmentFormValues,
} from "@/components/dashboard/CommitmentFormFields";
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
  Pencil,
  Trash2,
  Plus,
  CalendarOff,
  type LucideIcon,
} from "lucide-react";

// Cohesive financial palette: brand emerald family + warm gold accent
const SLICE_COLORS = [
  "#0d9488", // teal
  "#10b981", // mint
  "#f59e0b", // warm gold (accent)
  "#047857", // forest green
  "#0891b2", // ocean
  "#84cc16", // lime sage
  "#14b8a6", // bright teal
  "#059669", // medium emerald
  "#0e7490", // deep cyan
  "#65a30d", // olive
];
const REMAINING_COLOR = "#1B7E63"; // brand emerald reserved for the remaining slice

const ICON_COLORS = [
  { bg: "bg-teal-100",    text: "text-teal-700"    },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100",   text: "text-amber-700"   },
  { bg: "bg-green-100",   text: "text-green-700"   },
  { bg: "bg-cyan-100",    text: "text-cyan-700"    },
  { bg: "bg-lime-100",    text: "text-lime-700"    },
  { bg: "bg-teal-100",    text: "text-teal-700"    },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-sky-100",     text: "text-sky-700"     },
  { bg: "bg-green-100",   text: "text-green-700"   },
];

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

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

// Format an ISO date (YYYY-MM-DD) as Arabic month + year, e.g. "ديسمبر 2026".
function formatEndDate(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return `${ARABIC_MONTHS[m - 1] ?? m} ${y}`;
}

// Returns YYYY-MM string for a given date
function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Returns true if the obligation is no longer active (its endDate is in the past).
function isExpired(c: Commitment, now: Date): boolean {
  if (!c.endDate) return false;
  const end = new Date(c.endDate);
  if (Number.isNaN(end.getTime())) return false;
  // Treat the entire endDate day as still active.
  end.setHours(23, 59, 59, 999);
  return end.getTime() < now.getTime();
}

export function CommitmentsBreakdownCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: commitments, isLoading: loadingC } = useListCommitments();
  const { data: skips } = useListCommitmentSkips();
  const { data: profile, isLoading: loadingP } = useGetUserProfile();
  const { format, baseCurrency } = useDisplayCurrency();

  /* ── inline edit / delete state ────────────────────────────────────── */
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Commitment | null>(null);
  const [deleting, setDeleting] = useState<Commitment | null>(null);

  const invalidate = () => invalidateCommitmentsEverywhere(queryClient);

  const now = new Date();
  const currentMonth = toYearMonth(now);
  const currentMonthLabel = `${ARABIC_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  const createForm = useForm<CommitmentFormValues>({
    resolver: zodResolver(commitmentFormSchema),
    defaultValues: commitmentFormDefaultValues,
  });
  const editForm = useForm<CommitmentFormValues>({
    resolver: zodResolver(commitmentFormSchema),
    defaultValues: commitmentFormDefaultValues,
  });

  useEffect(() => {
    if (editing) {
      editForm.reset({
        title: editing.title,
        amount: Number(editing.amount),
        dueDay: editing.dueDay,
        notes: editing.notes ?? "",
        endDate: editing.endDate ?? "",
        scope: "recurring",
      });
    }
  }, [editing, editForm]);

  const createCommitment = useCreateCommitment({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "تم إضافة الالتزام بنجاح" });
        setAddOpen(false);
        createForm.reset(commitmentFormDefaultValues);
      },
    },
  });
  const updateCommitment = useUpdateCommitment({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "تم تعديل الالتزام بنجاح" });
        setEditing(null);
      },
    },
  });
  const deleteCommitment = useDeleteCommitment({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "تم حذف الالتزام بنجاح" });
        setDeleting(null);
      },
    },
  });
  const skipCommitmentMonth = useSkipCommitmentMonth({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: `تم إخفاء الالتزام من شهر ${currentMonthLabel}` });
        setDeleting(null);
      },
      onError: () => {
        toast({ title: "هذا الشهر مضاف مسبقاً للاستثناءات", variant: "destructive" });
        setDeleting(null);
      },
    },
  });

  const normalize = (values: CommitmentFormValues) => ({
    ...values,
    endDate: values.endDate && values.endDate.length > 0 ? values.endDate : null,
    notes: values.notes && values.notes.length > 0 ? values.notes : null,
  });

  const expiredCount = useMemo(() => {
    return (commitments ?? []).filter((c) => isExpired(c, now)).length;
  }, [commitments]);

  if (loadingC || loadingP) {
    return <Skeleton className="h-[560px] w-full rounded-3xl" />;
  }

  const salary = profile?.monthlySalary ?? 0;

  // Build a set of skipped commitment IDs for the current month
  const skippedThisMonth = new Set(
    (skips ?? [])
      .filter((s) => s.month === currentMonth)
      .map((s) => s.commitmentId),
  );

  // Active list: not expired, not skipped this month, and (if one-time) matches current month
  const activeList = (commitments ?? []).filter((c) => {
    if (isExpired(c, now)) return false;
    if (c.isOneTime) return c.oneTimeMonth === currentMonth;
    return !skippedThisMonth.has(c.id);
  });

  const list = activeList.slice().sort((a, b) => a.dueDay - b.dueDay);
  const pieList = list;
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
      <CardHeader className="pb-0 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-bold">التوزيع المالي للالتزامات</CardTitle>
        <Button
          size="sm"
          className="h-8 rounded-xl gap-1 px-3"
          onClick={() => {
            createForm.reset(commitmentFormDefaultValues);
            setAddOpen(true);
          }}
          data-testid="button-add-commitment-dashboard"
        >
          <Plus className="w-3.5 h-3.5" />
          إضافة
        </Button>
      </CardHeader>

      <CardContent className="flex-1 p-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm text-center gap-2">
            <CircleDollarSign className="w-10 h-10 opacity-20" />
            <p>أضف راتبك والتزاماتك لترى التوزيع</p>
          </div>
        ) : (
          <div className="flex flex-row gap-4 items-start">
            {/* RIGHT: Donut chart (DOM-first = visual right in RTL) */}
            <div className="relative shrink-0" style={{ width: 260, height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={118}
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
                <span className="text-[10px] text-muted-foreground font-medium">الراتب الأصلي</span>
                <span className="text-base font-extrabold text-foreground leading-tight">
                  {format(salary, baseCurrency)}
                </span>
              </div>
            </div>

            {/* LEFT: Legend rows */}
            <div className="flex-1 space-y-2 overflow-y-auto" dir="rtl">
              {pieList.map((c, idx) => {
                const Icon = getIcon(c.title);
                const sliceColor = SLICE_COLORS[idx % SLICE_COLORS.length];
                const iconColor = ICON_COLORS[idx % ICON_COLORS.length];
                const pct = salary > 0 ? ((Number(c.amount) / salary) * 100).toFixed(0) : "0";

                return (
                  <div
                    key={c.id}
                    className="group flex items-center gap-2 px-3 py-2 rounded-2xl border border-border/60 bg-background/70 hover:border-border transition-colors"
                    data-testid={`row-breakdown-${c.id}`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: sliceColor }}
                    />
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${iconColor.bg} ${iconColor.text}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">
                        {c.title}
                        {c.isOneTime && (
                          <span className="mr-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-1 py-0.5">
                            هذا الشهر
                          </span>
                        )}
                      </div>
                      {c.endDate && !c.isOneTime && (
                        <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                          <CalendarOff className="w-2.5 h-2.5" />
                          ينتهي في {formatEndDate(c.endDate)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-bold">{pct}%</span>
                    <span className="font-bold text-sm text-foreground tabular-nums shrink-0">
                      {format(Number(c.amount), baseCurrency)}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        onClick={() => setEditing(c)}
                        aria-label={`تعديل ${c.title}`}
                        data-testid={`button-edit-commitment-${c.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleting(c)}
                        aria-label={`حذف ${c.title}`}
                        data-testid={`button-delete-commitment-${c.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Total commitments */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-border bg-muted/30" data-testid="row-total-commitments">
                <span className="w-2.5 h-2.5 rounded-full bg-foreground shrink-0" />
                <span className="flex-1 font-bold text-sm text-foreground">إجمالي الالتزامات</span>
                <span className="font-bold text-sm tabular-nums">{format(totalCommitments, baseCurrency)}</span>
              </div>

              {/* Remaining */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-emerald-200 bg-emerald-50/60" data-testid="row-remaining">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: REMAINING_COLOR }} />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-emerald-700 block">المتبقي بعد الالتزامات</span>
                  <span className="text-[10px] text-muted-foreground">بدون الصرفيات والاشتراكات</span>
                </div>
                <span className="font-bold text-sm text-emerald-700 tabular-nums shrink-0">{format(remaining, baseCurrency)}</span>
              </div>

              {expiredCount > 0 && (
                <div
                  className="text-[11px] text-muted-foreground px-3 py-1.5 rounded-xl bg-muted/30 border border-border/60 flex items-center gap-1.5"
                  data-testid="row-expired-summary"
                >
                  <CalendarOff className="w-3 h-3" />
                  <span>
                    {expiredCount} التزام منتهٍ تم استثناؤه من التوزيع.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* === Add commitment dialog === */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-3xl max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة التزام</DialogTitle>
            <DialogDescription>
              اختر هل هو التزام متكرر كل شهر، أم لهذا الشهر فقط.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((values) => {
                const isOneTime = values.scope === "one-time";
                createCommitment.mutate({
                  data: {
                    ...normalize(values),
                    isOneTime,
                    oneTimeMonth: isOneTime ? currentMonth : null,
                    endDate: isOneTime ? null : (normalize(values).endDate as string | null | undefined),
                  },
                });
              })}
              className="space-y-4 mt-2"
            >
              <CommitmentFormFields
                control={createForm.control}
                baseCurrency={baseCurrency}
                showScopePicker
              />
              <DialogFooter>
                <Button
                  type="submit"
                  className="rounded-xl"
                  disabled={createCommitment.isPending}
                  data-testid="button-save-add-commitment"
                >
                  حفظ
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* === Edit commitment dialog === */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="rounded-3xl max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الالتزام</DialogTitle>
            <DialogDescription>
              عدّل التفاصيل أو حدّد متى ينتهي هذا الالتزام.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((values) => {
                if (!editing) return;
                updateCommitment.mutate({
                  id: editing.id,
                  data: normalize(values),
                });
              })}
              className="space-y-4 mt-2"
            >
              <CommitmentFormFields
                control={editForm.control}
                baseCurrency={baseCurrency}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => setEditing(null)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl"
                  disabled={updateCommitment.isPending}
                  data-testid="button-save-edit-commitment"
                >
                  حفظ التعديلات
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* === Delete scope dialog === */}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent dir="rtl" className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الالتزام؟</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.isOneTime
                ? `هل أنت متأكد من حذف "${deleting?.title}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `اختر كيف تريد حذف "${deleting?.title}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-col sm:flex-col">
            {deleting && !deleting.isOneTime && (
              <Button
                variant="outline"
                className="rounded-xl w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                disabled={skipCommitmentMonth.isPending}
                onClick={() => {
                  if (deleting) {
                    skipCommitmentMonth.mutate({ id: deleting.id, data: { month: currentMonth } });
                  }
                }}
                data-testid="button-delete-this-month-only"
              >
                حذف من {currentMonthLabel} فقط
              </Button>
            )}
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full"
              onClick={() => {
                if (deleting) deleteCommitment.mutate({ id: deleting.id });
              }}
              data-testid="button-confirm-delete-commitment"
            >
              {deleting?.isOneTime ? "حذف" : "حذف الالتزام بالكامل (كل الأشهر)"}
            </AlertDialogAction>
            <AlertDialogCancel className="rounded-xl w-full mt-0">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
