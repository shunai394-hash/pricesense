"use client";

import Link from "next/link";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import type { LeadDiagnosisContext } from "@/lib/leads";

const freeFeatures = [
  "基本単価診断",
  "市場平均との差",
  "年間機会損失",
  "交渉文サンプル（冒頭のみ）",
] as const;

const premiumBenefits = [
  {
    id: "report",
    label: "あなたの経験・職種に合わせた適正単価分析",
  },
  {
    id: "analysis",
    label: "市場で評価される単価レンジと立ち位置を確認",
  },
  {
    id: "template",
    label: "交渉文全文・3パターン・断り対応文（コピー可）",
  },
  {
    id: "pdf",
    label: "面談や案件応募で使える資料として保存",
  },
  {
    id: "talk",
    label: "値上げ理由を伝える会話例を準備",
  },
] as const;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

interface PremiumUpsellCardProps {
  diagnosisContext?: LeadDiagnosisContext;
}

export function PremiumUpsellCard({
  diagnosisContext: _diagnosisContext,
}: PremiumUpsellCardProps) {
  return (
    <section
      id="premium-upsell"
      className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/[0.08] via-surface/60 to-surface/40 p-5 sm:p-6"
      aria-labelledby="premium-upsell-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-accent">
            さらに深く分析する
          </p>
          <h3
            id="premium-upsell-title"
            className="mt-1 text-lg font-semibold text-foreground sm:text-xl"
          >
            無料診断の次は、Premiumレポート
          </h3>
          <p className="mt-2 text-sm text-muted">
            基本診断で全体像を把握したうえで、交渉に使える詳細資料が必要な方へ。
          </p>
        </div>
        <span className="inline-flex rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
          Premium
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-surface/50 p-4">
          <p className="text-xs font-medium text-muted">無料版（現在）</p>
          <ul className="mt-3 space-y-2">
            {freeFeatures.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2 text-sm text-foreground/80"
              >
                <CheckIcon className="h-4 w-4 shrink-0 text-muted" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-accent/35 bg-accent/5 p-4">
          <p className="text-xs font-medium text-accent">Premium</p>
          <ul className="mt-3 space-y-2">
            {premiumBenefits.map((benefit) => (
              <li
                key={benefit.id}
                className="flex items-center gap-2 text-sm text-foreground/90"
              >
                <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
                {benefit.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          月額1,480円（税込）· いつでも解約可能
        </p>
        <Link
          href="/pricing"
          onClick={() => {
            trackEvent(ANALYTICS_EVENTS.premiumPreviewClick, {
              source: "premium_upsell_card",
            });
          }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-background shadow-[0_0_24px_rgba(232,197,71,0.15)] transition-all hover:bg-accent/90 hover:shadow-[0_0_32px_rgba(232,197,71,0.25)] sm:px-8"
        >
          Premiumプランを見る
        </Link>
      </div>
    </section>
  );
}
