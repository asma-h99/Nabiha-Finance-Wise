import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useListCommitments,
  useUpdateCommitment,
  getListCommitmentsQueryKey,
  useListSubscriptions,
  useListCalendarEvents,
  getListCalendarEventsQueryKey,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  useListExpenses,
  useGetUserProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import { EventFormDialog } from "./EventFormDialog";
import type { CalendarEvent } from "@workspace/api-client-react";

import {
  Plus,
  Home,
  Zap,
  Droplets,
  Wifi,
  Phone,
  Car,
  Landmark,
  Shield,
  GraduationCap,
  Heart,
  Dumbbell,
  CircleDollarSign,
  Tv,
  Music,
  Star,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit2,
  Trash2,
  type LucideIcon,
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

const DEMO_SEED_USER_ID = "nabiha_demo_seed";

const MONTHS_AR = [
  "يناير", "فبراير", "مارس",
  "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر",
  "أكتوبر", "نوفمبر", "ديسمبر",
];

const WEEKDAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

type EventStatus = "paid" | "overdue" | "upcoming" | "today" | "safe" | "readonly";

interface TimelineItem {
  id: string;
  source: "commitment" | "subscription" | "calendar" | "expense";
  day: number;
  date: Date;
  title: string;
  notes?: string | null;
  amount: number | null;
  currency: string;
  categoryLabel?: string;
  status: EventStatus;
  isPaid?: boolean;
  canEdit: boolean;
  canMarkPaid: boolean;
  iconSpec: { Icon: LucideIcon | null; emoji?: string; bg: string; text: string };
  rawId?: number;
  calendarEvent?: CalendarEvent;
}

function getBrandColor(name: string): { bg: string; text: string } {
  const n = name.toLowerCase();
  if (/netflix/i.test(n)) return { bg: "bg-red-100", text: "text-red-700" };
  if (/spotify/i.test(n)) return { bg: "bg-green-100", text: "text-green-700" };
  if (/shahid|شاهد/i.test(n)) return { bg: "bg-sky-100", text: "text-sky-700" };
  if (/apple|أبل/i.test(n)) return { bg: "bg-gray-100", text: "text-gray-700" };
  if (/amazon|أمازون/i.test(n)) return { bg: "bg-amber-100", text: "text-amber-700" };
  if (/youtube|يوتيوب/i.test(n)) return { bg: "bg-red-100", text: "text-red-600" };
  if (/disney|ديزني/i.test(n)) return { bg: "bg-blue-100", text: "text-blue-700" };
  if (/stc|اتصالات|mobily|زين|موبايلي/i.test(n)) return { bg: "bg-teal-100", text: "text-teal-700" };
  return { bg: "bg-sky-100", text: "text-sky-700" };
}

function getCommitmentIcon(title: string): LucideIcon {
  if (/إيجار|rent|منزل|بيت|شقة/i.test(title)) return Home;
  if (/كهرب|electric|ضوء/i.test(title)) return Zap;
  if (/ماء|water|مياه/i.test(title)) return Droplets;
  if (/انترنت|internet|wifi|نت|شبكة/i.test(title)) return Wifi;
  if (/هاتف|phone|جوال|موبايل|اتصال/i.test(title)) return Phone;
  if (/سيارة|car|مواصلات|بنزين|وقود/i.test(title)) return Car;
  if (/قرض|loan|بنك|bank|تمويل|أقساط/i.test(title)) return Landmark;
  if (/تأمين|insurance/i.test(title)) return Shield;
  if (/مدرسة|school|تعليم|جامعة|رسوم/i.test(title)) return GraduationCap;
  if (/صحة|health|طب|doctor|مستشفى/i.test(title)) return Heart;
  if (/نادي|gym|رياضة|fitness/i.test(title)) return Dumbbell;
  return CircleDollarSign;
}

function getCommitmentColor(idx: number): { bg: string; text: string } {
  const COLORS = [
    { bg: "bg-teal-100", text: "text-teal-700" },
    { bg: "bg-amber-100", text: "text-amber-700" },
    { bg: "bg-sky-100", text: "text-sky-700" },
    { bg: "bg-rose-100", text: "text-rose-700" },
    { bg: "bg-emerald-100", text: "text-emerald-700" },
    { bg: "bg-orange-100", text: "text-orange-700" },
    { bg: "bg-indigo-100", text: "text-indigo-700" },
    { bg: "bg-lime-100", text: "text-lime-700" },
  ];
  return COLORS[idx % COLORS.length];
}

function getCalendarEventIcon(type: string, title: string): { Icon: LucideIcon | null; emoji?: string; bg: string; text: string } {
  switch (type) {
    case "religious":
      return { Icon: Star, bg: "bg-amber-100", text: "text-amber-700" };
    case "personal":
      return { Icon: null, emoji: "🎉", bg: "bg-rose-100", text: "text-rose-700" };
    case "education":
      return { Icon: GraduationCap, bg: "bg-indigo-100", text: "text-indigo-700" };
    case "health":
      return { Icon: Heart, bg: "bg-rose-100", text: "text-rose-700" };
    case "bill":
      return { Icon: getCommitmentIcon(title), bg: "bg-teal-100", text: "text-teal-700" };
    case "subscription":
      return { ...getBrandColor(title), Icon: Tv };
    case "loan":
      return { Icon: Landmark, bg: "bg-slate-100", text: "text-slate-700" };
    default:
      return { Icon: CircleDollarSign, bg: "bg-gray-100", text: "text-gray-700" };
  }
}

function getCategoryLabel(type: string): string {
  switch (type) {
    case "bill": return "فاتورة";
    case "subscription": return "اشتراك";
    case "loan": return "قسط";
    case "religious": return "مناسبة دينية";
    case "personal": return "مناسبة شخصية";
    case "education": return "تعليم";
    case "health": return "صحة";
    default: return "مناسبة";
  }
}

function isReligiousOccasion(title: string): boolean {
  return /عيد|رمضان|هجري|ليلة القدر|المولد النبوي|ذي الحجة|محرم/i.test(title);
}

function isMajorOccasion(title: string): boolean {
  return /عيد الفطر|عيد الأضحى|رمضان|العيد/i.test(title);
}

interface MonthTimelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: number;
  year: number;
}

export function MonthTimelineModal({ open, onOpenChange, month, year }: MonthTimelineModalProps) {
  const { user } = useUser();
  const currentUserId = user?.id ?? null;
  const { data: commitments } = useListCommitments();
  const { data: subscriptions } = useListSubscriptions();
  const { data: profile } = useGetUserProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fromDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const toDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const { data: calendarEvents } = useListCalendarEvents({ from: fromDate, to: toDate });
  const { data: expenses } = useListExpenses({ month: monthStr });

  const updateCommitment = useUpdateCommitment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
      },
    },
  });

  const updateCalendarEvent = useUpdateCalendarEvent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCalendarEventsQueryKey() });
      },
    },
  });

  const deleteCalendarEvent = useDeleteCalendarEvent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCalendarEventsQueryKey() });
      },
    },
  });

  const { format, baseCurrency } = useDisplayCurrency();
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<CalendarEvent | null>(null);

  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const todayDay = isCurrentMonth ? today.getDate() : null;

  function getStatus(day: number, isPaid: boolean): EventStatus {
    if (isPaid) return "paid";
    if (todayDay === null) return "safe";
    if (day < todayDay) return "overdue";
    if (day === todayDay) return "today";
    if (day - todayDay <= 3) return "upcoming";
    return "safe";
  }

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    (commitments ?? []).forEach((c, idx) => {
      const day = Math.min(c.dueDay, lastDay);
      const date = new Date(year, month, day);
      items.push({
        id: `commitment-${c.id}`,
        source: "commitment",
        day,
        date,
        title: c.title,
        notes: c.notes,
        amount: Number(c.amount),
        currency: baseCurrency,
        categoryLabel: "التزام",
        status: getStatus(day, isCurrentMonth ? c.isPaid : false),
        isPaid: isCurrentMonth ? c.isPaid : false,
        canEdit: false,
        canMarkPaid: isCurrentMonth,
        iconSpec: { Icon: getCommitmentIcon(c.title), ...getCommitmentColor(idx) },
        rawId: c.id,
      });
    });

    (subscriptions ?? []).forEach((s) => {
      const day = Math.min(s.renewsOnDay ?? 1, lastDay);
      const date = new Date(year, month, day);
      const monthlyAmt = s.billingCycle === "yearly" ? Number(s.amount) / 12 : Number(s.amount);
      const brandColor = getBrandColor(s.name);
      items.push({
        id: `subscription-${s.id}`,
        source: "subscription",
        day,
        date,
        title: s.name,
        notes: s.notes,
        amount: monthlyAmt,
        currency: baseCurrency,
        categoryLabel: "اشتراك",
        status: getStatus(day, false),
        isPaid: false,
        canEdit: false,
        canMarkPaid: false,
        iconSpec: { Icon: s.billingCycle === "yearly" ? Music : Tv, ...brandColor },
        rawId: s.id,
      });
    });

    (calendarEvents ?? []).forEach((ev) => {
      const dateStr = String(ev.date).slice(0, 10);
      const parts = dateStr.split("-");
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      const iconSpec = getCalendarEventIcon(ev.type ?? "other", ev.title);
      const isOwned = currentUserId !== null && ev.userId === currentUserId;
      const isDemo = ev.userId === DEMO_SEED_USER_ID;
      const hasAmount = ev.amount !== undefined && ev.amount !== null;
      items.push({
        id: `calendar-${ev.id}`,
        source: "calendar",
        day,
        date,
        title: ev.title,
        notes: ev.notes,
        amount: hasAmount ? Number(ev.amount) : null,
        currency: ev.currency,
        categoryLabel: getCategoryLabel(ev.type ?? "other") + (isDemo ? " ✦" : ""),
        status: hasAmount
          ? getStatus(day, ev.isPaid)
          : (day < (todayDay ?? Infinity) ? "paid" : "safe"),
        isPaid: ev.isPaid,
        canEdit: isOwned,
        canMarkPaid: isOwned && hasAmount,
        iconSpec,
        rawId: ev.id,
        calendarEvent: ev,
      });
    });

    (expenses ?? []).forEach((ex) => {
      const dateStr = String(ex.date).slice(0, 10);
      const parts = dateStr.split("-");
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      items.push({
        id: `expense-${ex.id}`,
        source: "expense",
        day,
        date,
        title: ex.title,
        notes: ex.notes,
        amount: Number(ex.amount),
        currency: baseCurrency,
        categoryLabel: "مصروف",
        status: "readonly",
        isPaid: true,
        canEdit: false,
        canMarkPaid: false,
        iconSpec: { Icon: CircleDollarSign, bg: "bg-gray-100", text: "text-gray-600" },
        rawId: ex.id,
      });
    });

    return items.sort((a, b) => a.day - b.day || a.title.localeCompare(b.title));
  }, [commitments, subscriptions, calendarEvents, expenses, baseCurrency, month, year, isCurrentMonth, todayDay, lastDay, currentUserId]);

  const totalFinancial = useMemo(
    () => timelineItems
      .filter((i) => i.amount !== null && i.source !== "expense")
      .reduce((s, i) => s + (i.amount ?? 0), 0),
    [timelineItems],
  );

  const overdueSoonCount = useMemo(
    () => timelineItems.filter((i) => i.status === "overdue" || i.status === "upcoming" || i.status === "today").length,
    [timelineItems],
  );

  const majorEvent = useMemo(
    () => timelineItems.find((i) => i.source === "calendar" && isMajorOccasion(i.title)),
    [timelineItems],
  );

  const salary = Number(profile?.monthlySalary ?? 0);
  const committed = totalFinancial;
  const capacityPct = salary > 0 ? Math.min(100, Math.round((committed / salary) * 100)) : 0;
  const freePct = 100 - capacityPct;

  function getStatusRing(status: EventStatus): string {
    switch (status) {
      case "paid": return "ring-2 ring-emerald-400";
      case "overdue":
      case "today": return "ring-2 ring-red-400";
      case "upcoming": return "ring-2 ring-amber-400";
      case "readonly": return "ring-1 ring-gray-300 opacity-60";
      default: return "ring-1 ring-border/40";
    }
  }

  function getStatusBadge(status: EventStatus) {
    switch (status) {
      case "paid":
        return <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 gap-1 h-5 px-1.5 text-[10px]"><CheckCircle2 className="w-2.5 h-2.5" />مدفوع</Badge>;
      case "overdue":
        return <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 h-5 px-1.5 text-[10px]">متأخر</Badge>;
      case "today":
        return <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary gap-1 h-5 px-1.5 text-[10px]"><Clock className="w-2.5 h-2.5" />اليوم</Badge>;
      case "upcoming":
        return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 gap-1 h-5 px-1.5 text-[10px]"><Clock className="w-2.5 h-2.5" />قريباً</Badge>;
      case "readonly":
        return <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-500 h-5 px-1.5 text-[10px]">مصروف</Badge>;
      default:
        return null;
    }
  }

  function getRowBg(status: EventStatus): string {
    switch (status) {
      case "paid": return "bg-emerald-50/50 border-emerald-200";
      case "overdue":
      case "today": return "bg-red-50/40 border-red-200";
      case "upcoming": return "bg-amber-50/40 border-amber-200";
      case "readonly": return "bg-gray-50/40 border-gray-200 opacity-80";
      default: return "bg-background/70 border-border/60";
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          dir="rtl"
          className="w-full sm:w-[80vw] max-w-none sm:max-w-none max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0"
        >
          <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-extrabold text-foreground">
                {MONTHS_AR[month]} {year}
              </DialogTitle>
              <Button
                size="sm"
                className="rounded-xl gap-1.5 text-xs"
                onClick={() => { setEditEvent(null); setFormOpen(true); }}
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة حدث
              </Button>
            </div>
          </DialogHeader>

          <div className="px-5 pt-4 pb-0 space-y-3 shrink-0">
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl p-3 bg-primary/5 border border-primary/10 text-center">
                <div className="text-[10px] text-muted-foreground font-bold mb-0.5">إجمالي المدفوعات</div>
                <div className="text-base font-extrabold text-primary tabular-nums">
                  {format(totalFinancial, baseCurrency)}
                </div>
              </div>
              <div className="rounded-2xl p-3 bg-accent/5 border border-accent/20 text-center">
                <div className="text-[10px] text-muted-foreground font-bold mb-0.5">عدد الأحداث</div>
                <div className="text-base font-extrabold text-foreground">
                  {timelineItems.length}
                </div>
              </div>
              <div className={`rounded-2xl p-3 border text-center ${overdueSoonCount > 0 ? "bg-amber-50/60 border-amber-200" : "bg-muted/30 border-border/60"}`}>
                <div className="text-[10px] text-muted-foreground font-bold mb-0.5">تنبيهات</div>
                <div className={`text-base font-extrabold ${overdueSoonCount > 0 ? "text-amber-700" : "text-muted-foreground"}`}>
                  {overdueSoonCount > 0 ? (
                    <span className="flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {overdueSoonCount}
                    </span>
                  ) : "لا تنبيهات"}
                </div>
              </div>
            </div>

            {/* Borrowing capacity */}
            {salary > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-2xl p-3 bg-background/70 border border-border/60 cursor-help">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground">قدرة الاقتراض</span>
                      <span className="text-[11px] font-extrabold text-foreground">{freePct}% متبقية</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${capacityPct > 75 ? "bg-red-500" : capacityPct > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">الالتزامات: {capacityPct}%</span>
                      <span className="text-[10px] text-muted-foreground">الراتب: {format(salary, baseCurrency)}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent dir="rtl" side="top" className="max-w-xs text-xs text-center">
                  يساعدك هذا المؤشر على تقييم قدرتك على تحمّل دين إضافي بناءً على دخلك والتزاماتك لهذا الشهر
                </TooltipContent>
              </Tooltip>
            )}

            {/* Major occasion banner */}
            {majorEvent && (
              <div className="rounded-2xl px-4 py-3 bg-amber-50 border border-amber-300 flex items-center gap-3">
                <Star className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <div className="text-sm font-extrabold text-amber-800">{majorEvent.title}</div>
                  <div className="text-[11px] text-amber-700">توقع مصاريف إضافية هذا الشهر</div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5" dir="rtl">
            {timelineItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground text-sm gap-3 text-center">
                <CircleDollarSign className="w-10 h-10 opacity-20" />
                <p>لا توجد أحداث في هذا الشهر</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => { setEditEvent(null); setFormOpen(true); }}
                >
                  إضافة حدث
                </Button>
              </div>
            ) : (
              timelineItems.map((item, i) => {
                const { Icon, emoji, bg, text } = item.iconSpec;
                const weekday = WEEKDAYS_AR[item.date.getDay()];
                const animStyle = { animationDelay: `${i * 40}ms` };

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors animate-in fade-in slide-in-from-bottom-1 duration-300 ${getRowBg(item.status)}`}
                    style={animStyle}
                  >
                    {/* Day badge */}
                    <div className="shrink-0 w-10 text-center">
                      <div className="text-[9px] text-muted-foreground font-medium leading-none">{weekday}</div>
                      <div className="text-lg font-extrabold text-foreground leading-tight">{item.day}</div>
                    </div>

                    <div className="w-px h-9 bg-border/60 shrink-0" />

                    {/* Icon badge */}
                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base ${bg} ${text} ${getStatusRing(item.status)}`}>
                      {emoji ? (
                        <span>{emoji}</span>
                      ) : Icon ? (
                        <Icon className="w-4 h-4" />
                      ) : (
                        <CircleDollarSign className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-foreground truncate">{item.title}</span>
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-border/60 text-muted-foreground font-medium">
                          {item.categoryLabel}
                        </Badge>
                        {getStatusBadge(item.status)}
                      </div>
                      {item.notes && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.notes}</div>
                      )}
                      {item.amount !== null && (
                        <div className="text-xs font-extrabold text-primary mt-0.5 tabular-nums">
                          {format(item.amount, item.currency)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {item.canMarkPaid && item.source === "commitment" && (
                        <Button
                          size="sm"
                          variant={item.isPaid ? "outline" : "default"}
                          className={`rounded-xl h-8 text-xs ${item.isPaid ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : ""}`}
                          disabled={updateCommitment.isPending}
                          onClick={async () => {
                            try {
                              await updateCommitment.mutateAsync({ id: item.rawId!, data: { isPaid: !item.isPaid } });
                              toast({ title: item.isPaid ? "تم إلغاء الدفع" : "تم تسجيل الدفع" });
                            } catch {
                              toast({ title: "فشل تحديث حالة الدفع", variant: "destructive" });
                            }
                          }}
                        >
                          {item.isPaid ? "تم" : "دفع"}
                        </Button>
                      )}
                      {item.canMarkPaid && item.source === "calendar" && (
                        <Button
                          size="sm"
                          variant={item.isPaid ? "outline" : "default"}
                          className={`rounded-xl h-8 text-xs ${item.isPaid ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : ""}`}
                          disabled={updateCalendarEvent.isPending}
                          onClick={async () => {
                            try {
                              await updateCalendarEvent.mutateAsync({ id: item.rawId!, data: { isPaid: !item.isPaid } });
                              toast({ title: item.isPaid ? "تم إلغاء الدفع" : "تم تسجيل الدفع" });
                            } catch {
                              toast({ title: "فشل تحديث حالة الدفع", variant: "destructive" });
                            }
                          }}
                        >
                          {item.isPaid ? "تم" : "دفع"}
                        </Button>
                      )}
                      {item.canEdit && item.calendarEvent && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditEvent(item.calendarEvent!); setFormOpen(true); }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={deleteCalendarEvent.isPending}
                            onClick={() => setDeleteConfirmEvent(item.calendarEvent!)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editEvent={editEvent}
        defaultDate={fromDate}
      />

      <AlertDialog open={!!deleteConfirmEvent} onOpenChange={(o) => { if (!o) setDeleteConfirmEvent(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحدث؟</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deleteConfirmEvent?.title}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCalendarEvent.isPending}
              onClick={async () => {
                if (!deleteConfirmEvent) return;
                await deleteCalendarEvent.mutateAsync({ id: deleteConfirmEvent.id });
                toast({ title: "تم حذف الحدث" });
                setDeleteConfirmEvent(null);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
