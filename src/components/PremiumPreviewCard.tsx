"use client";

import {
  PREMIUM_AVAILABLE_FEATURES,
  PREMIUM_POSITIONING,
  PREMIUM_PRICE_LABEL,
  PREMIUM_UPCOMING_FEATURES,
} from "@/lib/premium/features";
import { PREMIUM_MONTHLY_PRICE } from "@/lib/pricing";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

interface PremiumPreviewCardProps {
  isPremium?: boolean;
  onOpenPremiumPurchase: () => void;
}

export function PremiumPreviewCard({
  isPremium = false,
  onOpenPremiumPurchase,
}: PremiumPreviewCardProps) {
  return (
    <section
      id="premium-preview"
      className="scroll-mt-24 rounded-xl border border-border/80 bg-surface/40 p-5 sm:p-6"
      aria-labelledby="premium-preview-title"
    >
      <p className="text-xs font-medium tracking-widest text-muted">
        月額Premium · {PREMIUM_PRICE_LABEL} / 月
      </p>
      <h3
        id="premium-preview-title"
        className="mt-2 text-base font-semibold text-foreground sm:text-lg"
      >
        {PREMIUM_POSITIONING}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        今すぐの収入改善は、上の「次の一手」から始めてください。月額は、交渉文や応募文を継続して使う人向けです。
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-foreground/80">いま使えること</p>
          <ul className="mt-2 space-y-1.5">
            {PREMIUM_AVAILABLE_FEATURES.map((feature) => (
              <li key={feature} className="text-xs leading-relaxed text-muted">
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-foreground/80">今後追加予定</p>
          <ul className="mt-2 space-y-1.5">
            {PREMIUM_UPCOMING_FEATURES.map((feature) => (
              <li key={feature} className="text-xs leading-relaxed text-muted/80">
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!isPremium ? (
        <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            月額¥{PREMIUM_MONTHLY_PRICE.toLocaleString("ja-JP")}（税込）· いつでも解約可能
          </p>
          <button
            type="button"
            onClick={() => {
              trackEvent(ANALYTICS_EVENTS.premiumPreviewClick, {
                source: "premium_preview_card",
              });
              onOpenPremiumPurchase();
            }}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 px-5 py-2.5 text-sm font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/15"
          >
            月額で使い続ける
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted/80">
          Premium利用中です。単価交渉文・応募文・職務経歴書改善・面談話法を全文利用できます。
        </p>
      )}
    </section>
  );
}
