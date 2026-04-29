import { useState } from "react";
import {
  useListSubscriptions,
  useCreateSubscription,
  useDeleteSubscription,
  useUpdateSubscription,
  useGetSubscriptionsBreakdown,
  useGetProfile,
  getListSubscriptionsQueryKey,
  getGetSubscriptionsBreakdownQueryKey,
  getGetDashboardSummaryQueryKey,
  type SubscriptionFrequency,
  type SubscriptionCategory,
  type SubscriptionStatus,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/currency";
import {
  Plus,
  Repeat,
  Trash2,
  Pause,
  Play,
  CalendarClock,
  PieChart as PieIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

const COLORS = [
  "#0F8F87",
  "#7C3AED",
  "#3B82F6",
  "#F97316",
  "#EC4899",
  "#10B981",
];

const FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
  monthly: "شهري",
  yearly: "سنوي",
  weekly: "أسبوعي",
};

const CATEGORY_LABELS: Record<SubscriptionCategory, string> = {
  streaming: "بث وفيديو",
  music: "موسيقى",
  productivity: "إنتاجية",
  fitness: "رياضة",
  other: "أخرى",
};

function monthlyEquivalent(amount: number, freq: SubscriptionFrequency): number {
  if (freq === "yearly") return amount / 12;
  if (freq === "weekly") return amount * 4.333;
  return amount;
}

export default function Subscriptions() {
  const { data: profile } = useGetProfile();
  const currency = profile?.currency ?? "JOD";
  const { data: subs, isLoading } = useListSubscriptions();
  const { data: breakdown } = useGetSubscriptionsBreakdown();
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListSubscriptionsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetSubscriptionsBreakdownQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const createSub = useCreateSubscription({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "تمت الإضافة", description: "تم إضافة الاشتراك" });
        setOpen(false);
        resetForm();
      },
    },
  });
  const deleteSub = useDeleteSubscription({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "تم الحذف" });
      },
    },
  });
  const updateSub = useUpdateSubscription({ mutation: { onSuccess: invalidate } });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<SubscriptionFrequency>("monthly");
  const [category, setCategory] = useState<SubscriptionCategory>("streaming");
  const [nextDate, setNextDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const resetForm = () => {
    setName("");
    setAmount("");
    setFrequency("monthly");
    setCategory("streaming");
    setNextDate(new Date().toISOString().slice(0, 10));
  };

  const handleSubmit = () => {
    if (!name || !amount) return;
    createSub.mutate({
      data: {
        name,
        amount: parseFloat(amount),
        frequency,
        category,
        nextRenewalDate: nextDate,
        status: "active",
      },
    });
  };

  const total = breakdown?.monthlyTotal ?? 0;
  const yearlyTotal = breakdown?.yearlyTotal ?? 0;
  const activeCount =
    subs?.filter((s) => s.status === "active").length ?? 0;

  // Per-subscription monthly equivalent for donut
  const subSlices =
    subs
      ?.filter((s) => s.status !== "inactive")
      .map((s) => ({
        name: s.name,
        value: monthlyEquivalent(s.amount, s.frequency),
      })) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <Repeat className="w-7 h-7 text-purple-600" />
            الاشتراكات
          </h1>
          <p className="text-muted-foreground">
            تتبّع كل اشتراكاتك الشهرية والسنوية
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-l from-purple-600 to-fuchsia-600 text-white shadow-lg gap-2"
              data-testid="btn-add-subscription"
            >
              <Plus className="w-4 h-4" />
              إضافة اشتراك
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة اشتراك جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>اسم الاشتراك</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: Netflix"
                  data-testid="input-sub-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>المبلغ</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    data-testid="input-sub-amount"
                  />
                </div>
                <div>
                  <Label>الدورة</Label>
                  <Select
                    value={frequency}
                    onValueChange={(v) => setFrequency(v as SubscriptionFrequency)}
                  >
                    <SelectTrigger data-testid="select-sub-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">شهري</SelectItem>
                      <SelectItem value="yearly">سنوي</SelectItem>
                      <SelectItem value="weekly">أسبوعي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>الفئة</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as SubscriptionCategory)}
                >
                  <SelectTrigger data-testid="select-sub-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>تاريخ التجديد القادم</Label>
                <Input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  data-testid="input-sub-date"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createSub.isPending}
                className="bg-gradient-to-l from-purple-600 to-fuchsia-600 text-white"
                data-testid="btn-save-sub"
              >
                {createSub.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-3xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white border-0">
          <CardContent className="p-6">
            <p className="text-purple-100 text-sm mb-2">المعادل الشهري</p>
            <p className="text-3xl font-bold" data-testid="text-sub-monthly">
              {formatAmount(total, currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
          <CardContent className="p-6">
            <p className="text-blue-100 text-sm mb-2">اشتراكات نشطة</p>
            <p className="text-3xl font-bold" data-testid="text-sub-active">
              {activeCount}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 text-white border-0">
          <CardContent className="p-6">
            <p className="text-orange-100 text-sm mb-2">إجمالي سنوي تقريبي</p>
            <p className="text-3xl font-bold">
              {formatAmount(yearlyTotal, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Donut chart */}
      {subSlices.length > 0 && (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-primary" />
              التوزيع المالي للاشتراكات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subSlices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={2}
                  >
                    {subSlices.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(v: number) => formatAmount(v, currency)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!subs?.length ? (
          <Card className="md:col-span-2 rounded-3xl">
            <CardContent className="p-12 text-center">
              <Repeat className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                لا توجد اشتراكات بعد
              </h3>
              <p className="text-muted-foreground">
                أضف اشتراكاتك لتتبّع مصاريفك المتكرّرة
              </p>
            </CardContent>
          </Card>
        ) : (
          subs.map((s) => {
            const isActive = s.status === "active";
            const newStatus: SubscriptionStatus = isActive ? "inactive" : "active";
            return (
              <Card
                key={s.id}
                className={`rounded-3xl transition-all hover:shadow-md ${!isActive ? "opacity-60" : ""}`}
                data-testid={`subscription-${s.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white font-bold text-lg">
                        {s.name[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{s.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {FREQUENCY_LABELS[s.frequency]}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {CATEGORY_LABELS[s.category]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {!isActive && <Badge variant="secondary">موقوف</Badge>}
                  </div>
                  <p className="text-2xl font-bold text-purple-600 mb-3">
                    {formatAmount(s.amount, currency)}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <CalendarClock className="w-4 h-4" />
                    التجديد:{" "}
                    {new Date(s.nextRenewalDate).toLocaleDateString("ar")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() =>
                        updateSub.mutate({
                          id: s.id,
                          data: { status: newStatus },
                        })
                      }
                      data-testid={`btn-toggle-${s.id}`}
                    >
                      {isActive ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          إيقاف
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          تفعيل
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => deleteSub.mutate({ id: s.id })}
                      data-testid={`btn-delete-${s.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
