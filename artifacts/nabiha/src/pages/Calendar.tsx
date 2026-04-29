import { useState, useMemo } from "react";
import {
  useListEvents,
  useCreateEvent,
  useDeleteEvent,
  useListSubscriptions,
  useListCommitments,
  useGetProfile,
  getListEventsQueryKey,
  type EventType as ApiEventType,
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
}

export default function Calendar() {
  const { data: profile } = useGetProfile();
  const currency = profile?.currency ?? "JOD";
  const { data: events, isLoading: loadingEvents } = useListEvents();
  const { data: subs } = useListSubscriptions();
  const { data: commitments } = useListCommitments();
  const qc = useQueryClient();
  const { toast } = useToast();

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<ApiEventType>("bill");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const createEvent = useCreateEvent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
        toast({ title: "تمت الإضافة" });
        setOpen(false);
        setTitle("");
        setAmount("");
        setNotes("");
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

  // Aggregate all calendar items
  const allItems: CalendarItem[] = useMemo(() => {
    const items: CalendarItem[] = [];
    events?.forEach((e) =>
      items.push({
        date: e.date,
        title: e.title,
        type: e.type,
        amount: e.amount ?? undefined,
        source: "event",
        id: e.id,
      }),
    );
    subs?.filter((s) => s.status === "active").forEach((s) =>
      items.push({
        date: s.nextRenewalDate,
        title: `تجديد ${s.name}`,
        type: "subscription",
        amount: s.amount,
        source: "subscription",
        id: s.id,
      }),
    );
    // Commitments use a recurring dueDay (1-31). Show in current viewed month.
    commitments?.forEach((c) => {
      const day = Math.min(c.dueDay, new Date(viewYear, viewMonth + 1, 0).getDate());
      const date = new Date(viewYear, viewMonth, day).toISOString().slice(0, 10);
      items.push({
        date,
        title: c.title,
        type: "bill",
        amount: c.amount,
        source: "commitment",
        id: c.id,
      });
    });
    return items;
  }, [events, subs, commitments]);

  // Items for current month
  const monthItems = useMemo(() => {
    return allItems
      .filter((i) => {
        const d = new Date(i.date);
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allItems, viewMonth, viewYear]);

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

  const handleSubmit = () => {
    if (!title || !date) return;
    createEvent.mutate({
      data: {
        title,
        date,
        type,
        amount: amount ? parseFloat(amount) : undefined,
        notes: notes || undefined,
      },
    });
  };

  if (loadingEvents) {
    return <Skeleton className="h-96 w-full rounded-3xl" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-blue-600" />
            التقويم المالي
          </h1>
          <p className="text-muted-foreground">
            كل فواتيرك ومناسباتك المالية في مكان واحد
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white shadow-lg gap-2"
              data-testid="btn-add-event"
            >
              <Plus className="w-4 h-4" />
              إضافة مناسبة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة مناسبة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>العنوان</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: فاتورة الكهرباء"
                  data-testid="input-event-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>التاريخ</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    data-testid="input-event-date"
                  />
                </div>
                <div>
                  <Label>النوع</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
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
              <div>
                <Label>المبلغ (اختياري)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="input-event-amount"
                />
              </div>
              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  data-testid="input-event-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createEvent.isPending}
                className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white"
                data-testid="btn-save-event"
              >
                {createEvent.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              const dayItems = day ? itemsByDay[day] ?? [] : [];
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
                    <Badge variant="outline" className="text-xs">
                      {meta.label}
                    </Badge>
                  </div>
                  {item.amount != null && (
                    <p className={`font-bold text-lg ${meta.color}`}>
                      {formatAmount(item.amount, currency)}
                    </p>
                  )}
                  {item.source === "event" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteEvent.mutate({ id: item.id })}
                      data-testid={`btn-delete-event-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
