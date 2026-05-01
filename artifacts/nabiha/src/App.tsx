import { useEffect, useRef } from "react";
import { Switch, Route, Redirect, Router as WouterRouter, useLocation, Link } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, SignOutButton, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Sparkles, ShieldCheck, PieChart, Calendar, Wallet, ArrowLeft, LogOut } from "lucide-react";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Money from "@/pages/Money";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { NotificationsBell } from "@/components/NotificationsBell";

import logoImage from "@assets/Gemini_Generated_Image_j4skn9j4skn9j4sk_1777594348722.png";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "none" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${logoImage}`,
  },
  variables: {
    colorPrimary: "#1B7E63",
    colorForeground: "#1a1a2e",
    colorMutedForeground: "#6b7280",
    colorDanger: "#ef4444",
    colorBackground: "#ffffff",
    colorInput: "#f0faf6",
    colorInputForeground: "#1a1a2e",
    colorNeutral: "#e5e7eb",
    fontFamily: "'IBM Plex Sans Arabic', 'Readex Pro', system-ui, sans-serif",
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-3xl w-[440px] max-w-full overflow-hidden shadow-xl border border-[#e5e7eb]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none px-2",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold text-[#1a1a2e]",
    headerSubtitle: "text-sm text-[#6b7280]",
    socialButtonsBlockButton: "border border-[#e5e7eb] hover:bg-[#f0faf6] rounded-xl h-12",
    socialButtonsBlockButtonText: "text-[#1a1a2e] font-semibold",
    formFieldLabel: "text-[#1a1a2e] font-semibold text-sm",
    formFieldInput: "bg-[#f0faf6] border border-[#e5e7eb] rounded-xl h-12 px-4 text-[#1a1a2e]",
    formButtonPrimary: "bg-[#1B7E63] hover:bg-[#15604B] text-white font-semibold h-12 rounded-xl shadow-md",
    footerAction: "pt-2",
    footerActionLink: "text-[#1B7E63] hover:text-[#15604B] font-semibold",
    footerActionText: "text-[#6b7280]",
    dividerLine: "bg-[#e5e7eb]",
    dividerText: "text-[#6b7280] text-xs",
    identityPreviewEditButton: "text-[#1B7E63] hover:text-[#15604B]",
    formFieldSuccessText: "text-emerald-600",
    alert: "bg-red-50 border border-red-200 rounded-xl",
    alertText: "text-red-700",
    otpCodeFieldInput: "bg-[#f0faf6] border border-[#e5e7eb] rounded-xl text-[#1a1a2e]",
    formFieldRow: "space-y-1.5",
    main: "gap-5",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AuthBrand() {
  return (
    <div dir="rtl" className="flex flex-col items-center gap-3 mb-6">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-110" />
        <img
          src={logoImage}
          alt="نَبِيهَة"
          className="relative w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl"
        />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-[#1B7E63] leading-tight">نَبِيهَة</h1>
        <p className="text-sm text-[#6b7280] mt-0.5 font-medium">رفيقك المالي الذكي</p>
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <div dir="ltr" className="flex min-h-[100dvh] flex-col items-center bg-gradient-to-br from-[#f0faf6] via-white to-[#fffbf0] px-4 pt-10 pb-10">
      <AuthBrand />
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/app`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div dir="ltr" className="flex min-h-[100dvh] flex-col items-center bg-gradient-to-br from-[#f0faf6] via-white to-[#fffbf0] px-4 pt-10 pb-10">
      <AuthBrand />
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/app`}
      />
    </div>
  );
}

function Landing() {
  return (
    <div dir="rtl" className="min-h-[100dvh] bg-gradient-to-br from-[#f0faf6] via-white to-[#fffbf0] text-foreground">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoImage} alt="نَبِيهَة" className="w-12 h-12 rounded-full border-2 border-primary/20 object-cover" />
          <div>
            <h1 className="text-xl font-extrabold text-primary">نَبِيهَة</h1>
            <p className="text-xs text-muted-foreground">رفيقك المالي الذكي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sign-in"><Button variant="ghost" className="rounded-xl font-semibold" data-testid="button-signin">تسجيل الدخول</Button></Link>
          <Link href="/sign-up"><Button className="rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md" data-testid="button-signup">ابدأ مجاناً</Button></Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-8 pb-20">
        <section className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6 order-2 lg:order-1">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <Sparkles className="w-4 h-4" /> منصة ذكاء مالي للموظفين الجدد
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
              <span className="text-foreground">درهمك بأمان</span>
              <br />
              <span className="text-primary">مع نبيهة الزمان</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              تابع راتبك واشتراكاتك، وخطط لمستقبلك المالي بثقة. نبيهة بتساعدك تعرف وين بيروح كل دينار، وبتنبهك قبل ما تتورط بأي قرض.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/sign-up">
                <Button size="lg" className="rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg h-14 px-8 text-base" data-testid="button-cta-signup">
                  ابدأ مع نبيهة <ArrowLeft className="w-5 h-5 mr-2" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="rounded-2xl font-bold h-14 px-8 text-base" data-testid="button-cta-signin">
                  عندي حساب
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              تسجيل دخول آمن عبر Gmail أو البريد الإلكتروني
            </div>
          </div>

          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
              <img src={logoImage} alt="نَبِيهَة" className="relative w-48 h-48 md:w-64 md:h-64 rounded-full object-cover border-4 border-white shadow-xl" />
            </div>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-20">
          {[
            { icon: Wallet, title: "إدارة الراتب", desc: "حدّد راتبك وعملتك وتتبع رصيدك بكل لحظة" },
            { icon: PieChart, title: "تتبع الاشتراكات", desc: "شوف كم بياكلوا اشتراكاتك من راتبك بمخطط واضح" },
            { icon: Calendar, title: "تقويم مالي", desc: "كل التزاماتك ومناسباتك بمكان واحد لكل السنة" },
            { icon: ShieldCheck, title: "محاكي القروض", desc: "احسب قبل ما تقترض واعرف إذا القرض آمن" },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} نَبِيهَة • جميع الحقوق محفوظة
      </footer>
    </div>
  );
}

function AppShell() {
  const { user } = useUser();
  return (
    <Layout
      headerExtra={
        <div className="flex items-center gap-2 flex-wrap justify-end w-full">
          <NotificationsBell />
          <div className="flex-1" />
          <CurrencySwitcher />
          {user && (
            <span className="hidden md:inline text-sm text-muted-foreground font-medium">
              {user.firstName || user.username || user.primaryEmailAddress?.emailAddress}
            </span>
          )}
          <SignOutButton redirectUrl={basePath || "/"}>
            <Button variant="ghost" size="sm" className="rounded-xl gap-2" data-testid="button-signout">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </SignOutButton>
        </div>
      }
    >
      <Switch>
        <Route path="/app" component={Dashboard} />
        <Route path="/app/money" component={Money} />
        <Route path="/app/expenses">
          <Redirect to="/app/money" />
        </Route>
        <Route path="/app/commitments">
          <Redirect to="/app/money" />
        </Route>
        <Route path="/app/categories">
          <Redirect to="/app/money" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function ProtectedApp() {
  return (
    <>
      <Show when="signed-in">
        <AppShell />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/app" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ClerkAppRouter() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        locale: "ar-SA",
        signIn: {
          start: {
            title: "أهلاً بعودتك",
            subtitle: "سجّل دخولك للمتابعة مع نَبِيهَة",
          },
        },
        signUp: {
          start: {
            title: "أنشئ حسابك",
            subtitle: "ابدأ رحلتك مع الذكاء المالي",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <CurrencyProvider>
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/app/:rest*" component={ProtectedApp} />
            <Route path="/app" component={ProtectedApp} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
        </CurrencyProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkAppRouter />
    </WouterRouter>
  );
}

export default App;
