import { useState } from "react";
import {
  useListCommitments,
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

  const today = new Date();
  const currentMonthIdx = today.getMonth();
  const year = today.getFullYear();

  const [modalMonth, setModalMonth] = useState<number | null>(null);

  if (isLoading) {
    return <Skeleton className="h-[480px] w-full rounded-3xl" />;
  }

  const isEmpty = !commitments || commitments.length === 0;
  const sorted = (commitments ?? []).slice().sort((a, b) => a.dueDay - b.dueDay);

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
              إضافة
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="px-4 pb-5">
          {/* === YEARLY GRID === */}
          <div className="grid grid-cols-4 gap-2" dir="rtl">
            {MONTHS.map((month, monthIdx) => {
              const isCurrentMonth = monthIdx === currentMonthIdx;
              return (
                <button
                  type="button"
                  key={month}
                  onClick={() => setModalMonth(monthIdx)}
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
                    {isEmpty ? (
                      <span className="text-[10px] text-muted-foreground/60">انقر للتفاصيل</span>
                    ) : (
                      sorted.map((commitment, idx) => {
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
                      })
                    )}
                  </div>
                </button>
              );
            })}
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
    </>
  );
}
