import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Info,
  CreditCard,
  TrendingUp,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useLocation } from "wouter";

const TYPE_ICONS: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  info: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-100",
  },
  success: {
    icon: TrendingUp,
    color: "text-green-600",
    bg: "bg-green-100",
  },
  danger: {
    icon: CreditCard,
    color: "text-red-600",
    bg: "bg-red-100",
  },
};

export default function Notifications() {
  const { data: notifications, isLoading } = useListNotifications();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const markRead = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      },
    },
  });
  const markAllRead = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      },
    },
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" />
            التنبيهات
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `لديك ${unreadCount} تنبيه جديد`
              : "كل التنبيهات مقروءة"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="gap-2"
            data-testid="btn-mark-all-read"
          >
            <CheckCheck className="w-4 h-4" />
            تعليم الكل كمقروء
          </Button>
        )}
      </div>

      {!notifications?.length ? (
        <Card className="rounded-3xl">
          <CardContent className="p-12 text-center">
            <Bell className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">لا توجد تنبيهات</h3>
            <p className="text-muted-foreground">
              عند حدوث أي شيء مهم، رح تشوفه هون.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const meta = TYPE_ICONS[n.type] ?? TYPE_ICONS.info;
            const Icon = meta.icon;
            const ctaLabel =
              n.link?.startsWith("/app/subscriptions")
                ? "افتح الاشتراكات"
                : n.link?.startsWith("/app/calendar")
                  ? "افتح التقويم"
                  : n.link?.startsWith("/app/commitments")
                    ? "افتح الالتزامات"
                    : n.link?.startsWith("/app/simulator")
                      ? "افتح المحاكي"
                      : "افتح";
            const handleOpen = () => {
              if (!n.isRead) markRead.mutate({ id: n.id });
              if (n.link) navigate(n.link);
            };
            return (
              <Card
                key={n.id}
                className={`rounded-2xl transition-all hover:shadow-md ${n.link ? "cursor-pointer" : ""} ${
                  !n.isRead ? "border-primary/30 bg-primary/5" : ""
                }`}
                onClick={() => {
                  if (n.link) handleOpen();
                  else if (!n.isRead) markRead.mutate({ id: n.id });
                }}
                data-testid={`notification-${n.id}`}
              >
                <CardContent className="p-5 flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-6 h-6 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-base">{n.title}</h3>
                      {!n.isRead && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] shrink-0">
                          جديد
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: ar,
                        })}
                      </p>
                      {n.link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-primary hover:text-primary gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpen();
                          }}
                          data-testid={`btn-open-${n.id}`}
                        >
                          {ctaLabel}
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
