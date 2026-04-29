import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Receipt, CalendarClock, Tags, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

import logoImage from "@assets/Gemini_Generated_Image_j4skn9j4skn9j4sk_1777144269396.png";

const navItems = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/expenses", label: "المصاريف", icon: Receipt },
  { href: "/commitments", label: "الالتزامات", icon: CalendarClock },
  { href: "/categories", label: "الفئات", icon: Tags },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const NavContent = () => (
    <div className="flex flex-col h-full bg-card shadow-lg sm:shadow-none sm:bg-transparent rounded-r-3xl sm:rounded-none overflow-hidden border-l">
      <div className="p-6 flex flex-col items-center space-y-4">
        <img src={logoImage} alt="نَبِيهَة" className="w-24 h-24 object-cover rounded-full border-4 border-primary/20" />
        <div className="text-center">
          <h2 className="text-xl font-bold text-primary">نَبِيهَة</h2>
          <p className="text-sm text-muted-foreground mt-1">رفيقتك المالية</p>
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-4">
        <nav className="flex flex-col gap-2 py-4">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="w-full">
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 rounded-2xl h-12 transition-all ${
                    isActive ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "" : "text-primary/70"}`} />
                  <span className="font-medium text-base">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      
      <div className="p-4 mt-auto">
        <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-2xl text-center border border-orange-100 dark:border-orange-900/50">
          <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
            "الوعي المالي يبدأ بخطوة صغيرة"
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden absolute top-4 right-4 z-50">
            <Menu className="w-6 h-6 text-primary" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="p-0 w-72 bg-transparent border-none">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 fixed top-0 bottom-0 right-0 z-40 bg-card/50 backdrop-blur-xl border-l">
        <NavContent />
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:pr-72 w-full max-w-[1600px] mx-auto p-4 sm:p-6 md:p-8 lg:p-10 pt-16 lg:pt-10 transition-all">
        <div className="max-w-5xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
