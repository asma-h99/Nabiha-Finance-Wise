import { useState } from "react";
import {
  useListCommitments,
  useListCommitmentSkips,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "wouter";
import {
  CalendarDays,
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
import { MonthTimelineModal } from "./MonthTimelineModal";
import { EventFormDialog } from "./EventFormDialog";
import { ISLAMIC_OCCASIONS, type IslamicOccasion } from "@/lib/islamicOccasions";

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

export function FinancialCalendarCard() {
  const { data: commitments, isLoading } = useListCommitments();
  const { data: skips } = useListCommitmentSkips();

  const today = new Date();
  const currentMonthIdx = today.getMonth();
  const year = today.getFullYear();

  const [modalMonth, setModalMonth] = useState<number | null>(null);
  const [islamicFormOpen, setIslamicFormOpen] = useState(false);
  const [islamicDefaultTitle, setIslamicDefaultTitle] = useState("");
  const [islamicDefaultDate, setIslamicDefaultDate] = useState("");

  if (isLoading) {
    return <Skeleton className="h-[480px] w-full rounded-3xl" />;
  }

  function monthStr(monthIdx: number) {
    return `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
  }

  const skipsByMonth = new Map<string, Set<number>>();
  for (const skip of skips ?? []) {
    if (!skipsByMonth.has(skip.month)) skipsByMonth.set(skip.month, new Set());
    skipsByMonth.get(skip.month)!.add(skip.commitmentId);
  }

  function commitmentsForMonth(monthIdx: number) {
    const ms = monthStr(monthIdx);
    const skippedIds = skipsByMonth.get(ms) ?? new Set<number>();
    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
    return (commitments ?? []).filter((c) => {
      if (c.endDate) {
        const end = new Date(c.endDate as string);
        if (!Number.isNaN(end.getTime())) {
          const day = Math.min(c.dueDay, lastDay);
          const dueDate = new Date(year, monthIdx, day);
          if (dueDate > end) return false;
        }
      }
      if (c.isOneTime) return c.oneTimeMonth === ms;
      return !skippedIds.has(c.id);
    });
  }

  const sorted = (commitments ?? []).slice().sort((a, b) => a.dueDay - b.dueDay);
  const islamicForYear = ISLAMIC_OCCASIONS[year] ?? [];

  // Group Islamic occasions by month for quick lookup
  const islamicByMonth = new Map<number, IslamicOccasion[]>();
  for (const occ of islamicForYear) {
    if (!islamicByMonth.has(occ.monthIdx)) islamicByMonth.set(occ.monthIdx, []);
    islamicByMonth.get(occ.monthIdx)!.push(occ);
  }

  function openIslamicForm(occ: IslamicOccasion, e: React.MouseEvent) {
    e.stopPropagation();
    setIslamicDefaultTitle(occ.name);
    setIslamicDefaultDate(occ.approxDate);
    setIslamicFormOpen(true);
  }

  return (
    <>
      <Card
        className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden"
        data-testid="card-financial-calendar"
      >
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {`التقويم المالي ${year}`}
          </CardTitle>
          <Link href="/app/commitments">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs rounded-xl text-primary hover:bg-primary/10"
              data-testid="button-add-commitment-from-calendar"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة التزام
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          {/* YEARLY GRID */}
          <div className="grid grid-cols-4 gap-2" dir="rtl">
            {MONTHS.map((monthName, monthIdx) => {
              const isCurrentMonth = monthIdx === currentMonthIdx;
              const monthCommitments = commitmentsForMonth(monthIdx).sort((a, b) => a.dueDay - b.dueDay);
              const occasions = islamicByMonth.get(monthIdx) ?? [];

              return (
                <button
                  type="button"
                  key={monthName}
                  onClick={() => setModalMonth(monthIdx)}
                  data-testid={`button-month-${monthIdx + 1}`}
                  className={`group rounded-2xl overflow-hidden border text-left transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    isCurrentMonth
                      ? "border-primary/30 shadow-md"
                      : "border-border/60"
                  }`}
                  aria-label={`${monthName} - عرض التقويم الشهري`}
                >
                  {/* Month name header */}
                  <div
                    className={`px-2 py-1.5 text-center text-xs font-extrabold tracking-wide transition-colors group-hover:bg-primary ${
                      isCurrentMonth
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/80 text-primary-foreground"
                    }`}
                    dir="rtl"
                  >
                    {monthName}
                  </div>

                  {/* Commitment icons */}
                  <div
                    className="px-2 pt-2 pb-1 bg-background/70 flex flex-wrap gap-1.5 justify-center min-h-[56px] items-center"
                    dir="rtl"
                  >
                    {monthCommitments.length === 0 && occasions.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground/60">انقر للتفاصيل</span>
                    ) : (
                      monthCommitments.map((commitment, idx) => {
                        const sortedIdx = sorted.findIndex((c) => c.id === commitment.id);
                        const colorIdx = sortedIdx >= 0 ? sortedIdx : idx;
                        const color = ICON_COLORS[colorIdx % ICON_COLORS.length];
                        const Icon = getIcon(commitment.title);
                        const isPaidThisMonth = isCurrentMonth && commitment.isPaid;
                        const isOneTime = commitment.isOneTime;

                        return (
                          <Tooltip key={commitment.id} delayDuration={120}>
                            <TooltipTrigger asChild>
                              <span
                                role="img"
                                aria-label={commitment.title}
                                onClick={(e) => e.stopPropagation()}
                                className="relative"
                              >
                                <span
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
                                {/* One-time badge */}
                                {isOneTime && (
                                  <span
                                    className="absolute -top-1 -left-1 w-4 h-4 bg-orange-500 text-white rounded-full flex items-center justify-center text-[9px] font-black leading-none ring-1 ring-white"
                                    aria-label="لمرة واحدة"
                                  >
                                    ١
                                  </span>
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={6} dir="rtl" className="font-semibold">
                              {commitment.title}
                              {isOneTime && (
                                <span className="block text-[10px] text-orange-600 font-bold mt-0.5">
                                  ① هذا الشهر فقط — لمرة واحدة
                                </span>
                              )}
                              {isPaidThisMonth && (
                                <span className="block text-[10px] text-emerald-600 font-bold mt-0.5">
                                  ✓ مدفوع لهذا الشهر
                                </span>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })
                    )}
                  </div>

                  {/* Islamic occasions row */}
                  {occasions.length > 0 && (
                    <div
                      className="px-1.5 pb-2 bg-background/70 flex flex-wrap gap-1 justify-center"
                      dir="rtl"
                    >
                      {occasions.map((occ) => (
                        <Tooltip key={occ.name} delayDuration={100}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => openIslamicForm(occ, e)}
                              className="flex items-center gap-0.5 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 hover:bg-amber-100 transition-colors"
                              aria-label={`${occ.name} — انقر لإضافة ميزانية`}
                            >
                              <span className="text-[11px] leading-none">{occ.emoji}</span>
                              <span className="text-[9px] font-bold text-amber-800 leading-none">{occ.name.split(" ")[0]}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6} dir="rtl" className="max-w-[180px]">
                            <div className="font-bold">{occ.name}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{occ.hint}</div>
                            <div className="text-[11px] text-primary font-bold mt-0.5">انقر لإضافة ميزانية خاصة بها</div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 justify-end text-[10px] text-muted-foreground" dir="rtl">
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 bg-teal-100 rounded-full inline-flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
              </span>
              التزام شهري
            </span>
            <span className="flex items-center gap-1">
              <span className="relative inline-flex">
                <span className="w-3.5 h-3.5 bg-sky-100 rounded-full" />
                <span className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-orange-500 text-white rounded-full flex items-center justify-center text-[7px] font-black leading-none">١</span>
              </span>
              التزام لمرة واحدة
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[11px]">🌙🎊🐑</span>
              مناسبة دينية — انقر لتخطيط ميزانيتها
            </span>
          </div>
        </CardContent>
      </Card>

      {modalMonth !== null && (
        <MonthTimelineModal
          open={modalMonth !== null}
          onOpenChange={(open) => { if (!open) setModalMonth(null); }}
          month={modalMonth}
          year={year}
        />
      )}

      {/* Islamic occasion budget form */}
      <EventFormDialog
        open={islamicFormOpen}
        onOpenChange={setIslamicFormOpen}
        defaultTitle={islamicDefaultTitle}
        defaultDate={islamicDefaultDate}
        defaultType="religious"
      />
    </>
  );
}
