import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  CalendarDays,
  Calculator,
  Repeat,
  Bell,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import logoImage from "@assets/Gemini_Generated_Image_j4skn9j4skn9j4sk_1777144269396.png";
import happyMascot from "@assets/Gemini_Generated_Image_d3nzkdd3nzkdd3nz_1777144269395.png";
import smilingMascot from "@assets/Gemini_Generated_Image_7vmi4u7vmi4u7vmi_1777144269396.png";
import seriousMascot from "@assets/Gemini_Generated_Image_fn3x3wfn3x3wfn3x_1777144269396.png";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const features = [
  {
    icon: Wallet,
    title: "تتبّع الراتب والمصاريف",
    desc: "اكتشف أين يذهب كل دينار وقرّر بثقة.",
    color: "from-teal-500 to-emerald-500",
  },
  {
    icon: Repeat,
    title: "إدارة الاشتراكات",
    desc: "نتفلكس، شاهد، Spotify… كلّها بمكان واحد مع رسم بياني واضح.",
    color: "from-purple-500 to-fuchsia-500",
  },
  {
    icon: CalendarDays,
    title: "تقويم مالي ذكي",
    desc: "شوف فواتيرك ومناسباتك المالية على تقويم سنوي وشهري.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: Calculator,
    title: "محاكي القدرة على الاقتراض",
    desc: "احسب قسطك المتوقّع وقدرتك الحقيقية قبل ما توقّع.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Bell,
    title: "تنبيهات داخل التطبيق",
    desc: "نذكّرك بالفواتير، الاشتراكات، والمناسبات قبل أيّ تأخير.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: ShieldCheck,
    title: "بياناتك بأمان",
    desc: "تسجيل دخول آمن عبر Clerk وحماية كاملة لمعلوماتك.",
    color: "from-green-500 to-teal-500",
  },
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between max-w-7xl">
        <div className="flex items-center gap-3">
          <img
            src={logoImage}
            alt="نَبِيهَة"
            className="w-12 h-12 rounded-full border-2 border-primary/30 object-cover"
          />
          <div>
            <h1 className="text-xl font-bold text-primary">نَبِيهَة</h1>
            <p className="text-[11px] text-muted-foreground">
              منصّة الذكاء المالي
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sign-in">
            <Button
              variant="ghost"
              className="text-primary"
              data-testid="link-signin"
            >
              تسجيل الدخول
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button
              className="bg-gradient-to-l from-primary to-[#7C3AED] text-white shadow-lg hover:opacity-90"
              data-testid="link-signup"
            >
              ابدأ مجاناً
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-12 md:py-20 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-right space-y-6 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent-foreground border border-accent/30 px-4 py-1.5 rounded-full text-sm">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="font-medium">منصّة الذكاء المالي العربية</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-l from-primary to-[#7C3AED] bg-clip-text text-transparent">
                درهمك بأمان
              </span>
              <br />
              <span className="text-foreground">مع نبيهة الزمان</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
              نَبِيهَة هي رفيقتك الذكيّة لإدارة الراتب، المصاريف، الاشتراكات،
              والالتزامات — بواجهة عربية بالكامل وتجربة تشبهك.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="bg-gradient-to-l from-primary to-[#7C3AED] text-white shadow-xl hover:opacity-90 h-14 px-8 text-lg gap-2"
                  data-testid="cta-signup"
                >
                  ابدأ رحلتك المالية
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg border-2"
                  data-testid="cta-signin"
                >
                  لديّ حساب
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-6 pt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                مجّاني بالكامل
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                حماية كاملة
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                عربي 100%
              </span>
            </div>
          </div>

          <div className="relative order-1 lg:order-2 flex justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/20 to-accent/20 blur-3xl rounded-full" />
            <img
              src={happyMascot}
              alt="Nabiha mascot"
              className="relative w-72 h-72 md:w-96 md:h-96 object-cover rounded-full shadow-2xl border-8 border-white"
            />
            <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-primary/20">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">الرصيد المتبقّي</p>
                <p className="text-lg font-bold text-foreground">2,340 د.أ</p>
              </div>
            </div>
            <div className="absolute -top-2 -left-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-purple-200">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Repeat className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">اشتراكات نشطة</p>
                <p className="text-lg font-bold text-foreground">5</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            كل ما تحتاجه لإدارة ماليتك
          </h3>
          <p className="text-muted-foreground text-lg">
            ميزات مصمَّمة خصّيصاً للعقل العربي والثقافة المالية المحلّية
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-card rounded-3xl p-6 border hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
              >
                <f.icon className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-xl font-bold mb-2">{f.title}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Mascot showcase */}
      <section className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="bg-gradient-to-br from-primary/10 via-purple-500/5 to-accent/10 rounded-[40px] p-8 md:p-16 relative overflow-hidden border border-primary/10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-right space-y-4">
              <h3 className="text-3xl md:text-4xl font-bold">
                نَبِيهَة معك في كل خطوة
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                مرشدتك الودودة تحتفل معك بإنجازاتك، تنبّهك للمخاطر، وتشاركك
                النصيحة المناسبة في الوقت المناسب.
              </p>
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="mt-4 bg-gradient-to-l from-primary to-[#7C3AED] text-white shadow-lg gap-2"
                  data-testid="cta-mascot"
                >
                  انضم الآن
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[happyMascot, smilingMascot, seriousMascot].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="mascot"
                  className="w-full aspect-square object-cover rounded-2xl shadow-lg border-4 border-white"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 max-w-7xl border-t mt-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img
              src={logoImage}
              alt="نَبِيهَة"
              className="w-8 h-8 rounded-full"
            />
            <span>© 2026 نَبِيهَة — جميع الحقوق محفوظة</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={`${basePath || ""}/sign-in`} className="hover:text-primary">
              تسجيل الدخول
            </a>
            <a href={`${basePath || ""}/sign-up`} className="hover:text-primary">
              حساب جديد
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
