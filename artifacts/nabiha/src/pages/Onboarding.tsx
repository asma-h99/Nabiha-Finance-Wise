import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import {
  useGetProfile,
  useUpdateProfile,
  getGetProfileQueryKey,
  type Currency,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import smilingMascot from "@assets/Gemini_Generated_Image_7vmi4u7vmi4u7vmi_1777144269396.png";
import happyMascot from "@assets/Gemini_Generated_Image_d3nzkdd3nzkdd3nz_1777144269395.png";
import logoImage from "@assets/Gemini_Generated_Image_j4skn9j4skn9j4sk_1777144269396.png";

const STEPS = ["welcome", "currency", "salary", "done"] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const { data: profile } = useGetProfile();
  const qc = useQueryClient();
  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      },
    },
  });

  const [step, setStep] = useState<Step>("welcome");
  const [currency, setCurrency] = useState<Currency>(profile?.currency ?? "JOD");
  const [salary, setSalary] = useState<string>(
    profile?.monthlySalary?.toString() ?? "",
  );
  const [submitting, setSubmitting] = useState(false);

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };
  const prev = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      await updateProfile.mutateAsync({
        data: {
          monthlySalary: parseFloat(salary || "0"),
          currency,
          onboardingComplete: true,
        },
      });
      setStep("done");
      setTimeout(() => setLocation("/app"), 1600);
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center mb-6 gap-3">
          <img
            src={logoImage}
            alt="نَبِيهَة"
            className="w-12 h-12 rounded-full border-2 border-primary/30"
          />
          <h1 className="text-2xl font-bold text-primary">نَبِيهَة</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.slice(0, 3).map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                i <= stepIndex
                  ? "w-12 bg-gradient-to-l from-primary to-[#7C3AED]"
                  : "w-8 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="bg-card rounded-3xl p-8 md:p-12 shadow-xl border">
          {step === "welcome" && (
            <div className="text-center space-y-6 animate-in fade-in duration-500">
              <img
                src={smilingMascot}
                alt="مرحباً"
                className="w-32 h-32 mx-auto rounded-full border-4 border-primary/20 shadow-lg"
              />
              <div>
                <h2 className="text-3xl font-bold mb-3">
                  أهلاً {user?.firstName ?? "بك"}! 🎉
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto">
                  أنا نَبِيهَة، رفيقتك الجديدة. خلّينا نتعرّف على بعض قبل ما
                  نبدأ — رح آخذ منك دقيقتين بس.
                </p>
              </div>
              <Button
                onClick={next}
                size="lg"
                className="bg-gradient-to-l from-primary to-[#7C3AED] text-white shadow-lg gap-2 h-12 px-8"
                data-testid="btn-start"
              >
                يلا نبدأ
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
          )}

          {step === "currency" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center">
                <Sparkles className="w-10 h-10 text-accent mx-auto mb-3" />
                <h2 className="text-2xl font-bold mb-2">
                  شو هي عملتك الأساسيّة؟
                </h2>
                <p className="text-muted-foreground">
                  رح نعرض كل المبالغ بهالعملة (تقدر تغيّرها لاحقاً)
                </p>
              </div>
              <div>
                <Label className="mb-2 block">العملة</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                  <SelectTrigger
                    className="h-12 text-base"
                    data-testid="select-currency"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-3 w-full">
                          <span className="font-bold w-12">{c.symbol}</span>
                          <span>{c.labelAr}</span>
                          <span className="text-xs text-muted-foreground mr-auto">
                            {c.code}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={prev}
                  className="gap-2"
                  data-testid="btn-back"
                >
                  <ArrowRight className="w-4 h-4" />
                  رجوع
                </Button>
                <Button
                  onClick={next}
                  className="bg-gradient-to-l from-primary to-[#7C3AED] text-white gap-2 px-8"
                  data-testid="btn-next-currency"
                >
                  التالي
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "salary" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">
                  شو راتبك الشهري؟ 💰
                </h2>
                <p className="text-muted-foreground">
                  هاي المعلومة سرّيّة بالكامل — بنحتاجها بس لحساب قدراتك المالية.
                </p>
              </div>
              <div>
                <Label className="mb-2 block">الراتب الشهري</Label>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="0.00"
                    className="h-14 text-2xl font-bold text-left pl-20"
                    data-testid="input-salary"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-primary">
                    {CURRENCY_OPTIONS.find((c) => c.code === currency)
                      ?.symbol ?? ""}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ممكن تتركها فاضية وتعبّيها لاحقاً
                </p>
              </div>
              <div className="flex justify-between gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={prev}
                  className="gap-2"
                  data-testid="btn-back-salary"
                >
                  <ArrowRight className="w-4 h-4" />
                  رجوع
                </Button>
                <Button
                  onClick={finish}
                  disabled={submitting}
                  className="bg-gradient-to-l from-primary to-[#7C3AED] text-white gap-2 px-8"
                  data-testid="btn-finish"
                >
                  {submitting ? "جارٍ الحفظ..." : "إنهاء"}
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <img
                src={happyMascot}
                alt="جاهز"
                className="w-32 h-32 mx-auto rounded-full border-4 border-primary/20 shadow-lg"
              />
              <div>
                <h2 className="text-3xl font-bold mb-2">جاهز! 🎊</h2>
                <p className="text-muted-foreground text-lg">
                  جاري نقلك إلى لوحة التحكم...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
