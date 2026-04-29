import { useState } from "react";
import {
  useListCommitments,
  useUpdateCommitment,
  getListCommitmentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "wouter";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";
import {
  CalendarDays,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
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
  type LucideIcon,
} from "lucide-react";

const MONTHS = [
  "يناير", "فبراير", "مارس",
  "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر",
  "أكتوبر", "نوفمبر", "ديسمبر",
];

const ICON_COLORS = [
  { bg: "bg-teal-100",    text: "text-teal-700"    },
  { bg: "bg-amber-100",   text: "text-amber-700"   },
  { bg: "bg-sky-100",     text: "text-sky-700"     },
  { bg: "bg-rose-100",    text: "text-rose-700"    },
  { bg: "bg-violet-100",  text: "text-violet-700"  },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-orange-100",  text: "text-orange-700"  },
  { bg: "bg-indigo-100",  text: "text-indigo-700"  },
  { bg: "bg-pink-100",    text: "text-pink-700"    },
  { bg: "bg-lime-100",    text: "text-lime-700"    },
];

function getIcon(title: string): LucideIcon {
  const t = title;
  if (/إيجار|rent|منزل|بيت|شقة/i.test(t)) return Home;
  if (/كهرب|electric|ضوء/i.test(t)) return Zap;
  if (/ماء|water|مياه/i.test(t)) return Droplets;
  if (/انترنت|internet|wifi|نت|شبكة/i.test(t)) return Wifi;
  if (/هاتف|phone|جوال|موبايل|اتصال/i.test(t)) return Phone;
  if (/سيارة|car|مواصلات|بنزين|وقود/i.test(t)) return Car;
  if (/قرض|loan|بنك|bank|تمويل|أقساط/i.test(t)) return Landmark;
  if (/تأمين|insurance/i.test(t)) return Shield;
  if (/مدرسة|school|تعليم|جامعة|رسوم/i.test(t)) return GraduationCap;
  if (/صحة|health|طب|doctor|مستشفى/i.test(t)) return Heart;
  if (/نادي|gym|رياضة|fitness/i.test(t)) return Dumbbell;
  return CircleDollarSign;
}

function pluralizeEvents(count: number): string {
  if (count === 1) return "مناسبة";
  if (count === 2) return "مناسبتان";
  return "مناسبات";
}

export function FinancialCalendarCard() {
  const { data: commitments, isLoading } = useListCommitments();
  const queryClient = useQueryClient();
  const { format, baseCurrency } = useDisplayCurrency();
  const updateCommitment = useUpdateCommitment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
      },
    },
  });

  const today = new Date();
  const currentMonthIdx = today.getMonth();
  const year = today.getFullYear();

  // null = yearly grid; number = monthly view
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  if (isLoading) {
    return <Skeleton className="h-[480px] w-full rounded-3xl" />;
  }

  const isEmpty = !commitments || commitments.length === 0;
  const isMonthlyView = selectedMonth !== null;
  const viewedMonth = selectedMonth ?? currentMonthIdx;
  const isViewedCurrentMonth = isMonthlyView && viewedMonth === currentMonthIdx;
  const todayDay = isViewedCurrentMonth ? today.getDate() : null;

  const sorted = (commitments ?? []).slice().sort((a, b) => a.dueDay - b.dueDay);
  const total = sorted.reduce((s, c) => s + Number(c.amount), 0);
  const count = sorted.length;

  const prevMonth = (viewedMonth + 11) % 12;
  const nextMonth = (viewedMonth + 1) % 12;

  return (
    <Card
      className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden"
      data-testid="card-financial-calendar"
    >
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
          {isMonthlyView && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMonth(null)}
              className="h-8 -mr-2 gap-1.5 text-xs rounded-xl text-primary hover:bg-primary/10"
              data-testid="button-back-to-yearly"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              السنوي
            </Button>
          )}
          <CalendarDays className="w-4 h-4 text-primary" />
          {isMonthlyView
            ? `${MONTHS[viewedMonth]} ${year}`
            : `التقويم المالي ${year}`}
        </CardTitle>
        <Link href="/app/commitments">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs rounded-xl text-primary hover:bg-primary/10"
            data-testid="button-add-commitment-from-calendar"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="px-4 pb-5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground gap-3">
            <CalendarDays className="w-10 h-10 opacity-25" />
            <p className="text-sm">أضف التزاماتك الشهرية لتظهر هنا</p>
            <Link href="/app/commitments">
              <Button size="sm" variant="outline" className="rounded-xl mt-1">
                إضافة التزام
              </Button>
            </Link>
          </div>
        ) : !isMonthlyView ? (
          /* === YEARLY GRID === */
          <div className="grid grid-cols-3 gap-2" dir="ltr">
            {MONTHS.map((month, monthIdx) => {
              const isCurrentMonth = monthIdx === currentMonthIdx;
              return (
                <button
                  type="button"
                  key={month}
                  onClick={() => setSelectedMonth(monthIdx)}
                  data-testid={`button-month-${monthIdx + 1}`}
                  className={`group rounded-2xl overflow-hidden border text-left transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    isCurrentMonth
                      ? "border-primary/30 shadow-md"
                      : "border-border/60"
                  }`}
                  aria-label={`${month} - عرض التقويم الشهري`}
                >
                  <div
                    className={`px-2 py-1.5 text-center text-xs font-extrabold tracking-wide transition-colors group-hover:bg-primary ${
                      isCurrentMonth
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/80 text-primary-foreground"
                    }`}
                    dir="rtl"
                  >
                    {month}
                  </div>

                  <div
                    className="p-2 bg-background/70 flex flex-wrap gap-1.5 justify-center min-h-[64px] items-center"
                    dir="rtl"
                  >
                    {sorted.map((commitment, idx) => {
                      const color = ICON_COLORS[idx % ICON_COLORS.length];
                      const Icon = getIcon(commitment.title);
                      const isPaidThisMonth =
                        isCurrentMonth && commitment.isPaid;

                      return (
                        <Tooltip key={commitment.id} delayDuration={120}>
                          <TooltipTrigger asChild>
                            <span
                              role="img"
                              aria-label={commitment.title}
                              onClick={(e) => e.stopPropagation()}
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-110 ${
                                color.bg
                              } ${color.text} ${
                                isPaidThisMonth
                                  ? "opacity-40 ring-1 ring-green-400"
                                  : ""
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            sideOffset={6}
                            dir="rtl"
                            className="font-semibold"
                          >
                            {commitment.title}
                            {isPaidThisMonth && (
                              <span className="block text-[10px] opacity-80 mt-0.5">
                                مدفوع لهذا الشهر
                              </span>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* === MONTHLY VIEW === */
          <div dir="rtl" className="space-y-5">
            {/* Month tabs (prev / current / next) */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-8 w-8 p-0 border-primary/20 text-primary hover:bg-primary/5"
                onClick={() => setSelectedMonth(prevMonth)}
                aria-label="الشهر السابق"
                data-testid="button-prev-month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedMonth(prevMonth)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold text-muted-foreground hover:bg-primary/5"
                  data-testid="tab-prev-month"
                >
                  {MONTHS[prevMonth]}
                </button>
                <span
                  className="px-4 py-1.5 rounded-full text-xs font-extrabold bg-primary text-primary-foreground shadow-sm"
                  data-testid="tab-current-month"
                >
                  {MONTHS[viewedMonth]}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMonth(nextMonth)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold text-muted-foreground hover:bg-primary/5"
                  data-testid="tab-next-month"
                >
                  {MONTHS[nextMonth]}
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-8 w-8 p-0 border-primary/20 text-primary hover:bg-primary/5"
                onClick={() => setSelectedMonth(nextMonth)}
                aria-label="الشهر التالي"
                data-testid="button-next-month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3.5 bg-primary/5 border border-primary/10 text-center">
                <div className="text-[11px] text-muted-foreground font-bold mb-1">
                  إجمالي المدفوعات
                </div>
                <div
                  className="text-lg md:text-xl font-extrabold text-primary tracking-tight"
                  data-testid="text-month-total"
                >
                  {format(total, baseCurrency)}
                </div>
              </div>
              <div className="rounded-2xl p-3.5 bg-accent/5 border border-accent/20 text-center">
                <div className="text-[11px] text-muted-foreground font-bold mb-1">
                  عدد المناسبات
                </div>
                <div
                  className="text-lg md:text-xl font-extrabold text-foreground tracking-tight"
                  data-testid="text-month-count"
                >
                  {count} {pluralizeEvents(count)}
                </div>
              </div>
            </div>

            {/* Timeline list */}
            <ul className="space-y-2.5" data-testid="list-month-commitments">
              {sorted.map((c, idx) => {
                const color = ICON_COLORS[idx % ICON_COLORS.length];
                const Icon = getIcon(c.title);
                const isPast = todayDay !== null && c.dueDay < todayDay;
                const isToday = todayDay === c.dueDay;
                const isUpcomingSoon =
                  todayDay !== null &&
                  c.dueDay > todayDay &&
                  c.dueDay - todayDay <= 5;
                const isPaid = isViewedCurrentMonth && c.isPaid;

                return (
                  <li
                    key={c.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                      isPaid
                        ? "bg-emerald-50/60 border-emerald-200"
                        : isUpcomingSoon
                        ? "bg-amber-50/60 border-amber-200"
                        : "bg-background/70 border-border/60 hover:border-border"
                    }`}
                    data-testid={`row-month-commitment-${c.id}`}
                  >
                    <div className="shrink-0 w-12 text-center">
                      <div className="text-[10px] text-muted-foreground font-medium leading-none">
                        {MONTHS[viewedMonth]}
                      </div>
                      <div className="text-lg font-extrabold text-foreground leading-tight">
                        {c.dueDay}
                      </div>
                    </div>

                    <div className="h-9 w-px bg-border/60" />

                    <div
                      className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${color.bg} ${color.text}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-foreground truncate">
                        {c.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-primary">
                          {format(Number(c.amount), baseCurrency)}
                        </span>
                        {isViewedCurrentMonth &&
                          (isPaid ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-300 bg-emerald-100/60 text-emerald-700 gap-1 h-5 px-1.5"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              مدفوع
                            </Badge>
                          ) : isToday ? (
                            <Badge
                              variant="outline"
                              className="border-primary/30 bg-primary/10 text-primary gap-1 h-5 px-1.5"
                            >
                              <Clock className="w-3 h-3" />
                              مستحق اليوم
                            </Badge>
                          ) : isUpcomingSoon ? (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-100/60 text-amber-700 gap-1 h-5 px-1.5"
                            >
                              <Clock className="w-3 h-3" />
                              قريباً
                            </Badge>
                          ) : isPast ? (
                            <Badge
                              variant="outline"
                              className="border-destructive/30 bg-destructive/10 text-destructive gap-1 h-5 px-1.5"
                            >
                              متأخر
                            </Badge>
                          ) : null)}
                      </div>
                    </div>

                    {isViewedCurrentMonth && (
                      <Button
                        size="sm"
                        variant={isPaid ? "outline" : "default"}
                        className={`rounded-xl h-8 shrink-0 text-xs ${
                          isPaid
                            ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            : ""
                        }`}
                        disabled={updateCommitment.isPending}
                        onClick={() =>
                          updateCommitment.mutate({
                            id: c.id,
                            data: { isPaid: !c.isPaid },
                          })
                        }
                        data-testid={`button-toggle-paid-${c.id}`}
                      >
                        {isPaid ? "تم" : "دفع"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
