import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  useListCategories,
  getListCalendarEventsQueryKey,
} from "@workspace/api-client-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { CURRENCIES } from "@/lib/currency";
import type { CalendarEvent } from "@workspace/api-client-react";

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEvent?: CalendarEvent | null;
  defaultDate?: string;
}

const EVENT_TYPES = [
  { value: "bill", label: "فاتورة" },
  { value: "subscription", label: "اشتراك" },
  { value: "loan", label: "قسط/دين" },
  { value: "religious", label: "مناسبة دينية" },
  { value: "personal", label: "مناسبة شخصية" },
  { value: "education", label: "تعليم/مدرسة" },
  { value: "health", label: "صحة" },
  { value: "other", label: "أخرى" },
];

const RECURRING_OPTIONS = [
  { value: "none", label: "لا يتكرر" },
  { value: "monthly", label: "شهري" },
  { value: "yearly", label: "سنوي" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "منخفضة" },
  { value: "normal", label: "عادية" },
  { value: "high", label: "عالية" },
];

export function EventFormDialog({ open, onOpenChange, editEvent, defaultDate }: EventFormDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { baseCurrency } = useDisplayCurrency();
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();
  const { data: categories } = useListCategories();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("other");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [categoryId, setCategoryId] = useState<string>("none");
  const [recurring, setRecurring] = useState("none");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setDate(String(editEvent.date).slice(0, 10));
      setType(editEvent.type ?? "other");
      setAmount(editEvent.amount !== null && editEvent.amount !== undefined ? String(editEvent.amount) : "");
      setCurrency(editEvent.currency ?? baseCurrency);
      setCategoryId(editEvent.categoryId !== null && editEvent.categoryId !== undefined ? String(editEvent.categoryId) : "none");
      setRecurring(editEvent.recurring ?? "none");
      setPriority(editEvent.priority ?? "normal");
      setNotes(editEvent.notes ?? "");
    } else {
      setTitle("");
      setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
      setType("other");
      setAmount("");
      setCurrency(baseCurrency);
      setCategoryId("none");
      setRecurring("none");
      setPriority("normal");
      setNotes("");
    }
  }, [editEvent, defaultDate, baseCurrency, open]);

  async function invalidateEvents() {
    await qc.invalidateQueries({ queryKey: getListCalendarEventsQueryKey() });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "يرجى إدخال اسم الحدث", variant: "destructive" });
      return;
    }

    const amtNum = amount.trim() ? parseFloat(amount) : null;
    const parsedCategoryId = categoryId !== "none" ? parseInt(categoryId, 10) : null;
    const payload = {
      title: title.trim(),
      date,
      type: type as "bill" | "subscription" | "loan" | "religious" | "personal" | "education" | "health" | "other",
      amount: amtNum,
      currency,
      categoryId: parsedCategoryId,
      recurring: recurring as "none" | "monthly" | "yearly",
      priority: priority as "low" | "normal" | "high",
      notes: notes.trim() || null,
      isPaid: editEvent?.isPaid ?? false,
    };

    if (editEvent) {
      await updateEvent.mutateAsync({ id: editEvent.id, data: payload });
      toast({ title: "تم تحديث الحدث" });
    } else {
      await createEvent.mutateAsync({ data: payload });
      toast({ title: "تمت إضافة الحدث" });
    }

    await invalidateEvents();
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!editEvent) return;
    await deleteEvent.mutateAsync({ id: editEvent.id });
    await invalidateEvents();
    toast({ title: "تم حذف الحدث" });
    setShowDeleteConfirm(false);
    onOpenChange(false);
  }

  const isPending = createEvent.isPending || updateEvent.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent dir="rtl" className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEvent ? "تعديل الحدث" : "إضافة حدث جديد"}</DialogTitle>
            <DialogDescription className="sr-only">
              {editEvent ? "عدّل تفاصيل الحدث المالي" : "أضف حدثًا ماليًا جديدًا إلى التقويم"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">اسم الحدث</Label>
              <Input
                id="ev-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: عيد الفطر"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-date">التاريخ</Label>
              <Input
                id="ev-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-type">النوع</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="ev-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ev-priority">الأولوية</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="ev-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-category">الفئة (اختياري)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="ev-category">
                  <SelectValue placeholder="بدون فئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون فئة</SelectItem>
                  {(categories ?? []).map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-amount">المبلغ (اختياري)</Label>
                <Input
                  id="ev-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ev-currency">العملة</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="ev-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.arabicName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-recurring">التكرار</Label>
              <Select value={recurring} onValueChange={setRecurring}>
                <SelectTrigger id="ev-recurring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRING_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-notes">ملاحظات (اختياري)</Label>
              <Textarea
                id="ev-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي تفاصيل إضافية..."
                rows={2}
                className="resize-none"
              />
            </div>

            <DialogFooter className="flex flex-row-reverse gap-2 pt-1">
              <Button type="submit" disabled={isPending}>
                {isPending ? "جاري الحفظ..." : editEvent ? "حفظ التعديلات" : "إضافة"}
              </Button>
              {editEvent && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isPending}
                >
                  حذف
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحدث؟</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{editEvent?.title}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteEvent.isPending}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
