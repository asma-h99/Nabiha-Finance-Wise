import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, Loader2, Mail, Send, Sparkles } from "lucide-react";
import { useUser } from "@clerk/react";
import {
  useGetUserProfile,
  useUpdateUserProfile,
  useSendTestNotification,
  getGetUserProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const { user } = useUser();
  const { data: profile } = useGetUserProfile();
  const updateProfile = useUpdateUserProfile();
  const sendTest = useSendTestNotification();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const initializedRef = useRef(false);

  const fallbackEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const fallbackName = user?.firstName ?? user?.fullName ?? "";

  // Initialize form fields exactly once when the profile first loads.
  // Subsequent profile refetches must not stomp on user edits in progress.
  useEffect(() => {
    if (initializedRef.current) return;
    if (!profile) return;
    setEnabled(!!profile.emailNotificationsEnabled);
    setEmail(profile.notificationEmail ?? fallbackEmail);
    setName(profile.userName ?? fallbackName);
    initializedRef.current = true;
  }, [profile, fallbackEmail, fallbackName]);

  const isActive = !!profile?.emailNotificationsEnabled;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });

  const handleSave = async () => {
    if (enabled && !email.trim()) {
      toast({
        title: "البريد مطلوب",
        description: "يرجى إدخال بريد إلكتروني لاستلام التنبيهات.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateProfile.mutateAsync({
        data: {
          emailNotificationsEnabled: enabled,
          notificationEmail: enabled ? email.trim() : null,
          userName: name.trim() || null,
        },
      });
      await invalidate();
      toast({
        title: enabled ? "تم تفعيل التنبيهات" : "تم إيقاف التنبيهات",
        description: enabled
          ? "ستصلك رسالة تذكيرية قبل ٤٨ ساعة من كل التزام."
          : "لن تصلك رسائل تذكير حتى تعيد التفعيل.",
      });
      setOpen(false);
    } catch {
      toast({
        title: "تعذّر الحفظ",
        description: "حاول مرة أخرى بعد قليل.",
        variant: "destructive",
      });
    }
  };

  const handleTest = async () => {
    if (!email.trim()) {
      toast({
        title: "البريد مطلوب",
        description: "أدخل بريداً أولاً ثم جرّب الإرسال.",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await sendTest.mutateAsync({
        data: { email: email.trim(), userName: name.trim() || null },
      });
      toast({
        title: "تم الإرسال",
        description: result.message,
      });
    } catch {
      toast({
        title: "فشل الإرسال",
        description: "تأكدي من البريد الإلكتروني وحاولي مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "rounded-xl h-9 w-9 relative border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-400",
            isActive && "border-amber-400 bg-amber-100",
          )}
          data-testid="button-notifications-bell"
          aria-label="تنبيهات نَبِيهَة"
        >
          <Bell className="w-4 h-4 text-amber-500" fill="currentColor" />
          {isActive && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-card" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent dir="rtl" className="sm:max-w-md rounded-3xl">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-md">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-extrabold text-right">
                تنبيهات تجديد الالتزامات
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground text-right mt-0.5">
                نُرسل لك تذكيراً ودوداً قبل ٤٨ ساعة من كل موعد تجديد.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-3.5">
            <div className="flex-1">
              <div className="text-sm font-bold text-foreground">تفعيل التنبيهات بالبريد</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {isActive ? "مفعّلة الآن — ستصلك التذكيرات تلقائياً" : "غير مفعّلة — لن تصلك أي رسائل"}
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              data-testid="switch-email-notifications"
              aria-label="تفعيل التنبيهات"
            />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-name" className="text-xs font-bold text-foreground">
              الاسم (يظهر في التحية)
            </Label>
            <Input
              id="notif-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: أسماء"
              className="rounded-xl text-right"
              data-testid="input-notif-name"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-email" className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary" />
              البريد الإلكتروني للتنبيهات
            </Label>
            <Input
              id="notif-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              dir="ltr"
              className="rounded-xl text-left"
              data-testid="input-notif-email"
            />
          </div>

          {/* Hint card */}
          <div className="rounded-2xl bg-primary/5 border border-primary/15 p-3 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-foreground leading-relaxed">
              ستصلك رسالة بنبرة ودودة من نَبِيهَة قبل يومين من كل التزام، تحتوي على المبلغ، تاريخ التجديد، ورابط مباشر للمراجعة.
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={sendTest.isPending}
              className="rounded-xl gap-2 flex-1"
              data-testid="button-test-email"
            >
              {sendTest.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>إرسال رسالة تجريبية</span>
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="rounded-xl gap-2 flex-1 bg-primary hover:bg-primary/90"
              data-testid="button-save-notifications"
            >
              {updateProfile.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>حفظ</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
