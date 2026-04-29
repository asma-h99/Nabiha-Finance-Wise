import React, { useState } from "react";
import { useListCommitments, useCreateCommitment, useUpdateCommitment, useDeleteCommitment, getListCommitmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarClock, Plus, Trash2, CheckCircle2, Circle, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { getCurrency } from "@/lib/currency";

import seriousMascot from "@assets/Gemini_Generated_Image_fn3x3wfn3x3wfn3x_1777144269396.png";

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

  const deleteCommitment = useDeleteCommitment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
        toast({ title: "تم حذف الالتزام بنجاح" });
      },
    }
  });

  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: 0,
      dueDay: 1,
      notes: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createCommitment.mutate({ data: values });
  };

  const togglePaid = (id: number, currentStatus: boolean) => {
    updateCommitment.mutate({ id, data: { isPaid: !currentStatus } });
  };

  const today = new Date().getDate();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-sm p-6 rounded-3xl border-none shadow-md">
        <div className="flex items-center gap-4">
          <img src={seriousMascot} alt="Mascot" className="w-16 h-16 rounded-full border-2 border-primary/20 object-cover shadow-sm" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <CalendarClock className="w-6 h-6 text-primary" />
              الالتزامات الثابتة
            </h1>
            <p className="text-muted-foreground text-sm mt-1">تتبع فواتيرك، إيجارك، واشتراكاتك الشهرية هنا.</p>
          </div>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-12 px-6 shadow-md hover:shadow-lg transition-all" size="lg">
              <Plus className="w-5 h-5 ml-2" />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-3xl" />
          ))
        ) : commitments && commitments.length > 0 ? (
          commitments.map((commitment) => {
            const isLate = !commitment.isPaid && commitment.dueDay < today;
            const isSoon = !commitment.isPaid && commitment.dueDay >= today && commitment.dueDay <= today + 5;
            
            return (
              <Card key={commitment.id} className={`rounded-3xl border shadow-sm transition-all overflow-hidden ${
                commitment.isPaid 
                  ? 'bg-muted/30 border-border/50 opacity-70' 
                  : isLate 
                    ? 'border-destructive bg-destructive/5' 
                    : 'bg-card'
              }`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className={`text-xl font-bold ${commitment.isPaid ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {commitment.title}
                      </h3>
                      <div className="text-2xl font-black mt-2 text-primary">
                        {format(commitment.amount, baseCurrency)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex flex-col items-end gap-2">
                        {commitment.isPaid ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 rounded-lg">مدفوع</Badge>
                        ) : isLate ? (
                          <Badge variant="destructive" className="rounded-lg">متأخر</Badge>
                        ) : isSoon ? (
                          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 rounded-lg">قريباً</Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-lg">في الانتظار</Badge>
                        )}
                        <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground mt-1">
                          <Clock className="w-4 h-4" />
                          <span>يوم {commitment.dueDay}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {commitment.notes && (
                    <p className="text-sm text-muted-foreground mb-6 bg-secondary/50 p-3 rounded-xl border border-border/50">
                      {commitment.notes}
                    </p>
                  )}
                  
                  <div className="flex gap-2 mt-auto pt-4 border-t border-border/50">
                    <Button 
                      variant={commitment.isPaid ? "outline" : "default"} 
                      className={`flex-1 rounded-xl h-11 ${commitment.isPaid ? 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30' : ''}`}
                      onClick={() => togglePaid(commitment.id, commitment.isPaid)}
                      disabled={updateCommitment.isPending}
                    >
                      {commitment.isPaid ? (
                        <>تراجع كغير مدفوع</>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 ml-2" />
                          تحديد كمدفوع
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-11 w-11 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (confirm("هل تريد بالتأكيد حذف هذا الالتزام؟")) {
                          deleteCommitment.mutate({ id: commitment.id });
                        }
                      }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground bg-card/30 rounded-3xl border border-dashed border-border">
            <CalendarClock className="w-16 h-16 mb-4 opacity-30 text-primary" />
            <p className="text-xl font-medium text-foreground">لا توجد التزامات مسجلة</p>
            <p className="text-sm mt-2 max-w-sm text-center">قم بتسجيل الإيجار، الاشتراكات، والفواتير الشهرية هنا لتتذكرها دائماً ولا تتأخر في السداد.</p>
          </div>
        )}
      </div>
    </div>
  );
}
