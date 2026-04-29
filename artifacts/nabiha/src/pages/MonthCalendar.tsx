import { useParams, useLocation, Link } from "wouter";
import { useListCommitments, useUpdateCommitment, getListCommitmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
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
  CheckCircle2,
  Clock,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { useDisplayCurrency } from "@/contexts/CurrencyContext";

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

export default function MonthCalendar() {
  const params = useParams<{ month: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { format, baseCurrency } = useDisplayCurrency();

  const monthIdx = Math.max(0, Math.min(11, parseInt(params.month || "1", 10) - 1));
  const monthName = MONTHS[monthIdx];
  const year = new Date().getFullYear();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === monthIdx && today.getFullYear() === year;
  const todayDay = isCurrentMonth ? today.getDate() : null;

  const { data: commitments, isLoading } = useListCommitments();
  const updateCommitment = useUpdateCommitment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
      },
    },
  });

  const sorted = (commitments ?? []).slice().sort((a, b) => a.dueDay - b.dueDay);
  const total = sorted.reduce((s, c) => s + Number(c.amount), 0);
  const count = sorted.length;

  const prevMonth = (monthIdx + 11) % 12;
  const nextMonth = (monthIdx + 1) % 12;

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/app">
          <Button
            variant="outline"
            className="rounded-xl gap-2 h-10 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
            data-testid="button-back-to-yearly"
          >
            <ArrowRight className="w-4 h-4" />
            التقويم السنوي
          </Button>
        </Link>

        <Link href="/app/commitments">
          <Button
            className="rounded-xl gap-2 h-10 bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-add-commitment-from-month"
          >
            <Plus className="w-4 h-4" />
            إضافة التزام
          </Button>
        </Link>
      </div>

      {/* Main calendar card */}
      <Card className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden">
        {/* Brand header strip */}
        <div className="bg-gradient-to-l from-primary to-primary/85 px-6 py-4 text-primary-foreground flex items-center gap-3">
          <CalendarDays className="w-5 h-5" />
          <div>
            <div className="text-lg font-extrabold">التقويم المالي</div>
            <div className="text-xs opacity-90">{monthName} {year}</div>
          </div>
        </div>

        {/* Month tabs (prev / current / next) */}
        <div className="px-4 pt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full h-9 w-9 p-0 border-primary/20 text-primary hover:bg-primary/5"
            onClick={() => setLocation(`/app/calendar/${prevMonth + 1}`)}
            data-testid="button-prev-month"
            aria-label="الشهر السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLocation(`/app/calendar/${prevMonth + 1}`)}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-muted-foreground hover:bg-primary/5"
              data-testid="tab-prev-month"
            >
              {MONTHS[prevMonth]}
            </button>
            <span className="px-4 py-1.5 rounded-full text-xs font-extrabold bg-primary text-primary-foreground shadow-sm" data-testid="tab-current-month">
              {monthName}
            </span>
            <button
              type="button"
              onClick={() => setLocation(`/app/calendar/${nextMonth + 1}`)}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-muted-foreground hover:bg-primary/5"
              data-testid="tab-next-month"
            >
              {MONTHS[nextMonth]}
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full h-9 w-9 p-0 border-primary/20 text-primary hover:bg-primary/5"
            onClick={() => setLocation(`/app/calendar/${nextMonth + 1}`)}
            data-testid="button-next-month"
            aria-label="الشهر التالي"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        <CardContent className="px-4 sm:px-6 py-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : count === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
              <CalendarDays className="w-10 h-10 opacity-25" />
              <p className="text-sm">ما في التزامات لهذا الشهر</p>
              <Link href="/app/commitments">
                <Button size="sm" variant="outline" className="rounded-xl mt-1">
                  إضافة التزام
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-2xl p-4 bg-primary/5 border border-primary/10 text-center">
                  <div className="text-xs text-muted-foreground font-bold mb-1">إجمالي المدفوعات</div>
                  <div className="text-xl md:text-2xl font-extrabold text-primary tracking-tight" data-testid="text-month-total">
                    {format(total, baseCurrency)}
                  </div>
                </div>
                <div className="rounded-2xl p-4 bg-accent/5 border border-accent/20 text-center">
                  <div className="text-xs text-muted-foreground font-bold mb-1">عدد المناسبات</div>
                  <div className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight" data-testid="text-month-count">
                    {count} {count === 1 ? "مناسبة" : count === 2 ? "مناسبتان" : "مناسبات"}
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
                  const isPaid = isCurrentMonth && c.isPaid;

                  return (
                    <li
                      key={c.id}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-colors ${
                        isPaid
                          ? "bg-emerald-50/60 border-emerald-200"
                          : isUpcomingSoon
                          ? "bg-amber-50/60 border-amber-200"
                          : "bg-background/70 border-border/60 hover:border-border"
                      }`}
                      data-testid={`row-month-commitment-${c.id}`}
                    >
                      {/* Day chip */}
                      <div className="shrink-0 w-14 text-center">
                        <div className="text-[10px] text-muted-foreground font-medium leading-none">{monthName}</div>
                        <div className="text-xl font-extrabold text-foreground leading-tight">{c.dueDay}</div>
                      </div>

                      {/* Vertical separator */}
                      <div className="h-10 w-px bg-border/60" />

                      {/* Icon */}
                      <div
                        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${color.bg} ${color.text}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-foreground truncate">
                          {c.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-primary">
                            {format(Number(c.amount), baseCurrency)}
                          </span>
                          {isCurrentMonth && (
                            isPaid ? (
                              <Badge variant="outline" className="border-emerald-300 bg-emerald-100/60 text-emerald-700 gap-1 h-5 px-1.5">
                                <CheckCircle2 className="w-3 h-3" />
                                مدفوع
                              </Badge>
                            ) : isToday ? (
                              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary gap-1 h-5 px-1.5">
                                <Clock className="w-3 h-3" />
                                مستحق اليوم
                              </Badge>
                            ) : isUpcomingSoon ? (
                              <Badge variant="outline" className="border-amber-300 bg-amber-100/60 text-amber-700 gap-1 h-5 px-1.5">
                                <Clock className="w-3 h-3" />
                                قريباً
                              </Badge>
                            ) : isPast ? (
                              <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive gap-1 h-5 px-1.5">
                                متأخر
                              </Badge>
                            ) : null
                          )}
                        </div>
                      </div>

                      {/* Mark paid action (only for current month) */}
                      {isCurrentMonth && (
                        <Button
                          size="sm"
                          variant={isPaid ? "outline" : "default"}
                          className={`rounded-xl h-9 shrink-0 ${
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
