import { useState, useMemo } from "react";
import {
  useListEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useListSubscriptions,
  useListCommitments,
  useGetProfile,
  getListEventsQueryKey,
  type EventType as ApiEventType,
  type EventRecurrence,
  type Event as ApiEvent,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Repeat,
  CalendarClock,
  Bell,
  Pencil,
  ArrowRight,
} from "lucide-react";

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
const ARABIC_DAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const RECURRENCE_LABELS: Record<EventRecurrence, string> = {
  none: "بدون تكرار",
  weekly: "أسبوعي",
  monthly: "شهري",
  yearly: "سنوي",
};

const TYPE_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  bill: {
    label: "فاتورة",
    color: "text-blue-700",
    bg: "bg-blue-100",
    border: "border-blue-300",
  },
  salary: {
    label: "راتب",
    color: "text-green-700",
    bg: "bg-green-100",
    border: "border-green-300",
  },
  subscription: {
    label: "اشتراك",
    color: "text-violet-700",
    bg: "bg-violet-100",
    border: "border-violet-300",
  },
  expense: {
    label: "مصروف",
    color: "text-rose-700",
    bg: "bg-rose-100",
    border: "border-rose-300",
  },
  reminder: {
    label: "تذكير",
    color: "text-orange-700",
    bg: "bg-orange-100",
    border: "border-orange-300",
  },
  goal: {
    label: "هدف",
    color: "text-purple-700",
    bg: "bg-purple-100",
    border: "border-purple-300",
  },
};

interface CalendarItem {
  date: string;
  title: string;
  type: string;
  amount?: number;
  source: "event" | "subscription" | "commitment";
  id: number;
  recurrence?: EventRecurrence;
  recurrenceEndDate?: string | null;
  notes?: string | null;
}

function expandRecurrence(
  baseDate: string,
  recurrence: EventRecurrence,
  endDate: string | null,
  yearStart: Date,
  yearEnd: Date,
): string[] {
  if (recurrence === "none") return [baseDate];
  const dates: string[] = [];
  const start = new Date(baseDate + "T00:00:00");
  const stop = endDate ? new Date(endDate + "T00:00:00") : yearEnd;
  const cursor = new Date(start);
  let safety = 0;
  while (cursor <= yearEnd && cursor <= stop && safety++ < 600) {
    if (cursor >= yearStart) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    if (recurrence === "weekly") cursor.setDate(cursor.getDate() + 7);
    else if (recurrence === "monthly") cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setFullYear(cursor.getFullYear() + 1);
  }
  return dates;
}

interface EventFormState {
  title: string;
  date: string;
  type: ApiEventType;
  recurrence: EventRecurrence;
  recurrenceEndDate: string;
  amount: string;
  notes: string;
}

const EMPTY_EVENT_FORM: EventFormState = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  type: "bill",
  recurrence: "none",
  recurrenceEndDate: "",
  amount: "",
  notes: "",
};

export default function Calendar() {
  const { data: profile } = useGetProfile();
  const currency = profile?.currency ?? "JOD";
  const { data: events, isLoading: loadingEvents } = useListEvents();
  const { data: subs } = useListSubscriptions();
  const { data: commitments } = useListCommitments();
  const qc = useQueryClient();
  const { toast } = useToast();

  const today = new Date();
  const [view, setView] = useState<"year" | "month">("year");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventFormState>(EMPTY_EVENT_FORM);

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_EVENT_FORM);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_EVENT_FORM,
      date: new Date(viewYear, viewMonth, today.getDate())
        .toISOString()
        .slice(0, 10),
    });
    setOpen(true);
  };

  const openEdit = (e: ApiEvent) => {
    setEditingId(e.id);
    setForm({
      title: e.title,
      date: e.date,
      type: e.type,
      recurrence: e.recurrence,
      recurrenceEndDate: e.recurrenceEndDate ?? "",
      amount: e.amount != null ? String(e.amount) : "",
      notes: e.notes ?? "",
    });
    setOpen(true);
  };

  const createEvent = useCreateEvent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
        toast({ title: "تمت الإضافة" });
        closeDialog();
      },
    },
  });
  const updateEvent = useUpdateEvent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
        toast({ title: "تم الحفظ" });
        closeDialog();
      },
    },
  });
  const deleteEvent = useDeleteEvent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
        toast({ title: "تم الحذف" });
      },
    },
  });

  const handleSubmit = () => {
    if (!form.title || !form.date) return;
    const payload = {
      title: form.title,
      date: form.date,
      type: form.type,
      recurrence: form.recurrence,
      recurrenceEndDate:
        form.recurrence === "none" || !form.recurrenceEndDate
          ? null
          : form.recurrenceEndDate,
      amount: form.amount ? parseFloat(form.amount) : null,
      notes: form.notes || null,
    };
    if (editingId != null) {
      updateEvent.mutate({ id: editingId, data: payload });
    } else {
      createEvent.mutate({ data: payload });
    }
  };

  // Expand events with recurrence into per-occurrence items across the viewed year.
  const yearStart = useMemo(() => new Date(viewYear, 0, 1), [viewYear]);
  const yearEnd = useMemo(() => new Date(viewYear, 11, 31), [viewYear]);

  const allItems: CalendarItem[] = useMemo(() => {
    const items: CalendarItem[] = [];
    events?.forEach((e) => {
      const dates = expandRecurrence(
        e.date,
        e.recurrence,
        e.recurrenceEndDate ?? null,
        yearStart,
        yearEnd,
      );
      for (const d of dates) {
        items.push({
          date: d,
          title: e.title,
          type: e.type,
          amount: e.amount ?? undefined,
          source: "event",
          id: e.id,
          recurrence: e.recurrence,
          recurrenceEndDate: e.recurrenceEndDate,
          notes: e.notes,
        });
      }
    });
    // Subscriptions: project monthly through end of year from nextRenewalDate
    subs
      ?.filter((s) => s.status === "active")
      .forEach((s) => {
        const cursor = new Date(s.nextRenewalDate + "T00:00:00");
        let safety = 0;
        while (cursor <= yearEnd && safety++ < 36) {
          if (cursor >= yearStart) {
            items.push({
              date: cursor.toISOString().slice(0, 10),
              title: `تجديد ${s.name}`,
              type: "subscription",
              amount: s.amount,
              source: "subscription",
              id: s.id,
            });
          }
          if (s.frequency === "weekly") cursor.setDate(cursor.getDate() + 7);
          else if (s.frequency === "yearly")
            cursor.setFullYear(cursor.getFullYear() + 1);
          else if (s.frequency === "quarterly")
            cursor.setMonth(cursor.getMonth() + 3);
          else cursor.setMonth(cursor.getMonth() + 1);
        }
      });
    // Commitments project monthly across viewed year on dueDay
    commitments?.forEach((c) => {
      for (let m = 0; m < 12; m++) {
        const lastDay = new Date(viewYear, m + 1, 0).getDate();
        const day = Math.min(c.dueDay, lastDay);
        const date = new Date(viewYear, m, day).toISOString().slice(0, 10);
        items.push({
          date,
          title: c.title,
          type: "bill",
          amount: c.amount,
          source: "commitment",
          id: c.id,
        });
      }
    });
    return items;
  }, [events, subs, commitments, viewYear, yearStart, yearEnd]);

  const itemsByMonth = useMemo(() => {
    const map: Record<number, CalendarItem[]> = {};
    for (let i = 0; i < 12; i++) map[i] = [];
    allItems.forEach((it) => {
      const d = new Date(it.date);
      if (d.getFullYear() === viewYear) map[d.getMonth()].push(it);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    );
    return map;
  }, [allItems, viewYear]);

  const monthItems = itemsByMonth[viewMonth] ?? [];

  const itemsByDay = useMemo(() => {
    const map: Record<number, CalendarItem[]> = {};
    monthItems.forEach((i) => {
      const day = new Date(i.date).getDate();
      if (!map[day]) map[day] = [];
      map[day].push(i);
    });
    return map;
  }, [monthItems]);

  // Build month grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else setViewMonth(viewMonth - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else setViewMonth(viewMonth + 1);
  };

  if (loadingEvents) {
    return <Skeleton className="h-96 w-full rounded-3xl" />;
  }

  const isPending = createEvent.isPending || updateEvent.isPending;

  const dialog = (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
      <DialogTrigger asChild>
        <Button
          className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white shadow-lg gap-2"
          data-testid="btn-add-event"
          onClick={openCreate}
        >
          <Plus className="w-4 h-4" />
          إضافة مناسبة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {editingId != null ? "تعديل المناسبة" : "إضافة مناسبة جديدة"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>العنوان</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: فاتورة الكهرباء"
              data-testid="input-event-title"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                data-testid="input-event-date"
              />
            </div>
            <div>
              <Label>النوع</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({ ...form, type: v as ApiEventType })
                }
              >
                <SelectTrigger data-testid="select-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bill">فاتورة</SelectItem>
                  <SelectItem value="salary">راتب</SelectItem>
                  <SelectItem value="subscription">اشتراك</SelectItem>
                  <SelectItem value="expense">مصروف</SelectItem>
                  <SelectItem value="reminder">تذكير</SelectItem>
                  <SelectItem value="goal">هدف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>التكرار</Label>
              <Select
                value={form.recurrence}
                onValueChange={(v) =>
                  setForm({ ...form, recurrence: v as EventRecurrence })
                }
              >
                <SelectTrigger data-testid="select-event-recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.recurrence !== "none" && (
              <div>
                <Label>تنتهي في</Label>
                <Input
                  type="date"
                  value={form.recurrenceEndDate}
                  onChange={(e) =>
                    setForm({ ...form, recurrenceEndDate: e.target.value })
                  }
                  data-testid="input-event-end"
                />
              </div>
            )}
          </div>
          <div>
            <Label>المبلغ (اختياري)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              data-testid="input-event-amount"
            />
          </div>
          <div>
            <Label>ملاحظات (اختياري)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              data-testid="input-event-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white"
            data-testid="btn-save-event"
          >
            {isPending ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (view === "year") {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-blue-600" />
              التقويم المالي
            </h1>
            <p className="text-muted-foreground">
              عرض شامل لكل مناسباتك المالية على مدار السنة
            </p>
          </div>
          {dialog}
        </div>

        <Card className="rounded-3xl">
          <CardHeader className="flex-row items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewYear(viewYear - 1)}
              data-testid="btn-prev-year"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <CardTitle className="text-2xl">{viewYear}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewYear(viewYear + 1)}
              data-testid="btn-next-year"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {ARABIC_MONTHS.map((m, mi) => {
                const items = itemsByMonth[mi] ?? [];
                const isCurrent =
                  mi === today.getMonth() && viewYear === today.getFullYear();
                const total = items.reduce((s, i) => s + (i.amount ?? 0), 0);
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setViewMonth(mi);
                      setView("month");
                    }}
                    className={`text-right rounded-2xl p-4 border transition-all hover:shadow-md ${
                      isCurrent
                        ? "bg-gradient-to-br from-primary/15 to-purple-500/15 border-primary"
                        : "bg-muted/30 border-border hover:bg-muted/60"
                    }`}
                    data-testid={`month-card-${mi}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg">{m}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {items.length}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {items.length === 0
                        ? "لا توجد مناسبات"
                        : `${items.length} مناسبة`}
                    </p>
                    {total > 0 && (
                      <p className="text-sm font-semibold text-primary">
                        {formatAmount(total, currency)}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <ArrowRight className="w-3.5 h-3.5" />
                      عرض التفاصيل
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Month detail view
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("year")}
            className="gap-1"
            data-testid="btn-back-to-year"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للسنة
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-blue-600" />
              {ARABIC_MONTHS[viewMonth]} {viewYear}
            </h1>
          </div>
        </div>
        {dialog}
      </div>

      {/* Month grid */}
      <Card className="rounded-3xl">
        <CardHeader className="flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={goPrev}
            data-testid="btn-prev-month"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          <CardTitle className="text-xl">
            {ARABIC_MONTHS[viewMonth]} {viewYear}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={goNext}
            data-testid="btn-next-month"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {ARABIC_DAYS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((day, i) => {
              const isToday =
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();
              const dayItems = day ? (itemsByDay[day] ?? []) : [];
              return (
                <div
                  key={i}
                  className={`min-h-[80px] rounded-xl p-1.5 text-right ${
                    day
                      ? isToday
                        ? "bg-gradient-to-br from-primary/15 to-purple-500/15 border-2 border-primary"
                        : "bg-muted/30 border border-border hover:bg-muted/60"
                      : ""
                  }`}
                >
                  {day && (
                    <>
                      <div
                        className={`text-sm font-semibold mb-1 ${
                          isToday ? "text-primary" : ""
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 2).map((item, idx) => {
                          const meta = TYPE_META[item.type] ?? TYPE_META.reminder;
                          return (
                            <div
                              key={idx}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} truncate`}
                              title={item.title}
                            >
                              {item.title}
                            </div>
                          );
                        })}
                        {dayItems.length > 2 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{dayItems.length - 2}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Month timeline */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            مناسبات {ARABIC_MONTHS[viewMonth]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!monthItems.length ? (
            <p className="text-center text-muted-foreground py-8">
              لا توجد مناسبات لهذا الشهر
            </p>
          ) : (
            monthItems.map((item, i) => {
              const meta = TYPE_META[item.type] ?? TYPE_META.reminder;
              const sourceIcon =
                item.source === "subscription"
                  ? Repeat
                  : item.source === "commitment"
                    ? CalendarClock
                    : Bell;
              const SrcIcon = sourceIcon;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-4 rounded-2xl border ${meta.border} ${meta.bg}`}
                  data-testid={`event-row-${i}`}
                >
                  <div className="text-center bg-white rounded-xl px-3 py-2 shadow-sm shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {ARABIC_MONTHS[new Date(item.date).getMonth()].slice(0, 3)}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {new Date(item.date).getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SrcIcon className={`w-4 h-4 ${meta.color}`} />
                      <h3 className="font-semibold truncate">{item.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {meta.label}
                      </Badge>
                      {item.source === "event" &&
                        item.recurrence &&
                        item.recurrence !== "none" && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Repeat className="w-3 h-3" />
                            {RECURRENCE_LABELS[item.recurrence]}
                          </Badge>
                        )}
                    </div>
                  </div>
                  {item.amount != null && (
                    <p className={`font-bold text-lg ${meta.color}`}>
                      {formatAmount(item.amount, currency)}
                    </p>
                  )}
                  {item.source === "event" && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const ev = events?.find((e) => e.id === item.id);
                          if (ev) openEdit(ev);
                        }}
                        data-testid={`btn-edit-event-${item.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteEvent.mutate({ id: item.id })}
                        data-testid={`btn-delete-event-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
