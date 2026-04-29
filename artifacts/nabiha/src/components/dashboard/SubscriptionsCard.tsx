import { useMemo, useState } from "react";
import {
  useListSubscriptions,
  useCreateSubscription,
  useDeleteSubscription,
  useGetUserProfile,
  getListSubscriptionsQueryKey,
  getGetBalanceSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Repeat } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { formatMoney } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

const PALETTE = [
  "hsl(244, 100%, 69%)",
  "hsl(28, 100%, 60%)",
  "hsl(160, 70%, 45%)",
  "hsl(340, 80%, 60%)",
  "hsl(200, 80%, 55%)",
  "hsl(50, 90%, 55%)",
  "hsl(280, 70%, 60%)",
  "hsl(10, 80%, 60%)",
];

export function SubscriptionsCard() {
  const { data: subs, isLoading } = useListSubscriptions();
  const { data: profile } = useGetUserProfile();
  const create = useCreateSubscription();
  const remove = useDeleteSubscription();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { format, convert, displayCurrency, baseCurrency } = useDisplayCurrency();
  void profile;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [renewsOnDay, setRenewsOnDay] = useState("1");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const deletingSub = subs?.find((s) => s.id === deleteId);

  const { chartData, monthlyTotal } = useMemo(() => {
    const list = subs ?? [];
    const data = list.map((s, i) => {
      const monthlyBase =
        s.billingCycle === "yearly" ? Number(s.amount) / 12 : Number(s.amount);
      return {
        name: s.name,
        monthly: convert(monthlyBase, baseCurrency),
        color: s.color || PALETTE[i % PALETTE.length],
        id: s.id,
      };
    });
    const total = data.reduce((acc, d) => acc + d.monthly, 0);
    return { chartData: data, monthlyTotal: total };
  }, [subs, convert, baseCurrency]);

  async function refreshAll() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: getListSubscriptionsQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetBalanceSummaryQueryKey() }),
    ]);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || Number.isNaN(amt) || amt <= 0) {
      toast({ title: "تحققي من الاسم والمبلغ", variant: "destructive" });
      return;
    }
    const day = parseInt(renewsOnDay, 10);
    await create.mutateAsync({
      data: {
        name: name.trim(),
        amount: amt,
        billingCycle,
        renewsOnDay: Number.isNaN(day) || day < 1 || day > 31 ? null : day,
        color: PALETTE[(subs?.length ?? 0) % PALETTE.length],
      },
    });
    await refreshAll();
    toast({ title: "تمت إضافة الاشتراك" });
    setName("");
    setAmount("");
    setBillingCycle("monthly");
    setRenewsOnDay("1");
    setOpen(false);
  }

  async function confirmDelete() {
    if (deleteId == null) return;
    await remove.mutateAsync({ id: deleteId });
    await refreshAll();
    toast({ title: "تم حذف الاشتراك" });
    setDeleteId(null);
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-3xl lg:col-span-2" />;
  }

  const isEmpty = !subs || subs.length === 0;

  return (
    <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm lg:col-span-2 overflow-hidden" data-testid="card-subscriptions">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary" />
            اشتراكاتي الشهرية
          </CardTitle>
          <CardDescription className="mt-1">
            {isEmpty
              ? "أضف اشتراكاتك حتى نبيهة تذكرك بالتجديدات"
              : `${subs.length} اشتراك • ${formatMoney(monthlyTotal, displayCurrency)} / شهر`}
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gap-1.5 shrink-0" data-testid="button-add-subscription">
              <Plus className="w-4 h-4" />
              إضافة
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle>اشتراك جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="sub-name">اسم الاشتراك</Label>
                <Input
                  id="sub-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً Netflix"
                  data-testid="input-sub-name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-amount">المبلغ</Label>
                <Input
                  id="sub-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="input-sub-amount"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-cycle">دورة الفوترة</Label>
                <Select
                  value={billingCycle}
                  onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")}
                >
                  <SelectTrigger id="sub-cycle" data-testid="select-sub-cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly" data-testid="option-cycle-monthly">شهري</SelectItem>
                    <SelectItem value="yearly" data-testid="option-cycle-yearly">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-day">يوم التجديد</Label>
                <Input
                  id="sub-day"
                  type="number"
                  min="1"
                  max="31"
                  value={renewsOnDay}
                  onChange={(e) => setRenewsOnDay(e.target.value)}
                  data-testid="input-sub-day"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending} data-testid="button-save-subscription">
                  {create.isPending ? "جاري الحفظ..." : "إضافة"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Repeat className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">لسا ما ضيفتي أي اشتراك</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="relative h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="monthly"
                    nameKey="name"
                    stroke="transparent"
                  >
                    {chartData.map((d) => (
                      <Cell key={d.id} fill={d.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => [formatMoney(value, displayCurrency), "شهرياً"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      direction: "rtl",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xs text-muted-foreground">المجموع</div>
                <div className="text-xl font-extrabold text-foreground" data-testid="text-subs-total">
                  {formatMoney(monthlyTotal, displayCurrency)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">/ شهر</div>
              </div>
            </div>
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1" data-testid="list-subscriptions">
              {chartData.map((s) => {
                const sub = subs.find((x) => x.id === s.id)!;
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-background/60 border border-border/50 hover:border-border transition-colors"
                    data-testid={`row-subscription-${s.id}`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">{sub.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatMoney(s.monthly, displayCurrency)} / شهر
                        {sub.billingCycle === "yearly" && " (سنوي)"}
                        {sub.renewsOnDay ? ` • يوم ${sub.renewsOnDay}` : ""}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => setDeleteId(s.id)}
                      data-testid={`button-delete-subscription-${s.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الاشتراك؟</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingSub
                ? `هل أنت متأكد من حذف "${deletingSub.name}"؟ ما رح تقدر ترجعه.`
                : "هل أنت متأكد؟"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
