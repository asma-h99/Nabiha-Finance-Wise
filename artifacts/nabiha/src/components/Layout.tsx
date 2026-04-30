import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Receipt, CalendarClock, Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

import logoImage from "@assets/Gemini_Generated_Image_j4skn9j4skn9j4sk_1777144269396.png";

const navItems = [
  { href: "/app", label: "لوحة التحكم", icon: LayoutDashboard, hint: "نظرة شاملة على راتبك ومصاريفك" },
  { href: "/app/expenses", label: "المصاريف", icon: Receipt, hint: "سجّل مصاريفك حسب الأولوية" },
  { href: "/app/commitments", label: "الالتزامات والفئات", icon: CalendarClock, hint: "إيجار، فواتير، أقساط، وفئات" },
];

export default function Layout({
  children,
  headerExtra,
}: {
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with brand gradient */}
      <div className="relative px-6 pt-8 pb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-primary/10">
        <div className="absolute -top-6 -left-6 w-24 h-24 bg-accent/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-primary/15 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex flex-col items-center space-y-3">
          <div className="relative">
            <img
              src={logoImage}
              alt="نَبِيهَة"
              className="w-20 h-20 object-cover rounded-full border-4 border-card shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 bg-accent text-accent-foreground rounded-full w-7 h-7 flex items-center justify-center shadow-md ring-2 ring-card">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-primary tracking-tight">نَبِيهَة</h2>
            <p className="text-xs text-muted-foreground mt-0.5">رفيقك المالي الذكي</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="px-2 pt-4 pb-2 text-[11px] font-bold text-muted-foreground tracking-wide">
          القائمة الرئيسية
        </div>
        <nav className="flex flex-col gap-1.5 pb-4">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/app" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="w-full" onClick={onNavigate}>
                <Button
                  variant="ghost"
                  data-testid={`nav-${item.href.replace(/\W+/g, "-")}`}
                  className={`group w-full h-auto justify-start gap-3 rounded-2xl px-3 py-3 transition-all ${
                    isActive
                      ? "bg-gradient-to-l from-primary to-primary/85 text-primary-foreground shadow-md hover:from-primary hover:to-primary/85 hover:text-primary-foreground"
                      : "text-foreground hover:bg-primary/8 hover:text-primary"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-colors ${
                      isActive
                        ? "bg-white/15 text-primary-foreground"
                        : "bg-primary/10 text-primary group-hover:bg-primary/15"
                    }`}
                  >
                    <item.icon className="w-[1.125rem] h-[1.125rem]" />
                  </span>
                  <span className="flex-1 min-w-0 text-right">
                    <span className="block text-sm font-bold leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={`block text-[11px] mt-0.5 truncate ${
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      {item.hint}
                    </span>
                  </span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer quote */}
      <div className="p-4 mt-auto border-t border-primary/10 bg-gradient-to-t from-accent/5 to-transparent">
        <div className="bg-card/80 backdrop-blur p-3.5 rounded-2xl text-center border border-accent/30 shadow-sm">
          <p className="text-sm text-primary font-bold leading-relaxed">
            "درهمك بأمان مع نبيهة الزمان"
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden fixed top-4 right-4 z-50 h-10 w-10 rounded-xl bg-card/95 backdrop-blur border-primary/20 shadow-md hover:bg-primary/10"
            data-testid="button-mobile-menu"
            aria-label="فتح القائمة"
          >
            <Menu className="w-5 h-5 text-primary" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="p-0 w-[18rem] sm:w-80 border-l border-primary/10 shadow-2xl bg-gradient-to-b from-background via-card to-card"
        >
          <SheetTitle className="sr-only">قائمة التنقل</SheetTitle>
          <SheetDescription className="sr-only">
            تنقّل بين أقسام نَبِيهَة: لوحة التحكم، المصاريف، والالتزامات والفئات.
          </SheetDescription>
          <NavContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 fixed top-0 bottom-0 right-0 z-40 bg-card/70 backdrop-blur-xl border-l border-primary/10">
        <NavContent />
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:pr-72 w-full max-w-[1600px] mx-auto p-4 sm:p-6 md:p-8 lg:p-10 pt-16 lg:pt-10 transition-all">
        {headerExtra && (
          <div className="max-w-5xl mx-auto flex justify-end mb-4">
            {headerExtra}
          </div>
        )}
        <div className="max-w-5xl mx-auto h-full">{children}</div>
      </main>
    </div>
  );
}
