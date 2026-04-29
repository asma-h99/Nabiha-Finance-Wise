import React, { useState } from "react";
import { 
  useListExpenses, 
  useCreateExpense, 
  useDeleteExpense, 
  useListCategories,
  useGetProfile,
  getListExpensesQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { formatAmount, getCurrency } from "@/lib/currency";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Receipt, Plus, Trash2, CalendarIcon, Hash, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

import smilingMascot from "@assets/Gemini_Generated_Image_7vmi4u7vmi4u7vmi_1777144269396.png";

const formSchema = z.object({
  title: z.string().min(2, "الاسم مطلوب"),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من 0"),
  priority: z.enum(["essential", "important", "luxury"]),
  categoryId: z.coerce.number().optional().nullable(),
  date: z.string().min(1, "التاريخ مطلوب"),
  notes: z.string().optional(),
});

const PRIORITY_LABELS = {
  essential: { label: "ضرورية", color: "bg-destructive/10 text-destructive border-destructive/20" },
  important: { label: "مهمة", color: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  luxury: { label: "كمالية", color: "bg-primary/10 text-primary border-primary/20" }
};

export default function Expenses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const { data: profile } = useGetProfile();
  const currency = profile?.currency ?? "JOD";
  const currencySymbol = getCurrency(currency).symbol;

  const { data: expenses, isLoading } = useListExpenses({ 
    month: filterMonth,
    priority: filterPriority !== "all" ? (filterPriority as any) : undefined
  });
  
  const { data: categories } = useListCategories();

  const createExpense = useCreateExpense({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "تم إضافة المصروف بنجاح" });
        setIsOpen(false);
        form.reset({
          title: "",
          amount: 0,
          priority: "important",
          categoryId: undefined,
          date: new Date().toISOString().split("T")[0],
          notes: "",
        });
      },
    }
  });

  const deleteExpense = useDeleteExpense({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        toast({ title: "تم الحذف بنجاح" });
      },
    }
  });

  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: 0,
      priority: "important",
      categoryId: undefined,
      date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createExpense.mutate({ data: values });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-sm p-6 rounded-3xl border-none shadow-md">
        <div className="flex items-center gap-4">
          <img src={smilingMascot} alt="Mascot" className="w-16 h-16 rounded-full border-2 border-primary/20 object-cover shadow-sm" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Receipt className="w-6 h-6 text-primary" />
              سجل المصاريف
            </h1>
            <p className="text-muted-foreground text-sm mt-1">كل ريال محسوب، تتبع مصاريفك بوعي.</p>
          </div>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-12 px-6 shadow-md hover:shadow-lg transition-all" size="lg">
              <Plus className="w-5 h-5 ml-2" />
              إضافة مصروف
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] rounded-3xl p-6 border-none shadow-xl bg-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">تسجيل مصروف جديد</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البيان (ماذا اشتريت؟)</FormLabel>
                      <FormControl>
                        <Input placeholder="قهوة، عشاء، تذكرة..." className="h-12 rounded-xl bg-background" {...field} />
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
                        <FormLabel>المبلغ ({currencySymbol})</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" className="h-12 rounded-xl bg-background text-lg font-semibold" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>التاريخ</FormLabel>
                        <FormControl>
                          <Input type="date" className="h-12 rounded-xl bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الأولوية (هل كان ضرورياً؟)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-background">
                            <SelectValue placeholder="اختر مستوى الأولوية" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="essential">ضرورية (لا يمكن الاستغناء عنها)</SelectItem>
                          <SelectItem value="important">مهمة (تحسن جودة الحياة)</SelectItem>
                          <SelectItem value="luxury">كمالية (ترفيه ورغبات)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الفئة (اختياري)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-background">
                            <SelectValue placeholder="اختر فئة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl max-h-48">
                          {categories?.map(cat => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.icon && <span className="ml-2">{cat.icon}</span>}
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات (اختياري)</FormLabel>
                      <FormControl>
                        <Input placeholder="تفاصيل إضافية..." className="h-12 rounded-xl bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full h-12 rounded-xl mt-6 text-base font-bold shadow-md" disabled={createExpense.isPending}>
                  {createExpense.isPending ? "جاري التسجيل..." : "تسجيل المصروف"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-card/40 p-4 rounded-2xl border">
        <div className="flex items-center gap-2 text-muted-foreground mr-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">تصفية:</span>
        </div>
        
        <Input 
          type="month" 
          value={filterMonth} 
          onChange={(e) => setFilterMonth(e.target.value)}
          className="w-40 h-10 rounded-xl bg-card border-border/50"
        />
        
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40 h-10 rounded-xl bg-card border-border/50">
            <SelectValue placeholder="حسب الأولوية" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">جميع الأولويات</SelectItem>
            <SelectItem value="essential">ضرورية فقط</SelectItem>
            <SelectItem value="important">مهمة فقط</SelectItem>
            <SelectItem value="luxury">كمالية فقط</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))
        ) : expenses && expenses.length > 0 ? (
          expenses.map((expense) => {
            const priorityInfo = PRIORITY_LABELS[expense.priority as keyof typeof PRIORITY_LABELS];
            
            return (
              <Card key={expense.id} className="rounded-2xl border-none shadow-sm hover:shadow-md transition-shadow bg-card/80 group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 bg-secondary/50 rounded-xl border border-border/50">
                      <span className="text-xs font-medium text-muted-foreground">{format(new Date(expense.date), 'MMM')}</span>
                      <span className="text-lg font-bold text-foreground">{format(new Date(expense.date), 'dd')}</span>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{expense.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="sm:hidden text-xs text-muted-foreground ml-1">
                          {format(new Date(expense.date), 'yyyy-MM-dd')}
                        </span>
                        
                        <Badge variant="outline" className={`rounded-lg border font-normal ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </Badge>
                        
                        {expense.categoryName && (
                          <Badge variant="secondary" className="rounded-lg bg-secondary text-secondary-foreground font-normal border-none">
                            <Hash className="w-3 h-3 ml-1 opacity-50" />
                            {expense.categoryName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <div className="text-xl font-black text-foreground">
                        {formatAmount(expense.amount, currency)}
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (confirm("هل تريد بالتأكيد حذف هذا المصروف؟")) {
                          deleteExpense.mutate({ id: expense.id });
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
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground bg-card/30 rounded-3xl border border-dashed border-border">
            <Receipt className="w-16 h-16 mb-4 opacity-30 text-primary" />
            <p className="text-xl font-medium text-foreground">لا توجد مصاريف مسجلة</p>
            <p className="text-sm mt-2 max-w-sm text-center">لم تقم بتسجيل أي مصاريف في هذا الشهر. بداية جيدة للتوفير!</p>
          </div>
        )}
      </div>
    </div>
  );
}
