import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import {
  useGetUserProfile,
  useGetBalanceSummary,
  useGetDashboardSummary,
  useListSubscriptions,
  useListCommitments,
} from "@workspace/api-client-react";
import { ChevronDown, HelpCircle, MessageCircle, Minimize2, Sparkles, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeNabihaTips, computeUpcomingAlerts, hasPriorityAlert, markAlertsSeen, useNabihaTipsEnabled, type NabihaTip } from "@/lib/nabihaTips";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import characterImage from "@assets/Gemini_Generated_Image_fn3x3wfn3x3wfn3x_1777626060347.png";

const MINIMIZED_KEY = "nabiha:bubbleMinimized";

function readMinimizedState(): boolean {
  try {
    return sessionStorage.getItem(MINIMIZED_KEY) === "true";
  } catch {
    return false;
  }
}

function saveMinimizedState(val: boolean): void {
  try {
    sessionStorage.setItem(MINIMIZED_KEY, val ? "true" : "false");
  } catch {
    /* ignore */
  }
}

function TipBubbleRow({ tip }: { tip: NabihaTip }) {
  const iconColor =
    tip.severity === "danger"
      ? "text-red-500"
      : tip.severity === "warning"
        ? "text-amber-500"
        : "text-primary";

  return (
    <div className="flex items-start gap-2 py-2 border-b border-border/40 last:border-0">
      {tip.severity === "info" ? (
        <Sparkles className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", iconColor)} />
      ) : (
        <AlertTriangle className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", iconColor)} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-foreground leading-snug">{tip.headline}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{tip.body}</div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5" aria-label="لماذا؟">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[220px] text-right text-xs" dir="rtl">
          {tip.why}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

interface NabihaBubbleProps {
  onOpenFullChat?: () => void;
}

export function NabihaBubble({ onOpenFullChat }: NabihaBubbleProps) {
  const { user } = useUser();
  const { data: profile } = useGetUserProfile();
  const { data: balance } = useGetBalanceSummary();
  const { data: summary } = useGetDashboardSummary({ month: new Date().toISOString().slice(0, 7) });
  const { data: subscriptions = [] } = useListSubscriptions();
  const { data: commitments = [] } = useListCommitments();

  const [minimized, setMinimized] = useState<boolean>(() => readMinimizedState());
  const [open, setOpen] = useState(false);
  const [tipsEnabled] = useNabihaTipsEnabled();

  useEffect(() => {
    function handler() {
      setMinimized(false);
      setOpen(true);
    }
    window.addEventListener("nabiha:open-bubble", handler);
    return () => window.removeEventListener("nabiha:open-bubble", handler);
  }, []);

  if (!tipsEnabled) return null;

  const displayName =
    profile?.userName ||
    user?.firstName ||
    user?.fullName?.split(" ")[0] ||
    "";

  const currency = profile?.currency ?? "JOD";
  const now = new Date();

  const alerts = computeUpcomingAlerts(subscriptions, commitments, currency, now);
  const tips = computeNabihaTips(profile, balance, summary, subscriptions, commitments, displayName, now);
  const hasUrgent = hasPriorityAlert(alerts, tips);

  const visibleTips = tips.slice(0, 3);

  function handleMinimize() {
    setOpen(false);
    setMinimized(true);
    saveMinimizedState(true);
  }

  function handleOpenPopover() {
    setMinimized(false);
    saveMinimizedState(false);
    setOpen(true);
    const urgentIds = [
      ...alerts.filter((a) => a.severity === "amber" || a.severity === "red").map((a) => a.id),
      ...tips.filter((t) => t.severity === "warning" || t.severity === "danger").map((t) => t.id),
    ];
    if (urgentIds.length > 0) markAlertsSeen(urgentIds);
  }

  function handleBubbleClick() {
    if (minimized) {
      handleOpenPopover();
    } else if (open) {
      setOpen(false);
    } else {
      handleOpenPopover();
    }
  }

  return (
    <div
      className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-2"
      dir="rtl"
      style={{ alignItems: "flex-start" }}
    >
      {/* Popover */}
      {open && !minimized && (
        <div className="mb-2 w-72 bg-card border border-border/60 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
          {/* Header */}
          <div className="bg-gradient-to-l from-primary/10 to-primary/5 px-4 py-3 flex items-center gap-2.5 border-b border-primary/10">
            <img
              src={characterImage}
              alt="نَبِيهَة"
              className="w-9 h-9 rounded-full object-cover border-2 border-card shadow-sm shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-extrabold text-primary">نَبِيهَة</div>
              {displayName ? (
                <div className="text-xs text-muted-foreground">أهلاً {displayName}! إليك أحدث توصياتي:</div>
              ) : (
                <div className="text-xs text-muted-foreground">رفيقتك المالية الذكية</div>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tips */}
          <div className="px-4 py-3">
            {visibleTips.map((tip) => (
              <TipBubbleRow key={tip.id} tip={tip} />
            ))}
          </div>

          {/* Footer */}
          {onOpenFullChat && (
            <div className="px-4 pb-3">
              <button
                onClick={() => { setOpen(false); onOpenFullChat(); }}
                className="w-full text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1 py-1.5 rounded-xl border border-primary/20 hover:bg-primary/5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                افتحي المحادثة
              </button>
            </div>
          )}

          {/* Minimize button */}
          <div className={onOpenFullChat ? "px-4 pb-3 -mt-1" : "px-4 pb-3"}>
            <button
              data-testid="button-nabiha-minimize"
              onClick={handleMinimize}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 py-1 rounded-xl hover:bg-muted/40"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              تصغير
            </button>
          </div>
        </div>
      )}

      {/* Bubble button */}
      <button
        data-testid="button-nabiha-bubble"
        onClick={handleBubbleClick}
        className={cn(
          "relative flex items-center justify-center rounded-full shadow-xl border-2 border-card transition-transform hover:scale-105 active:scale-95",
          minimized ? "w-12 h-12" : "w-14 h-14",
        )}
        aria-label="نَبِيهَة — مساعدتك المالية"
      >
        <img
          src={characterImage}
          alt="نَبِيهَة"
          className="w-full h-full rounded-full object-cover"
        />
        {/* Urgency dot for unread warnings */}
        {hasUrgent && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-card animate-pulse" />
        )}
        {/* Minimized indicator */}
        {minimized && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm border border-card">
            <Minimize2 className="w-2.5 h-2.5" />
          </span>
        )}
      </button>
    </div>
  );
}
