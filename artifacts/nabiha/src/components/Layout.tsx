import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Receipt,
  CalendarClock,
  Tags,
  Menu,
  Repeat,
  CalendarDays,
  Calculator,
  Bell,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useUser, useClerk } from "@clerk/react";
import { useListNotifications } from "@workspace/api-client-react";

import logoImage from "@assets/Gemini_Generated_Image_j4skn9j4skn9j4sk_1777144269396.png";

const navItems = [
  { href: "/app", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { href: "/app/expenses", label: "المصاريف", icon: Receipt },
  { href: "/app/subscriptions", label: "الاشتراكات", icon: Repeat },
  { href: "/app/commitments", label: "الالتزامات", icon: CalendarClock },
  { href: "/app/calendar", label: "التقويم المالي", icon: CalendarDays },
  { href: "/app/simulator", label: "محاكي الاقتراض", icon: Calculator },
  { href: "/app/categories", label: "الفئات", icon: Tags },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: notifications } = useListNotifications();
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location === href || location.startsWith(href + "/");

  const NavContent = () => (
    <div className="flex flex-col h-full bg-card shadow-lg sm:shadow-none sm:bg-transparent rounded-r-3xl sm:rounded-none overflow-hidden border-l">
      <div className="p-6 flex flex-col items-center space-y-3">
        <img
          src={logoImage}
          alt="نَبِيهَة"
          className="w-20 h-20 object-cover rounded-full border-4 border-primary/20"
        />
        <div className="text-center">
          <h2 className="text-xl font-bold text-primary">نَبِيهَة</h2>
          <p className="text-xs text-muted-foreground mt-1">
            درهمك بأمان مع نبيهة الزمان
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <nav className="flex flex-col gap-1 py-4">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href} className="w-full">
                <Button
                  variant={active ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 rounded-xl h-11 transition-all ${
                    active
                      ? "bg-gradient-to-l from-primary to-[#7C3AED] text-white shadow-md hover:opacity-90"
                      : "hover:bg-primary/10 hover:text-primary"
                  }`}
                  data-testid={`nav-${item.href.replace(/\//g, "-")}`}
                >
                  <item.icon
                    className={`w-5 h-5 ${active ? "" : "text-primary/70"}`}
                  />
                  <span className="font-medium text-sm">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 mt-auto">
        <div className="bg-gradient-to-l from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-3 rounded-2xl text-center border border-orange-100 dark:border-orange-900/50">
          <p className="text-xs text-orange-800 dark:text-orange-200 font-medium">
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
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden absolute top-4 right-4 z-50"
            data-testid="button-menu"
          >
            <Menu className="w-6 h-6 text-primary" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="p-0 w-72 bg-transparent border-none"
        >
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 fixed top-0 bottom-0 right-0 z-40 bg-card/50 backdrop-blur-xl border-l">
        <NavContent />
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:pr-72 w-full max-w-[1600px] mx-auto p-4 sm:p-6 md:p-8 lg:p-10 pt-16 lg:pt-6 transition-all">
        {/* Top Bar with notifications + user */}
        <div className="flex items-center justify-end gap-2 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            onClick={() => setLocation("/app/notifications")}
            data-testid="button-notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -left-1 w-5 h-5 p-0 flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="rounded-full p-1 h-auto"
                data-testid="button-user-menu"
              >
                <Avatar className="w-9 h-9">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-[#7C3AED] text-white text-sm font-bold">
                    {user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">
                    {user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {user?.emailAddresses?.[0]?.emailAddress}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setLocation("/app/profile")}
                data-testid="menu-profile"
              >
                <UserIcon className="w-4 h-4 ml-2" /> ملفي الشخصي
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => signOut({ redirectUrl: basePathRedirect() })}
                className="text-destructive focus:text-destructive"
                data-testid="menu-signout"
              >
                <LogOut className="w-4 h-4 ml-2" /> تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="max-w-6xl mx-auto h-full">{children}</div>
      </main>
    </div>
  );
}

function basePathRedirect(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return base || "/";
}
