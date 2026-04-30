import { useState, useEffect } from "react";
import { Link } from "wouter";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { getCurrency } from "@/lib/currency";

import seriousMascot from "@assets/Gemini_Generated_Image_fn3x3wfn3x3wfn3x_1777144269396.png";

/* -------------------------------------------------------------------------- */
/*                           Emoji lookup for Arabic category names            */
/* -------------------------------------------------------------------------- */

const EMOJI_MAP: { keywords: string[]; emoji: string }[] = [
  { keywords: ["مطعم", "طعام", "أكل", "غداء", "عشاء", "وجبة", "فطور", "كافيه", "مقهى", "كافيتيريا", "فطر", "لانش", "دينر", "بفيه"], emoji: "🍽️" },
  { keywords: ["مقاضي", "بقال", "سوبر", "جمعية", "سوق", "خضار", "فواكه", "تسوق", "شراء", "خضروات"], emoji: "🛒" },
  { keywords: ["بنزين", "وقود", "سيارة", "محروقات", "ديزل", "بترول", "تعبئة", "وقف", "محطة"], emoji: "⛽" },
  { keywords: ["صحة", "دواء", "طبيب", "مستشفى", "عيادة", "فحص", "علاج", "صيدلية", "اشعة", "مختبر", "تامين"], emoji: "💊" },
  { keywords: ["كهرباء", "فاتورة", "اشتراك", "كهربا", "خدمات", "utility"], emoji: "⚡" },
  { keywords: ["ماء", "مياه", "شرب", "صرف", "تصريف"], emoji: "💧" },
  { keywords: ["إيجار", "ايجار", "بيت", "شقة", "سكن", "منزل", "عقار", "house"], emoji: "🏠" },
  { keywords: ["سفر", "طيران", "تذكرة", "رحلة", "اجازة", "سياحة", "فندق"], emoji: "✈️" },
  { keywords: ["ترفيه", "سينما", "مسرح", "ألعاب", "لعبة", "نت", "نتفليكس", "شاهد", "اشتراك", "يوتيوب"], emoji: "🎬" },
  { keywords: ["ملابس", "لبس", "أزياء", "موضة", "ثياب", "تسوق"], emoji: "👗" },
  { keywords: ["تعليم", "دراسة", "مدرسة", "جامعة", "كتب", "قرطاسية", "دروس", "تدريس", "أقساط"], emoji: "📚" },
  { keywords: ["انترنت", "إنترنت", "نت", "اتصالات", "جوال", "هاتف", "موبايل", "خط", "رصيد", "زين", "اورنج", "عمانتيل", "stc", "وي"], emoji: "📱" },
  { keywords: ["رياضة", "نادي", "جيم", "صالة", "تمرين", "اشتراك", "gym"], emoji: "🏋️" },
  { keywords: ["مصاريف", "متفرقات", "أخرى", "عام", "general"], emoji: "📦" },
  { keywords: ["قهوة", "شاي", "مشروبات", "مشروب", "عصير"], emoji: "☕" },
  { keywords: ["هدايا", "هدية", "عيدية", "مناسبة", "حفلة"], emoji: "🎁" },
  { keywords: ["أقساط", "قسط", "بنك", "قرض", "تمويل", "ديون", "دين"], emoji: "🏦" },
  { keywords: ["صيانة", "تصليح", "تعمير", "اصلاح", "خدمة"], emoji: "🔧" },
  { keywords: ["أطفال", "طفل", "حضانة", "مدرسة", "حليب", "حفاضات"], emoji: "👶" },
  { keywords: ["تأمين", "بوليصة", "تامين"], emoji: "🛡️" },
  { keywords: ["مواصلات", "تاكسي", "باص", "حافلة", "اوبر", "كريم", "نقل"], emoji: "🚌" },
  { keywords: ["تجميل", "صالون", "حلاقة", "عناية", "مكياج", "عطر"], emoji: "💄" },
  { keywords: ["حيوانات", "قطة", "كلب", "حيوان", "بيطري", "طعام الحيوانات"], emoji: "🐾" },
];

function getCategoryEmoji(name: string, icon?: string | null): string {
  if (icon && icon.trim() && !icon.includes(" ")) return icon.trim();
  const lower = name.toLowerCase();
  for (const entry of EMOJI_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.emoji;
  }
  return "📂";
}

/* -------------------------------------------------------------------------- */
/*                                   Schemas                                  */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                                  Main page                                 */
/* -------------------------------------------------------------------------- */

export default function Commitments() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

      <CommitmentsSection />

      {/* Divider */}
      <div className="border-t border-primary/10" />

      <CategoriesBar />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Commitments section                             */
/* -------------------------------------------------------------------------- */

function CommitmentsSection() {
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

  const today = new Date().getDate();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3 bg-card/60 backdrop-blur-sm p-5 rounded-3xl shadow-md">
        <img
          src={seriousMascot}
          alt="Mascot"
          className="w-12 h-12 rounded-full border-2 border-primary/20 object-cover shadow-sm"
        />
        <div>
          <h1 className="text-lg font-bold flex items-center justify-center gap-2 text-foreground">
            <CalendarClock className="w-4 h-4 text-primary" />
            الالتزامات الثابتة
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            تتبّعي فواتيرك، إيجارك، واشتراكاتك الشهرية.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-9 px-4 shadow-md gap-1.5 text-sm">
              <Plus className="w-4 h-4" />
              إضافة التزام
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px] rounded-3xl p-6 border-none shadow-xl bg-card" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl text-right">إضافة التزام مالي</DialogTitle>
              <DialogDescription className="text-right text-xs text-muted-foreground">
                أدخلي اسم الالتزام، المبلغ، ويوم الدفع الشهري.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createCommitment.mutate({ data: v }))} className="space-y-4 mt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم</FormLabel>
                    <FormControl>
                      <Input placeholder="إيجار، فاتورة كهرباء..." className="h-11 rounded-xl bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>المبلغ ({getCurrency(baseCurrency).code})</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" className="h-11 rounded-xl bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dueDay" render={({ field }) => (
                    <FormItem>
                      <FormLabel>يوم الدفع (1–31)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="31" className="h-11 rounded-xl bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="رقم حساب، تفاصيل..." className="h-11 rounded-xl bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full h-11 rounded-xl" disabled={createCommitment.isPending}>
                  {createCommitment.isPending ? "جاري الحفظ..." : "حفظ الالتزام"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards — centered grid */}
      <div className="flex flex-wrap gap-4 justify-center">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-[17rem] rounded-2xl flex-shrink-0" />
          ))
        ) : commitments && commitments.length > 0 ? (
          commitments.map((commitment) => {
            const isLate = !commitment.isPaid && commitment.dueDay < today;
            const isSoon =
              !commitment.isPaid && commitment.dueDay >= today && commitment.dueDay <= today + 5;

            return (
              <Card
                key={commitment.id}
                className={`w-[17rem] flex-shrink-0 rounded-2xl border shadow-sm transition-all overflow-hidden ${
                  commitment.isPaid
                    ? "bg-muted/30 border-border/50 opacity-70"
                    : isLate
                    ? "border-destructive/40 bg-destructive/5"
                    : "bg-card"
                }`}
                data-testid={`card-commitment-${commitment.id}`}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  {/* status + due day */}
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {commitment.isPaid ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 rounded-lg text-[10px] px-2 py-0.5">مدفوع ✓</Badge>
                    ) : isLate ? (
                      <Badge variant="destructive" className="rounded-lg text-[10px] px-2 py-0.5">متأخر!</Badge>
                    ) : isSoon ? (
                      <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 rounded-lg text-[10px] px-2 py-0.5">قريباً</Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-lg text-[10px] px-2 py-0.5">في الانتظار</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> يوم {commitment.dueDay}
                    </span>
                  </div>

                  <h3 className={`text-sm font-bold leading-snug ${commitment.isPaid ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {commitment.title}
                  </h3>

                  <div className="text-xl font-black text-primary tabular-nums">
                    {format(commitment.amount, baseCurrency)}
                  </div>

                  {commitment.notes && (
                    <p className="text-[10px] text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-lg border border-border/50 w-full line-clamp-2">
                      {commitment.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 w-full mt-2 pt-2 border-t border-border/40">
                    <Button
                      variant={commitment.isPaid ? "outline" : "default"}
                      size="sm"
                      className="flex-1 rounded-xl h-8 text-xs gap-1"
                      onClick={() => updateCommitment.mutate({ id: commitment.id, data: { isPaid: !commitment.isPaid } })}
                      disabled={updateCommitment.isPending}
                      data-testid={`button-toggle-paid-${commitment.id}`}
                    >
                      {commitment.isPaid ? "تراجع" : <><CheckCircle2 className="w-3.5 h-3.5" />تحديد كمدفوع</>}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-primary hover:bg-primary/10 hover:border-primary/30"
                      onClick={() => setEditing({ id: commitment.id, title: commitment.title, amount: commitment.amount, dueDay: commitment.dueDay, notes: commitment.notes, isPaid: commitment.isPaid })}
                      data-testid={`button-edit-${commitment.id}`}
                      aria-label="تعديل"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => { if (confirm("هل تريد بالتأكيد حذف هذا الالتزام؟")) deleteCommitment.mutate({ id: commitment.id }); }}
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
          <div className="w-full py-14 flex flex-col items-center justify-center text-muted-foreground bg-card/30 rounded-3xl border border-dashed border-border">
            <CalendarClock className="w-12 h-12 mb-3 opacity-25 text-primary" />
            <p className="text-base font-medium text-foreground">لا توجد التزامات مسجلة</p>
            <p className="text-xs mt-1.5 max-w-xs text-center">
              قومي بتسجيل الإيجار، الاشتراكات، والفواتير الشهرية لتتذكريها دائماً.
            </p>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl p-6 border-none shadow-xl bg-card" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-right flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" /> تعديل الالتزام
            </DialogTitle>
            <DialogDescription className="text-right text-xs text-muted-foreground">
              عدّلي الاسم، المبلغ، أو يوم الدفع، ثم احفظي التغييرات.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((v) => { if (editing) updateCommitmentEdit.mutate({ id: editing.id, data: v }); })} className="space-y-4 mt-4">
              <FormField control={editForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم</FormLabel>
                  <FormControl>
                    <Input placeholder="اسم الالتزام" className="h-11 rounded-xl bg-background" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={editForm.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ ({getCurrency(baseCurrency).code})</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" className="h-11 rounded-xl bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="dueDay" render={({ field }) => (
                  <FormItem>
                    <FormLabel>يوم الدفع (1–31)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="31" className="h-11 rounded-xl bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="رقم حساب، تفاصيل..." className="h-11 rounded-xl bg-background" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setEditing(null)}>إلغاء</Button>
                <Button type="submit" className="flex-1 h-11 rounded-xl" disabled={updateCommitmentEdit.isPending} data-testid="button-save-edit">
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
/*                               Categories bar                               */
/* -------------------------------------------------------------------------- */

function CategoriesBar() {
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
    defaultValues: { name: "", color: "#1B7E63", icon: "" },
  });

  return (
    <div className="space-y-4 pb-4">
      {/* Bar header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Tags className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">فئات المصاريف</span>
          {categories && categories.length > 0 && (
            <span className="text-[10px] font-bold text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
              {categories.length}
            </span>
          )}
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl h-8 px-3 gap-1 text-xs border-primary/20 hover:bg-primary/5 hover:border-primary/40">
              <Plus className="w-3.5 h-3.5" />
              إضافة فئة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 border-none shadow-xl bg-card" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl text-right">إضافة فئة جديدة</DialogTitle>
              <DialogDescription className="text-right text-xs text-muted-foreground">
                أعطي الفئة اسماً ولوناً مميزاً — سيظهر كأيقونة في الشريط.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createCategory.mutate({ data: v }))} className="space-y-4 mt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الفئة</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: مطاعم، مقاضي، بنزين" className="h-11 rounded-xl bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="color" render={({ field }) => (
                    <FormItem>
                      <FormLabel>اللون</FormLabel>
                      <FormControl>
                        <Input type="color" className="h-11 w-full p-1 rounded-xl cursor-pointer bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="icon" render={({ field }) => (
                    <FormItem>
                      <FormLabel>رمز خاص (اختياري)</FormLabel>
                      <FormControl>
                        <Input placeholder="✨ أو اتركيه فارغاً" className="h-11 rounded-xl bg-background text-center text-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl" disabled={createCategory.isPending}>
                  {createCategory.isPending ? "جاري الإضافة..." : "إضافة الفئة"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Icon chips row — centered */}
      <div className="flex flex-wrap gap-4 justify-center">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-16 h-20 rounded-2xl" />
          ))
        ) : categories && categories.length > 0 ? (
          categories.map((category) => {
            const emoji = getCategoryEmoji(category.name, category.icon);
            const bg = category.color ? `${category.color}22` : "#1B7E6322";
            const border = category.color ?? "#1B7E63";

            return (
              <div
                key={category.id}
                className="group flex flex-col items-center gap-1.5 cursor-default select-none"
                data-testid={`chip-category-${category.id}`}
              >
                {/* Icon circle */}
                <div className="relative">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm border transition-transform group-hover:scale-105"
                    style={{ backgroundColor: bg, borderColor: `${border}40` }}
                    aria-label={category.name}
                  >
                    <span role="img" aria-hidden="true" className="leading-none">
                      {emoji}
                    </span>
                  </div>
                  {/* Delete on hover */}
                  <button
                    className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    onClick={() => {
                      if (confirm("هل أنت متأكد من حذف هذه الفئة؟")) {
                        deleteCategory.mutate({ id: category.id });
                      }
                    }}
                    disabled={deleteCategory.isPending}
                    data-testid={`button-delete-category-${category.id}`}
                    aria-label={`حذف ${category.name}`}
                    title="حذف"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Label */}
                <span
                  className="text-[11px] font-semibold text-foreground text-center leading-tight max-w-[4rem] line-clamp-2"
                  style={{ color: border }}
                >
                  {category.name}
                </span>
              </div>
            );
          })
        ) : (
          <div className="w-full py-10 flex flex-col items-center gap-2 text-muted-foreground bg-card/30 rounded-2xl border border-dashed border-border">
            <Tags className="w-8 h-8 opacity-25 text-primary" />
            <p className="text-sm font-medium text-foreground">لا توجد فئات بعد</p>
            <p className="text-xs text-center max-w-xs">أضيفي فئة لتصنيف مصاريفك بشكل أوضح.</p>
          </div>
        )}
      </div>
    </div>
  );
}
