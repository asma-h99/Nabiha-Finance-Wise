import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useListCommitments, useCreateCommitment, useUpdateCommitment, useDeleteCommitment, getListCommitmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarClock, Plus, Trash2, CheckCircle2, Clock, Pencil, ArrowRight, Home as HomeIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { getCurrency } from "@/lib/currency";

import seriousMascot from "@assets/Gemini_Generated_Image_fn3x3wfn3x3wfn3x_1777144269396.png";

type Commitment = {
  id: number;
  title: string;
  amount: number | string;
  dueDay: number;
  notes?: string | null;
  isPaid: boolean;
};

const formSchema = z.object({
  title: z.string().min(2, "الاسم مطلوب"),
  amount: z.coerce.number().min(1, "المبلغ يجب أن يكون أكبر من 0"),
  dueDay: z.coerce.number().min(1, "يوم الدفع مطلوب").max(31, "يوم غير صالح"),
  notes: z.string().optional(),
});

export default function Commitments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format, baseCurrency } = useDisplayCurrency();
  const { data: commitments, isLoading } = useListCommitments();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Commitment | null>(null);

  const createCommitment = useCreateCommitment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
        toast({ title: "تم إضافة الالتزام بنجاح" });
        setIsOpen(false);
        form.reset();
      },
    }
  });

  const updateCommitment = useUpdateCommitment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
      },
    }
  });

  const updateCommitmentEdit = useUpdateCommitment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
        toast({ title: "تم حفظ التعديلات" });
        setEditing(null);
      },
    }
  });

  const deleteCommitment = useDeleteCommitment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
        toast({ title: "تم حذف الالتزام بنجاح" });
      },
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", amount: 0, dueDay: 1, notes: "" },
  });

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", amount: 0, dueDay: 1, notes: "" },
  });

  // Repopulate edit form whenever a different commitment is opened for editing
  useEffect(() => {
    if (editing) {
      editForm.reset({
        title: editing.title,
        amount: Number(editing.amount),
        dueDay: editing.dueDay,
        notes: editing.notes ?? "",
      });
    }
  }, [editing, editForm]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createCommitment.mutate({ data: values });
  };

  const onEditSubmit = (values: z.infer<typeof formSchema>) => {
    if (!editing) return;
    updateCommitmentEdit.mutate({ id: editing.id, data: values });
  };

  const togglePaid = (id: number, currentStatus: boolean) => {
    updateCommitment.mutate({ id, data: { isPaid: !currentStatus } });
  };

  const today = new Date().getDate();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Back to home */}
      <div className="flex justify-center">
        <Link href="/app">
          <Button
            variant="outline"
            className="rounded-xl gap-2 h-9 px-4 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
            data-testid="button-back-home"
          >
            <HomeIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">العودة للرئيسية</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Button>
        </Link>
      </div>

      {/* Header — centered */}
      <div className="flex flex-col items-center text-center gap-3 bg-card/60 backdrop-blur-sm p-5 rounded-3xl border-none shadow-md">
        <img src={seriousMascot} alt="Mascot" className="w-14 h-14 rounded-full border-2 border-primary/20 object-cover shadow-sm" />
        <div>
          <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-foreground">
            <CalendarClock className="w-5 h-5 text-primary" />
            الالتزامات الثابتة
          </h1>
          <p className="text-muted-foreground text-xs mt-1">تتبع فواتيرك، إيجارك، واشتراكاتك الشهرية هنا.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-10 px-5 shadow-md hover:shadow-lg transition-all gap-2 mt-1">
              <Plus className="w-4 h-4" />
              إضافة التزام
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 border-none shadow-xl bg-card">
            <DialogHeader>
              <DialogTitle className="text-xl">إضافة التزام مالي</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم (مثال: إيجار، فاتورة كهرباء)</FormLabel>
                      <FormControl>
                        <Input placeholder="اسم الالتزام" className="h-12 rounded-xl bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المبلغ ({getCurrency(baseCurrency).code})</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0.00" className="h-12 rounded-xl bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>يوم الدفع (1-31)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="31" className="h-12 rounded-xl bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات (اختياري)</FormLabel>
                      <FormControl>
                        <Input placeholder="رقم حساب، تفاصيل أخرى" className="h-12 rounded-xl bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 rounded-xl mt-4" disabled={createCommitment.isPending}>
                  {createCommitment.isPending ? "جاري الحفظ..." : "حفظ الالتزام"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full max-w-xs rounded-2xl" />
          ))
        ) : commitments && commitments.length > 0 ? (
          commitments.map((commitment) => {
            const isLate = !commitment.isPaid && commitment.dueDay < today;
            const isSoon = !commitment.isPaid && commitment.dueDay >= today && commitment.dueDay <= today + 5;

            return (
              <Card
                key={commitment.id}
                className={`w-full max-w-xs rounded-2xl border shadow-sm transition-all overflow-hidden ${
                  commitment.isPaid
                    ? 'bg-muted/30 border-border/50 opacity-70'
                    : isLate
                      ? 'border-destructive bg-destructive/5'
                      : 'bg-card'
                }`}
                data-testid={`card-commitment-${commitment.id}`}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  {/* Status badge + day */}
                  <div className="flex items-center gap-2">
                    {commitment.isPaid ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 rounded-lg text-[11px] px-2 py-0.5">مدفوع</Badge>
                    ) : isLate ? (
                      <Badge variant="destructive" className="rounded-lg text-[11px] px-2 py-0.5">متأخر</Badge>
                    ) : isSoon ? (
                      <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 rounded-lg text-[11px] px-2 py-0.5">قريباً</Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-lg text-[11px] px-2 py-0.5">في الانتظار</Badge>
                    )}
                    <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>يوم {commitment.dueDay}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className={`text-base font-bold leading-tight ${commitment.isPaid ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {commitment.title}
                  </h3>

                  {/* Amount */}
                  <div className="text-xl font-black text-primary tabular-nums">
                    {format(commitment.amount, baseCurrency)}
                  </div>

                  {commitment.notes && (
                    <p className="text-[11px] text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-lg border border-border/50 w-full line-clamp-2">
                      {commitment.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 w-full mt-2 pt-2 border-t border-border/50">
                    <Button
                      variant={commitment.isPaid ? "outline" : "default"}
                      size="sm"
                      className={`flex-1 rounded-xl h-8 text-xs gap-1 ${commitment.isPaid ? 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30' : ''}`}
                      onClick={() => togglePaid(commitment.id, commitment.isPaid)}
                      disabled={updateCommitment.isPending}
                      data-testid={`button-toggle-paid-${commitment.id}`}
                    >
                      {commitment.isPaid ? (
                        <span>تراجع</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تحديد كمدفوع</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-primary hover:bg-primary/10 hover:border-primary/30"
                      onClick={() => setEditing({
                        id: commitment.id,
                        title: commitment.title,
                        amount: commitment.amount,
                        dueDay: commitment.dueDay,
                        notes: commitment.notes,
                        isPaid: commitment.isPaid,
                      })}
                      data-testid={`button-edit-${commitment.id}`}
                      aria-label="تعديل"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (confirm("هل تريد بالتأكيد حذف هذا الالتزام؟")) {
                          deleteCommitment.mutate({ id: commitment.id });
                        }
                      }}
                      data-testid={`button-delete-${commitment.id}`}
                      aria-label="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground bg-card/30 rounded-3xl border border-dashed border-border w-full">
            <CalendarClock className="w-16 h-16 mb-4 opacity-30 text-primary" />
            <p className="text-xl font-medium text-foreground">لا توجد التزامات مسجلة</p>
            <p className="text-sm mt-2 max-w-sm text-center">قم بتسجيل الإيجار، الاشتراكات، والفواتير الشهرية هنا لتتذكرها دائماً ولا تتأخر في السداد.</p>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 border-none shadow-xl bg-card" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-right flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              تعديل الالتزام
            </DialogTitle>
            <DialogDescription className="text-right text-xs text-muted-foreground">
              عدّلي الاسم، المبلغ، أو يوم الدفع، ثم احفظي التغييرات.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5 mt-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم</FormLabel>
                    <FormControl>
                      <Input placeholder="اسم الالتزام" className="h-11 rounded-xl bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المبلغ ({getCurrency(baseCurrency).code})</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" className="h-11 rounded-xl bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="dueDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>يوم الدفع (1-31)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="31" className="h-11 rounded-xl bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="رقم حساب، تفاصيل أخرى" className="h-11 rounded-xl bg-background" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  onClick={() => setEditing(null)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-11 rounded-xl"
                  disabled={updateCommitmentEdit.isPending}
                  data-testid="button-save-edit"
                >
                  {updateCommitmentEdit.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
