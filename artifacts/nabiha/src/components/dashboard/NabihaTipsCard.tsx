import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useGetUserProfile,
  useGetBalanceSummary,
  useGetDashboardSummary,
  useListSubscriptions,
  useListCommitments,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sparkles, AlertTriangle, HelpCircle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeNabihaTips, useNabihaTipsEnabled, type NabihaTip } from "@/lib/nabihaTips";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import characterImage from "@assets/Gemini_Generated_Image_fn3x3wfn3x3wfn3x_1777626060347.png";

function CardTipRow({ tip, onNavigate }: { tip: NabihaTip; onNavigate?: (route: string) => void }) {
  const containerClass =
    tip.severity === "danger"
      ? "border-red-200 bg-red-50/40"
      : tip.severity === "warning"
        ? "border-amber-200 bg-amber-50/40"
        : "border-primary/15 bg-primary/5";

  const iconColor =
    tip.severity === "danger"
      ? "text-red-500"
      : tip.severity === "warning"
        ? "text-amber-500"
        : "text-primary";

  const isClickable = !!tip.navTarget && !!onNavigate;

  const innerContent = (
    <>
      {tip.severity === "info" ? (
        <Sparkles className={cn("w-4 h-4 shrink-0 mt-0.5", iconColor)} />
      ) : (
        <AlertTriangle className={cn("w-4 h-4 shrink-0 mt-0.5", iconColor)} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground leading-snug">{tip.headline}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tip.body}</div>
      </div>
    </>
  );

  return (
    <div className={cn("flex items-start gap-2.5 rounded-2xl border px-3 py-2.5", containerClass)}>
      {isClickable ? (
        <button
          className="flex items-start gap-2.5 flex-1 min-w-0 text-right hover:opacity-80 transition-opacity"
          onClick={() => onNavigate!(tip.navTarget!.route)}
          aria-label={tip.headline}
        >
          {innerContent}
        </button>
      ) : (
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {innerContent}
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
            aria-label="لماذا تظهر هذه النصيحة؟"
            onClick={(e) => e.stopPropagation()}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs text-right text-xs" dir="rtl">
          {tip.why}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function NabihaTipsCard() {
  const [, navigate] = useLocation();
  function onOpenBubble() {
    window.dispatchEvent(new CustomEvent("nabiha:open-bubble"));
  }
  function handleTipNavigate(route: string) {
    navigate(route);
  }
  const { user } = useUser();
  const { data: profile } = useGetUserProfile();
  const { data: balance } = useGetBalanceSummary();
  const { data: summary } = useGetDashboardSummary({ month: new Date().toISOString().slice(0, 7) });
  const { data: subscriptions = [] } = useListSubscriptions();
  const { data: commitments = [] } = useListCommitments();
  const [tipsEnabled] = useNabihaTipsEnabled();

  if (!tipsEnabled) return null;

  const displayName =
    profile?.userName ||
    user?.firstName ||
    user?.fullName?.split(" ")[0] ||
    "";

  const now = new Date();
  const tips = computeNabihaTips(
    profile,
    balance,
    summary,
    subscriptions,
    commitments,
    displayName,
    now,
  );

  const visibleTips = tips.slice(0, 3);

  return (
    <Card
      data-testid="card-nabiha-tips"
      className="rounded-3xl border-none shadow-md bg-card/60 backdrop-blur-sm overflow-hidden"
    >
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center gap-3">
          <img
            src={characterImage}
            alt="نَبِيهَة"
            className="w-11 h-11 rounded-full object-cover border-2 border-card shadow-sm shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-base font-extrabold text-primary flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              نَبِيهَة تنصحك
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              توصيات مالية مبنية على بياناتك الفعلية
            </div>
          </div>
          {onOpenBubble && (
            <button
              onClick={onOpenBubble}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1.5 px-3 rounded-xl border border-primary/20 hover:bg-primary/5 shrink-0"
              aria-label="افتحي المحادثة مع نبيهة"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">افتح المحادثة</span>
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-2">
        {visibleTips.map((tip) => (
          <CardTipRow key={tip.id} tip={tip} onNavigate={handleTipNavigate} />
        ))}
      </CardContent>
    </Card>
  );
}
