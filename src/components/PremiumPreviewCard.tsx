"use client";

import type { JobCategory } from "@/data/types";
import {
  formatYen,
  type DiagnosisLevel,
  type RateComparison,
} from "@/lib/calculator";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { getPremiumRateIncreaseAnalysis } from "@/lib/premiumInsight";
import { getPremiumExperiencePositionAnalysis } from "@/lib/premiumPosition";
import { getPremiumJobImprovementAnalysis } from "@/lib/premiumImprovement";

interface PremiumPreviewCardProps {
  category: JobCategory;
  userRate: number;
  marketRate: number;
  comparison: RateComparison;
  annualOpportunity: number;
  positionLabel: string;
  targetRate: number;
  diagnosisLevel: DiagnosisLevel;
  isPremium?: boolean;
  onOpenPremiumPurchase: () => void;
}

function CheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-accent"
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

function LockIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-accent/70"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function PreviewBlock({
  label,
  visibleText,
  hiddenText,
}: {
  label: string;
  visibleText: string;
  hiddenText: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface/40 p-3">
      <div className="flex items-center gap-2">
        <LockIcon />
        <p className="text-xs font-medium text-foreground/80">{label}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {visibleText}
        <span className="select-none blur-[3px]">{hiddenText}</span>
      </p>
      <p className="mt-1.5 text-[10px] text-muted/70">プレミアムで全文表示</p>
    </div>
  );
}

export function PremiumPreviewCard({
  category,
  userRate,
  marketRate,
  comparison,
  annualOpportunity,
  positionLabel,
  targetRate,
  diagnosisLevel,
  isPremium = false,
  onOpenPremiumPurchase,
}: PremiumPreviewCardProps) {
  const rateIncreaseAnalysis = getPremiumRateIncreaseAnalysis({
    category,
    userRate,
    marketRate,
    comparison,
    diagnosisLevel,
    targetRate,
  });

  const experiencePositionAnalysis = getPremiumExperiencePositionAnalysis({
    category,
    userRate,
    marketRate,
    comparison,
    diagnosisLevel,
    positionLabel,
  });

  const jobImprovementAnalysis = getPremiumJobImprovementAnalysis({
    category,
  });

  const annualLabel =
    annualOpportunity > 0
      ? `年間 ${formatYen(annualOpportunity)} の機会損失（参考値）`
      : annualOpportunity < 0
        ? `年間 ${formatYen(Math.abs(annualOpportunity))} の超過収益（参考値）`
        : "市場平均と一致（参考値）";

  const gapDisplay =
    comparison.direction === "at"
      ? "±¥0 / 日（市場平均と同水準）"
      : `${comparison.direction === "below" ? "−" : "+"}${formatYen(comparison.dailyDiff)} / 日 · ${comparison.gapLabel}`;

  return (
    <section
      id="premium-preview"
      className="scroll-mt-24 rounded-xl border border-accent/25 bg-gradient-to-br from-surface/80 via-surface/60 to-accent/[0.06] p-5 sm:p-6"
      aria-labelledby="premium-preview-title"
    >
      <p className="text-xs font-medium tracking-widest text-accent">
        レポートプレビュー
      </p>
      <h3
        id="premium-preview-title"
        className="mt-1 text-lg font-semibold text-foreground sm:text-xl"
      >
        あなた専用の単価改善レポート
      </h3>
      <p className="mt-2 text-sm text-muted">
        {category.label}の診断結果をもとに、今の仕事で単価を上げるための文面を作れます。
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-surface/50 p-4">
          <p className="text-xs font-medium text-muted">無料診断で分かること</p>
          <ul className="mt-3 space-y-3">
            <li>
              <div className="flex items-center gap-2">
                <CheckIcon />
                <p className="text-xs font-medium text-foreground/90">
                  市場平均との差
                </p>
              </div>
              <p className="mt-1 pl-5 text-sm font-semibold text-foreground">
                {gapDisplay}
              </p>
              <p className="mt-0.5 pl-5 text-xs text-muted">
                現在 {formatYen(userRate)} / 市場平均 {formatYen(marketRate)}
              </p>
            </li>
            <li>
              <div className="flex items-center gap-2">
                <CheckIcon />
                <p className="text-xs font-medium text-foreground/90">
                  年間インパクト
                </p>
              </div>
              <p className="mt-1 pl-5 text-sm font-semibold text-foreground">
                {annualLabel}
              </p>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="text-xs font-medium text-accent">
            プレミアムで分かること
          </p>
          <div className="mt-3 space-y-2">
            <PreviewBlock
              label="経験年数別ポジション"
              visibleText={experiencePositionAnalysis.previewText}
              hiddenText={experiencePositionAnalysis.blurredText}
            />
            <PreviewBlock
              label="単価アップ理由分析"
              visibleText={rateIncreaseAnalysis.previewText}
              hiddenText={rateIncreaseAnalysis.blurredText}
            />
            <PreviewBlock
              label="職種別改善ポイント"
              visibleText={jobImprovementAnalysis.previewText}
              hiddenText={jobImprovementAnalysis.blurredText}
            />
            <PreviewBlock
              label="単価交渉文・応募文・面談対策"
              visibleText={`目標単価 ${formatYen(targetRate)} への`}
              hiddenText="交渉文・案件応募文・職務経歴書の改善点・面談での伝え方"
            />
          </div>
        </div>
      </div>

      {!isPremium ? (
        <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            月額1,480円（税込）· いつでも解約可能
          </p>
          <button
            type="button"
            onClick={() => {
              trackEvent(ANALYTICS_EVENTS.premiumPreviewClick, {
                source: "premium_preview_card",
              });
              onOpenPremiumPurchase();
            }}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-accent/90 sm:px-8"
          >
            Premiumで文面を利用する
          </button>
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-muted/80">
          Premium利用中です。交渉文・応募文・職務経歴書・面談対策を全文利用できます。
        </p>
      )}
    </section>
  );
}
