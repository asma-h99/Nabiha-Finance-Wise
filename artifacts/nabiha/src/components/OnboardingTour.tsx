import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Wallet, RefreshCw, Sparkles, Calculator, ChevronRight, ChevronLeft } from "lucide-react";

const LEGACY_TOUR_KEY = "nabiha_tour_seen";

function tourKey(userId: string | null | undefined) {
  return userId ? `nabiha_tour_seen_${userId}` : LEGACY_TOUR_KEY;
}

function hasTourBeenSeen(userId: string | null | undefined): boolean {
  const key = tourKey(userId);
  // Check user-specific key first, then fall back to legacy global key
  // (so users who saw the tour before the per-user key migration don't see it again)
  return !!(localStorage.getItem(key) || localStorage.getItem(LEGACY_TOUR_KEY));
}

const steps = [
  {
    icon: LayoutDashboard,
    color: "bg-emerald-50 text-emerald-700",
    ring: "ring-emerald-200",
    title: "لوحة التحكم",
    body: "تجد هنا نظرة شاملة على راتبك ورصيدك ومدخراتك. الرسوم البيانية تعطيك صورة واضحة عن كيفية توزيع دخلك على مدار الشهر، وتقارير توضح أين يذهب كل دينار.",
  },
  {
    icon: Wallet,
    color: "bg-blue-50 text-blue-700",
    ring: "ring-blue-200",
    title: "مالي الشهري",
    body: "سجّل مصاريفك الشهرية والتزاماتك المتكررة كالإيجار والاشتراكات. نبيهة تعرض لك تفصيل كامل لكل شهر وتساعدك تفهم أين تروح فلوسك بدقة.",
  },
  {
    icon: RefreshCw,
    color: "bg-violet-50 text-violet-700",
    ring: "ring-violet-200",
    title: "محوّل العملة",
    body: "غيّر عملة العرض بضغطة واحدة لترى أرصدتك ومصاريفك بأي عملة تريد. التحويل يصير تلقائياً بناءً على أسعار الصرف المحدّثة.",
  },
  {
    icon: Sparkles,
    color: "bg-amber-50 text-amber-700",
    ring: "ring-amber-200",
    title: "نبيهة",
    body: "مساعدتك المالية الذكية التي تراقب وضعك وتنبّهك عند الحاجة. تظهر لك تنبيهات وتلميحات مخصصة بناءً على بياناتك الفعلية حتى تبقى دايماً في السيطرة.",
  },
  {
    icon: Calculator,
    color: "bg-rose-50 text-rose-700",
    ring: "ring-rose-200",
    title: "محاكي القرض",
    body: "قبل ما تقترض، استخدم المحاكي لتعرف القسط الشهري وإجمالي التكلفة ومدى أمان القرض بالنسبة لراتبك. خذ قرارك بثقة ووضوح.",
  },
];

export function OnboardingTour() {
  const { user, isLoaded } = useUser();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;
    if (!hasTourBeenSeen(user?.id)) {
      setOpen(true);
    }
  }, [isLoaded, user?.id]);

  function dismiss() {
    const key = tourKey(user?.id);
    localStorage.setItem(key, "1");
    setOpen(false);
  }

  const current = steps[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent
        dir="rtl"
        className="max-w-md w-[calc(100vw-2rem)] rounded-3xl p-0 overflow-hidden border-0 shadow-2xl gap-0"
      >
        <DialogTitle className="sr-only">جولة تعريفية بنبيهة</DialogTitle>
        <DialogDescription className="sr-only">
          جولة تعريفية تشرح الميزات الأساسية في تطبيق نبيهة
        </DialogDescription>

        {/* Header gradient strip */}
        <div className="h-1.5 w-full bg-gradient-to-l from-emerald-400 via-primary to-emerald-600" />

        {/* Body — keyed to animate on step change */}
        <div
          key={step}
          className="px-6 pt-8 pb-6 flex flex-col items-center text-center gap-5 animate-in fade-in slide-in-from-right-4 duration-300"
        >
          {/* Step badge */}
          <span className="text-xs font-bold text-muted-foreground tracking-widest">
            {step + 1} / {steps.length}
          </span>

          {/* Icon */}
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ring-4 ${current.color} ${current.ring} shadow-sm`}>
            <Icon className="w-9 h-9" />
          </div>

          {/* Text */}
          <div className="space-y-2 min-h-[7rem] flex flex-col justify-center">
            <h2 className="text-xl font-extrabold text-foreground">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center gap-2 justify-center">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`الخطوة ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-6 h-2.5 bg-primary"
                    : "w-2.5 h-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3 w-full pt-1">
            {!isFirst && (
              <Button
                variant="outline"
                className="flex-1 rounded-2xl gap-2 h-11"
                onClick={() => setStep((s) => s - 1)}
              >
                <ChevronRight className="w-4 h-4" />
                السابق
              </Button>
            )}

            {!isLast ? (
              <Button
                className="flex-1 rounded-2xl gap-2 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                onClick={() => setStep((s) => s + 1)}
              >
                التالي
                <ChevronLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                className="flex-1 rounded-2xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
                onClick={dismiss}
              >
                ابدأ الآن 🚀
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
