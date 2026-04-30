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
/*                        Emoji helpers & keyword map                         */
/* -------------------------------------------------------------------------- */

/** Returns true only if the string contains at least one real emoji character */
function isActualEmoji(str: string): boolean {
  return /\p{Extended_Pictographic}/u.test(str);
}

const EMOJI_MAP: { keywords: string[]; emoji: string }[] = [
  { keywords: ["مطعم", "طعام", "أكل", "غداء", "عشاء", "وجبة", "فطور", "كافيه", "مقهى", "لانش"], emoji: "🍽️" },
  { keywords: ["مقاضي", "بقال", "سوبر", "جمعية", "سوق", "خضار", "فواكه", "تسوق", "شراء"], emoji: "🛒" },
  { keywords: ["بنزين", "وقود", "سيارة", "محروقات", "ديزل", "محطة"], emoji: "⛽" },
  { keywords: ["صحة", "دواء", "طبيب", "مستشفى", "عيادة", "علاج", "صيدلية"], emoji: "💊" },
  { keywords: ["كهرباء", "كهربا"], emoji: "⚡" },
  { keywords: ["فاتورة", "اشتراك", "خدمات"], emoji: "📄" },
  { keywords: ["ماء", "مياه", "شرب"], emoji: "💧" },
  { keywords: ["إيجار", "ايجار", "بيت", "شقة", "سكن", "منزل", "عقار"], emoji: "🏠" },
  { keywords: ["سفر", "طيران", "تذكرة", "رحلة", "اجازة", "سياحة", "فندق"], emoji: "✈️" },
  { keywords: ["ترفيه", "ترفية", "سينما", "مسرح", "ألعاب", "نتفليكس", "شاهد", "يوتيوب"], emoji: "🎬" },
  { keywords: ["ملابس", "لبس", "أزياء", "موضة", "ثياب"], emoji: "👗" },
  { keywords: ["تعليم", "دراسة", "مدرسة", "جامعة", "كتب", "قرطاسية", "دروس", "تنظيم"], emoji: "📚" },
  { keywords: ["انترنت", "إنترنت", "نت", "اتصالات", "جوال", "هاتف", "موبايل", "رصيد"], emoji: "📱" },
  { keywords: ["رياضة", "نادي", "جيم", "صالة", "تمرين"], emoji: "🏋️" },
  { keywords: ["قهوة", "شاي", "مشروبات", "عصير"], emoji: "☕" },
  { keywords: ["هدايا", "هدية", "عيدية", "مناسبة", "حفلة"], emoji: "🎁" },
  { keywords: ["أقساط", "قسط", "بنك", "قرض", "تمويل", "ديون"], emoji: "🏦" },
  { keywords: ["صيانة", "تصليح", "تعمير", "اصلاح"], emoji: "🔧" },
  { keywords: ["أطفال", "طفل", "حضانة", "حليب", "حفاضات"], emoji: "👶" },
  { keywords: ["تأمين", "تامين", "بوليصة"], emoji: "🛡️" },
  { keywords: ["مواصلات", "تاكسي", "باص", "حافلة", "اوبر", "كريم", "نقل"], emoji: "🚌" },
  { keywords: ["تجميل", "صالون", "حلاقة", "عناية", "مكياج", "عطر"], emoji: "💄" },
  { keywords: ["حيوانات", "قطة", "كلب", "حيوان", "بيطري"], emoji: "🐾" },
  { keywords: ["متفرقات", "أخرى", "عام", "مصاريف"], emoji: "📦" },
];

function getCategoryEmoji(name: string, icon?: string | null): string {
  // Only use the stored icon if it's a real emoji character, not a plain-text icon name
  if (icon && icon.trim() && isActualEmoji(icon.trim())) return icon.trim();
  const lower = name.toLowerCase();
  for (const entry of EMOJI_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.emoji;
  }
  return "📂";
}

/* -------------------------------------------------------------------------- */
/*                                  Schemas                                   */
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
/*                                Main page                                   */
/* -------------------------------------------------------------------------- */

export default function Commitments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format, baseCurrency } = useDisplayCurrency();

  const { data: commitments, isLoading: loadingCommitments } = useListCommitments();
  const { data: categories, isLoading: loadingCategories } = useListCategories();

  /* ---------- commitment dialogs ---------- */
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Commitment | null>(null);

  const createCommitment = useCreateCommitment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
        toast({ title: "تم إضافة الالتزام بنجاح" });
        setAddOpen(false);
        addForm.reset();
      },
    },
  });

  const updateCommitment = useUpdateCommitment({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() }),
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

  const addForm = useForm<z.infer<typeof commitmentSchema>>({
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

  /* ---------- category dialog ---------- */
  const [catOpen, setCatOpen] = useState(false);

  const createCategory = useCreateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        toast({ title: "تم إضافة الفئة بنجاح" });
        setCatOpen(false);
        catForm.reset();
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

  const catForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", color: "#1B7E63", icon: "" },
  });

  const today = new Date().getDate();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Back to home ─────────────────────────────────────────────── */}
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

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center gap-3 bg-card/60 backdrop-blur-sm p-5 rounded-3xl shadow-md">
        <img
          src={seriousMascot}
          alt="Mascot"
          className="w-12 h-12 rounded-full border-2 border-primary/20 object-cover shadow-sm"
        />
        <div>
          <h1 className="text-lg font-bold flex items-center justify-center gap-2 text-foreground">
            <CalendarClock className="w-4 h-4 text-primary" />
            الالتزامات والفئات
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            تتبّعي فواتيرك الشهرية وصنّفي مصاريفك بفئات واضحة.
          </p>
        </div>

        {/* Add buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-9 px-4 gap-1.5 text-sm shadow-sm">
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
              <Form {...addForm}>
                <form
                  onSubmit={addForm.handleSubmit((v) => createCommitment.mutate({ data: v }))}
                  className="space-y-4 mt-4"
                >
                  <FormField control={addForm.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم</FormLabel>
                      <FormControl>
                        <Input placeholder="إيجار، فاتورة كهرباء..." className="h-11 rounded-xl bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={addForm.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>المبلغ ({getCurrency(baseCurrency).code})</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" className="h-11 rounded-xl bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={addForm.control} name="dueDay" render={({ field }) => (
                      <FormItem>
                        <FormLabel>يوم الدفع (1–31)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="31" className="h-11 rounded-xl bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={addForm.control} name="notes" render={({ field }) => (
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

          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl h-9 px-4 gap-1.5 text-sm border-primary/25 hover:bg-primary/5">
                <Tags className="w-4 h-4 text-primary" />
                إضافة فئة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 border-none shadow-xl bg-card" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl text-right">إضافة فئة جديدة</DialogTitle>
                <DialogDescription className="text-right text-xs text-muted-foreground">
                  أعطي الفئة اسماً ولوناً — سيظهر كأيقونة في شريط الفئات.
                </DialogDescription>
              </DialogHeader>
              <Form {...catForm}>
                <form
                  onSubmit={catForm.handleSubmit((v) => createCategory.mutate({ data: v }))}
                  className="space-y-4 mt-4"
                >
                  <FormField control={catForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الفئة</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: مطاعم، مقاضي، بنزين" className="h-11 rounded-xl bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={catForm.control} name="color" render={({ field }) => (
                      <FormItem>
                        <FormLabel>اللون</FormLabel>
                        <FormControl>
                          <Input type="color" className="h-11 w-full p-1 rounded-xl cursor-pointer bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={catForm.control} name="icon" render={({ field }) => (
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
      </div>

      {/* ── Categories bar (ABOVE commitment cards) ───────────────────── */}
      <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-primary/8 px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Tags className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">فئات المصاريف</span>
            {categories && categories.length > 0 && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                {categories.length}
              </span>
            )}
          </div>
        </div>

        {/* Chips */}
        {loadingCategories ? (
          <div className="flex gap-3 flex-wrap">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-14 h-18 rounded-2xl" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="flex gap-4 flex-wrap justify-center">
            {categories.map((category) => {
              const emoji = getCategoryEmoji(category.name, category.icon);
              const color = category.color ?? "#1B7E63";

              return (
                <div
                  key={category.id}
                  className="group flex flex-col items-center gap-1.5 cursor-default select-none"
                  data-testid={`chip-category-${category.id}`}
                >
                  {/* Icon square */}
                  <div className="relative">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border transition-all group-hover:scale-105 group-hover:shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${color}28 0%, ${color}18 100%)`,
                        borderColor: `${color}35`,
                      }}
                    >
                      <span
                        className="text-[2rem] leading-none select-none"
                        role="img"
                        aria-label={category.name}
                      >
                        {emoji}
                      </span>
                    </div>

                    {/* Delete badge — top-left (RTL-aware) */}
                    <button
                      className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-destructive/90 hover:bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                      onClick={() => {
                        if (confirm(`حذف فئة "${category.name}"؟`)) {
                          deleteCategory.mutate({ id: category.id });
                        }
                      }}
                      disabled={deleteCategory.isPending}
                      data-testid={`button-delete-category-${category.id}`}
                      aria-label={`حذف ${category.name}`}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Name label */}
                  <span
                    className="text-[11px] font-bold text-center leading-tight max-w-[3.5rem] line-clamp-2"
                    style={{ color }}
                  >
                    {category.name}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-5 text-muted-foreground">
            <Tags className="w-7 h-7 opacity-25 text-primary" />
            <p className="text-xs text-center">أضيفي فئة لتصنيف مصاريفك بشكل أوضح.</p>
          </div>
        )}
      </div>

      {/* ── Commitment cards (BELOW categories bar) ──────────────────── */}
      <div className="flex flex-wrap gap-4 justify-center">
        {loadingCommitments ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-[17rem] rounded-2xl flex-shrink-0" />
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
                  {/* Status + due day */}
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {commitment.isPaid ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 rounded-lg text-[10px] px-2 py-0.5">
                        مدفوع ✓
                      </Badge>
                    ) : isLate ? (
                      <Badge variant="destructive" className="rounded-lg text-[10px] px-2 py-0.5">متأخر!</Badge>
                    ) : isSoon ? (
                      <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 rounded-lg text-[10px] px-2 py-0.5">
                        قريباً
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-lg text-[10px] px-2 py-0.5">في الانتظار</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> يوم {commitment.dueDay}
                    </span>
                  </div>

                  <h3
                    className={`text-sm font-bold leading-snug ${
                      commitment.isPaid ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
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
                      onClick={() =>
                        updateCommitment.mutate({
                          id: commitment.id,
                          data: { isPaid: !commitment.isPaid },
                        })
                      }
                      disabled={updateCommitment.isPending}
                      data-testid={`button-toggle-paid-${commitment.id}`}
                    >
                      {commitment.isPaid ? (
                        "تراجع"
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          تحديد كمدفوع
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
                        if (confirm("هل تريد بالتأكيد حذف هذا الالتزام؟"))
                          deleteCommitment.mutate({ id: commitment.id });
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
          <div className="w-full py-14 flex flex-col items-center justify-center text-muted-foreground bg-card/30 rounded-3xl border border-dashed border-border">
            <CalendarClock className="w-12 h-12 mb-3 opacity-25 text-primary" />
            <p className="text-base font-medium text-foreground">لا توجد التزامات مسجلة</p>
            <p className="text-xs mt-1.5 max-w-xs text-center">
              قومي بتسجيل الإيجار، الاشتراكات، والفواتير الشهرية لتتذكريها دائماً.
            </p>
          </div>
        )}
      </div>

      {/* ── Edit dialog ──────────────────────────────────────────────── */}
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
            <form
              onSubmit={editForm.handleSubmit((v) => {
                if (editing) updateCommitmentEdit.mutate({ id: editing.id, data: v });
              })}
              className="space-y-4 mt-4"
            >
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
                    <Input
                      placeholder="رقم حساب، تفاصيل..."
                      className="h-11 rounded-xl bg-background"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setEditing(null)}>
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
