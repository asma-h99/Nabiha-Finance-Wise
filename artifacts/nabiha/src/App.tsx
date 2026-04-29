import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { clerkAppearance, clerkLocalization } from "@/lib/clerkAppearance";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Expenses from "@/pages/Expenses";
import Commitments from "@/pages/Commitments";
import Categories from "@/pages/Categories";
import Subscriptions from "@/pages/Subscriptions";
import Calendar from "@/pages/Calendar";
import Simulator from "@/pages/Simulator";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";
import { useGetProfile } from "@workspace/api-client-react";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/app`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/app`}
      />
    </div>
  );
}

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

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <OnboardingGate>
          <Redirect to="/app" />
        </OnboardingGate>
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading, isError, error } = useGetProfile();
  if (isLoading) return null;
  if (isError) {
    // Fail closed: do NOT pass through children if profile fetch failed,
    // otherwise we could bypass onboarding enforcement on transient errors.
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 text-center"
        data-testid="onboarding-gate-error"
      >
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-semibold">تعذّر تحميل ملفك</h2>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message ?? "حدث خطأ أثناء التواصل مع الخادم."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center justify-center rounded-md border bg-primary text-primary-foreground px-4 py-2 text-sm"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }
  if (!profile || !profile.onboardingComplete) {
    return <Redirect to="/onboarding" />;
  }
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <OnboardingGate>{children}</OnboardingGate>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ProtectedRouteRaw({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={clerkLocalization}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/onboarding">
            <ProtectedRouteRaw>
              <Onboarding />
            </ProtectedRouteRaw>
          </Route>
          <Route path="/app">
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          </Route>
          <Route path="/app/expenses">
            <ProtectedRoute>
              <Layout>
                <Expenses />
              </Layout>
            </ProtectedRoute>
          </Route>
          <Route path="/app/commitments">
            <ProtectedRoute>
              <Layout>
                <Commitments />
              </Layout>
            </ProtectedRoute>
          </Route>
          <Route path="/app/subscriptions">
            <ProtectedRoute>
              <Layout>
                <Subscriptions />
              </Layout>
            </ProtectedRoute>
          </Route>
          <Route path="/app/calendar">
            <ProtectedRoute>
              <Layout>
                <Calendar />
              </Layout>
            </ProtectedRoute>
          </Route>
          <Route path="/app/simulator">
            <ProtectedRoute>
              <Layout>
                <Simulator />
              </Layout>
            </ProtectedRoute>
          </Route>
          <Route path="/app/categories">
            <ProtectedRoute>
              <Layout>
                <Categories />
              </Layout>
            </ProtectedRoute>
          </Route>
          <Route path="/app/notifications">
            <ProtectedRoute>
              <Layout>
                <Notifications />
              </Layout>
            </ProtectedRoute>
          </Route>
          <Route path="/app/profile">
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <div dir="rtl" className="w-full min-h-[100dvh] font-sans text-right">
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
      </div>
    </TooltipProvider>
  );
}

export default App;
