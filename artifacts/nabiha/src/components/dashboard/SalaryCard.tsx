import { useState, useEffect } from "react";
import { useGetUserProfile, useUpdateUserProfile, getGetUserProfileQueryKey, getGetBalanceSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES, getCurrency } from "@/lib/currency";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { Wallet, Pencil, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SalaryCard() {
  const { data: profile, isLoading } = useGetUserProfile();
  const update = useUpdateUserProfile();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { format, baseCurrency, displayCurrency, setDisplayCurrency } = useDisplayCurrency();

  const [open, setOpen] = useState(false);
  const [salary, setSalary] = useState("");
  const [currency, setCurrency] = useState("JOD");
  const [payday, setPayday] = useState("1");

  useEffect(() => {
    if (profile && open) {
      setSalary(String(profile.monthlySalary));
      setCurrency(profile.currency);
      setPayday(String(profile.payday));
    }
  }, [profile, open]);

  if (isLoading) {
    return <Skeleton className="h-44 w-full rounded-3xl" />;
  }

  const cur = getCurrency(baseCurrency);
  const salaryValue = profile?.monthlySalary ?? 0;
  const isUnset = salaryValue === 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(salary);
    const day = parseInt(payday, 10);
    if (Number.isNaN(amount) || amount < 0) {
      toast({ title: "أدخل راتب صحيح", variant: "destructive" });
      return;
    }
    if (Number.isNaN(day) || day < 1 || day > 31) {
      toast({ title: "يوم الراتب لازم يكون بين 1 و 31", variant: "destructive" });
      return;
    }
    await update.mutateAsync({
      data: { monthlySalary: amount, currency, payday: day },
    });
    await Promise.all([
      qc.invalidateQueries({ queryKey: getGetUserProfileQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetBalanceSummaryQueryKey() }),
    ]);
    // Also sync the global display currency so the header switcher and every
    // card immediately reflect the user's new currency choice.
    setDisplayCurrency(currency);
    toast({ title: "تم تحديث الراتب" });
    setOpen(false);
  }

  return (
    <Card className="rounded-3xl border-none shadow-md bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden relative" data-testid="card-salary">
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <CardHeader className="pb-1 pt-4 px-4 relative z-10">
        <CardTitle className="text-xs font-medium opacity-90 flex items-center justify-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          راتبي الشهري
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute top-3 left-3 h-8 w-8 text-primary-foreground hover:bg-white/20" data-testid="button-edit-salary">
              <Pencil className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل الراتب والعملة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="salary">الراتب الشهري</Label>
                <Input
                  id="salary"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  data-testid="input-salary"
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">العملة</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency" data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code} data-testid={`option-currency-${c.code}`}>
                        {c.englishName} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payday">يوم استلام الراتب</Label>
                <Input
                  id="payday"
                  type="number"
                  min="1"
                  max="31"
                  value={payday}
                  onChange={(e) => setPayday(e.target.value)}
                  data-testid="input-payday"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={update.isPending} data-testid="button-save-salary">
                  {update.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="px-4 pb-4 relative z-10 flex flex-col items-center text-center gap-2">
        {isUnset ? (
          <div className="space-y-2">
            <p className="text-xs opacity-90">حدّد راتبك حتى نبيهة تساعدك تخطط صح</p>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-xl"
              onClick={() => setOpen(true)}
              data-testid="button-set-salary"
            >
              أدخل راتبك
            </Button>
          </div>
        ) : (
          <>
            <div className="text-xl font-extrabold tracking-tight" data-testid="text-salary-amount">
              {format(salaryValue, cur.code)}
            </div>
            <div className="flex items-center gap-1.5 text-xs opacity-80">
              <Calendar className="w-3 h-3" />
              <span>يوم {profile?.payday} من كل شهر</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
