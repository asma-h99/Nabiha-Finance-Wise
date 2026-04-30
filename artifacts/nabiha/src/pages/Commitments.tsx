import { useState, useEffect, useMemo } from "react";
import { Link, useSearch } from "wouter";
import {
  useListCommitments,
  useCreateCommitment,
  useUpdateCommitment,
  useDeleteCommitment,
  getListCommitmentsQueryKey,
  useListCategories,
  useCreateCategory,
  useDeleteCategory,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  CalendarClock,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Pencil,
  ArrowRight,
  Home as HomeIcon,
  Tags,
  Hash,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { getCurrency } from "@/lib/currency";

import seriousMascot from "@assets/Gemini_Generated_Image_fn3x3wfn3x3wfn3x_1777144269396.png";
import smilingMascot from "@assets/Gemini_Generated_Image_7vmi4u7vmi4u7vmi_1777144269396.png";

type Commitment = {
  id: number;
  title: string;
  amount: number | string;
  dueDay: number;
  notes?: string | null;
  isPaid: boolean;
};

const commitmentSchema = z.object({
  title: z.string().min(2, "الاسم مطلوب"),
  amount: z.coerce.number().min(1, "المبلغ يجب أن يكون أكبر من 0"),
  dueDay: z.coerce.number().min(1, "يوم الدفع مطلوب").max(31, "يوم غير صالح"),
  notes: z.string().optional(),
});

const categorySchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export default function Commitments() {
  const search = useSearch();
  const initialTab = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("tab") === "categories" ? "categories" : "commitments";
  }, [search]);

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

      <Tabs defaultValue={initialTab} className="w-full" dir="rtl">
        <div className="flex justify-center">
          <TabsList className="h-11 rounded-2xl bg-primary/10 p-1 gap-1">
            <TabsTrigger
              value="commitments"
              className="rounded-xl px-5 h-9 text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              data-testid="tab-commitments"
            >
              <CalendarClock className="w-4 h-4" />
              الالتزامات
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="rounded-xl px-5 h-9 text-sm font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              data-testid="tab-categories"
            >
              <Tags className="w-4 h-4" />
              الفئات
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="commitments" className="mt-5">
          <CommitmentsPanel />
        </TabsContent>

        <TabsContent value="categories" className="mt-5">
          <CategoriesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Commitments panel                              */
/* -------------------------------------------------------------------------- */

function CommitmentsPanel() {
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
    },
  });

  const updateCommitment = useUpdateCommitment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
      },
    },
  });

  const updateCommitmentEdit = useUpdateCommitment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
        toast({ title: "تم حفظ التعديلات" });
        setEditing(null);
      },
    },
  });

  const deleteCommitment = useDeleteCommitment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
        toast({ title: "تم حذف الالتزام بنجاح" });
      },
    },
  });

  const form = useForm<z.infer<typeof commitmentSchema>>({
    resolver: zodResolver(commitmentSchema),
    defaultValues: { title: "", amount: 0, dueDay: 1, notes: "" },
  });

  const editForm = useForm<z.infer<typeof commitmentSchema>>({
    resolver: zodResolver(commitmentSchema),
    defaultValues: { title: "", amount: 0, dueDay: 1, notes: "" },
  });

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

  const onSubmit = (values: z.infer<typeof commitmentSchema>) => {
    createCommitment.mutate({ data: values });
  };

  const onEditSubmit = (values: z.infer<typeof commitmentSchema>) => {
    if (!editing) return;
    updateCommitmentEdit.mutate({ id: editing.id, data: values });
  };

  const togglePaid = (id: number, currentStatus: boolean) => {
    updateCommitment.mutate({ id, data: { isPaid: !currentStatus } });
  };

  const today = new Date().getDate();

  return (
    <div className="space-y-5">
      {/* Header — centered */}
      <div className="flex flex-col items-center text-center gap-3 bg-card/60 backdrop-blur-sm p-5 rounded-3xl border-none shadow-md">
        <img
          src={seriousMascot}
          alt="Mascot"
          className="w-14 h-14 rounded-full border-2 border-primary/20 object-cover shadow-sm"
        />
        <div>
          <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-foreground">
            <CalendarClock className="w-5 h-5 text-primary" />
            الالتزامات الثابتة
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            تتبع فواتيرك، إيجارك، واشتراكاتك الشهرية هنا.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-10 px-5 shadow-md hover:shadow-lg transition-all gap-2 mt-1">
              <Plus className="w-4 h-4" />
              إضافة التزام
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[425px] rounded-3xl p-6 border-none shadow-xl bg-card"
            dir="rtl"
          >
            <DialogHeader>
              <DialogTitle className="text-xl text-right">إضافة التزام مالي</DialogTitle>
              <DialogDescription className="text-right text-xs text-muted-foreground">
                أدخلي اسم الالتزام، المبلغ، ويوم الدفع الشهري.
              </DialogDescription>
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
                        <Input
                          placeholder="اسم الالتزام"
                          className="h-11 rounded-xl bg-background"
                          {...field}
                        />
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
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="h-11 rounded-xl bg-background"
                            {...field}
                          />
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
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            className="h-11 rounded-xl bg-background"
                            {...field}
                          />
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
                        <Input
                          placeholder="رقم حساب، تفاصيل أخرى"
                          className="h-11 rounded-xl bg-background"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl mt-3"
                  disabled={createCommitment.isPending}
                >
                  {createCommitment.isPending ? "جاري الحفظ..." : "حفظ الالتزام"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full max-w-xs rounded-2xl" />
          ))
        ) : commitments && commitments.length > 0 ? (
          commitments.map((commitment) => {
            const isLate = !commitment.isPaid && commitment.dueDay < today;
            const isSoon =
              !commitment.isPaid &&
              commitment.dueDay >= today &&
              commitment.dueDay <= today + 5;

            return (
              <Card
                key={commitment.id}
                className={`w-full max-w-xs rounded-2xl border shadow-sm transition-all overflow-hidden ${
                  commitment.isPaid
                    ? "bg-muted/30 border-border/50 opacity-70"
                    : isLate
                    ? "border-destructive bg-destructive/5"
                    : "bg-card"
                }`}
                data-testid={`card-commitment-${commitment.id}`}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="flex items-center gap-2">
                    {commitment.isPaid ? (
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20 rounded-lg text-[11px] px-2 py-0.5"
                      >
                        مدفوع
                      </Badge>
                    ) : isLate ? (
                      <Badge variant="destructive" className="rounded-lg text-[11px] px-2 py-0.5">
                        متأخر
                      </Badge>
                    ) : isSoon ? (
                      <Badge
                        variant="secondary"
                        className="bg-accent/10 text-accent border-accent/20 rounded-lg text-[11px] px-2 py-0.5"
                      >
                        قريباً
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-lg text-[11px] px-2 py-0.5">
                        في الانتظار
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>يوم {commitment.dueDay}</span>
                    </div>
                  </div>

                  <h3
                    className={`text-base font-bold leading-tight ${
                      commitment.isPaid ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {commitment.title}
                  </h3>

                  <div className="text-xl font-black text-primary tabular-nums">
                    {format(commitment.amount, baseCurrency)}
                  </div>

                  {commitment.notes && (
                    <p className="text-[11px] text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-lg border border-border/50 w-full line-clamp-2">
                      {commitment.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 w-full mt-2 pt-2 border-t border-border/50">
                    <Button
                      variant={commitment.isPaid ? "outline" : "default"}
                      size="sm"
                      className={`flex-1 rounded-xl h-8 text-xs gap-1 ${
                        commitment.isPaid
                          ? "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                          : ""
                      }`}
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
                      onClick={() =>
                        setEditing({
                          id: commitment.id,
                          title: commitment.title,
                          amount: commitment.amount,
                          dueDay: commitment.dueDay,
                          notes: commitment.notes,
                          isPaid: commitment.isPaid,
                        })
                      }
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
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-muted-foreground bg-card/30 rounded-3xl border border-dashed border-border w-full">
            <CalendarClock className="w-14 h-14 mb-3 opacity-30 text-primary" />
            <p className="text-lg font-medium text-foreground">لا توجد التزامات مسجلة</p>
            <p className="text-xs mt-1.5 max-w-sm text-center">
              قم بتسجيل الإيجار، الاشتراكات، والفواتير الشهرية هنا لتتذكرها دائماً.
            </p>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent
          className="sm:max-w-[425px] rounded-3xl p-6 border-none shadow-xl bg-card"
          dir="rtl"
        >
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
                      <Input
                        placeholder="اسم الالتزام"
                        className="h-11 rounded-xl bg-background"
                        {...field}
                      />
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
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="h-11 rounded-xl bg-background"
                          {...field}
                        />
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
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          className="h-11 rounded-xl bg-background"
                          {...field}
                        />
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
                      <Input
                        placeholder="رقم حساب، تفاصيل أخرى"
                        className="h-11 rounded-xl bg-background"
                        {...field}
                        value={field.value ?? ""}
                      />
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

/* -------------------------------------------------------------------------- */
/*                              Categories panel                              */
/* -------------------------------------------------------------------------- */

const DEFAULT_CATEGORY_COLORS = [
  "#1B7E63", // brand emerald
  "#0d9488", // teal
  "#10b981", // mint
  "#f59e0b", // gold accent
  "#047857", // forest
  "#0891b2", // ocean
];

function CategoriesPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: categories, isLoading } = useListCategories();

  const [isOpen, setIsOpen] = useState(false);

  const createCategory = useCreateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        toast({ title: "تم إضافة الفئة بنجاح" });
        setIsOpen(false);
        form.reset();
      },
    },
  });

  const deleteCategory = useDeleteCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        toast({ title: "تم حذف الفئة بنجاح" });
      },
    },
  });

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", color: DEFAULT_CATEGORY_COLORS[0], icon: "" },
  });

  const onSubmit = (values: z.infer<typeof categorySchema>) => {
    createCategory.mutate({ data: values });
  };

  return (
    <div className="space-y-5">
      {/* Header — centered */}
      <div className="flex flex-col items-center text-center gap-3 bg-card/60 backdrop-blur-sm p-5 rounded-3xl border-none shadow-md">
        <img
          src={smilingMascot}
          alt="Mascot"
          className="w-14 h-14 rounded-full border-2 border-primary/20 object-cover shadow-sm"
        />
        <div>
          <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-foreground">
            <Tags className="w-5 h-5 text-primary" />
            فئات المصاريف
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            خصّصي وصنّفي أبواب الصرف لمتابعة أوضح وتحليل أدق.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-10 px-5 shadow-md hover:shadow-lg transition-all gap-2 mt-1">
              <Plus className="w-4 h-4" />
              إضافة فئة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[425px] rounded-3xl p-6 border-none shadow-xl bg-card"
            dir="rtl"
          >
            <DialogHeader>
              <DialogTitle className="text-xl text-right">إضافة فئة</DialogTitle>
              <DialogDescription className="text-right text-xs text-muted-foreground">
                أعطي الفئة اسماً ولوناً مميزاً يساعدك على تمييزها بسرعة.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الفئة</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="مثال: مطاعم، مقاضي، بنزين"
                          className="h-11 rounded-xl bg-background"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اللون المميز</FormLabel>
                        <FormControl>
                          <Input
                            type="color"
                            className="h-11 w-full p-1 rounded-xl cursor-pointer bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الرمز (اختياري)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="رموز، أيقونات..."
                            className="h-11 rounded-xl text-left bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl mt-3"
                  disabled={createCategory.isPending}
                >
                  {createCategory.isPending ? "جاري الإضافة..." : "إضافة الفئة"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 justify-items-center">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full max-w-xs rounded-2xl" />
          ))
        ) : categories && categories.length > 0 ? (
          categories.map((category) => (
            <Card
              key={category.id}
              className="w-full max-w-xs rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all group overflow-hidden bg-card"
              data-testid={`card-category-${category.id}`}
            >
              <CardContent className="p-0 flex items-stretch h-full">
                <div
                  className="w-2 flex-shrink-0"
                  style={{ backgroundColor: category.color || "#1B7E63" }}
                />
                <div className="p-4 flex-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-base shadow-inner border border-border/50 shrink-0">
                      {category.icon ? (
                        category.icon
                      ) : (
                        <Hash className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="font-semibold text-sm text-foreground truncate">
                      {category.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if (confirm("هل أنت متأكد من حذف هذه الفئة؟")) {
                        deleteCategory.mutate({ id: category.id });
                      }
                    }}
                    disabled={deleteCategory.isPending}
                    data-testid={`button-delete-category-${category.id}`}
                    aria-label="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-muted-foreground bg-card/30 rounded-3xl border border-dashed border-border w-full">
            <Tags className="w-14 h-14 mb-3 opacity-30 text-primary" />
            <p className="text-lg font-medium text-foreground">لم تقومي بإضافة أي فئات بعد</p>
            <p className="text-xs mt-1.5 max-w-sm text-center">
              ابدأ بتصنيف مصاريفك لتتبع أفضل.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
