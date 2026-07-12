"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { LeadDiagnosisContext } from "@/lib/leads";
import { startPremiumCheckout } from "@/lib/premium/checkout";

import {
  formatYen,
  getRateComparison,
  type DiagnosisLevel,
} from "@/lib/calculator";
import { PREMIUM_MONTHLY_PRICE } from "@/lib/pricing";

const DIAGNOSIS_LEVEL_LABELS: Record<DiagnosisLevel, string> = {
  significantly_low: "大幅に低位",
  below_market: "やや低位",
  at_market: "市場水準",
  above_market: "やや上位",
  premium: "上位水準",
};

const NEGOTIATION_PATTERNS = [
  "柔らかい依頼型",
  "標準交渉型",
  "提供価値説明型",
] as const;

interface PremiumPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  source?: string;
  diagnosisContext?: LeadDiagnosisContext;
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-accent"
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

function buildPersonalizedMessage(context?: LeadDiagnosisContext): string {
  const userRate = context?.userRate ?? 0;
  const targetRate = context?.targetRate ?? 0;

  if (userRate > 0 && targetRate > userRate) {
    return `あなたの場合、現在単価との差 ${formatYen(targetRate - userRate)} を埋めるための交渉文を作成できます。`;
  }

  if (context?.categoryName && userRate > 0) {
    return `あなたの場合（${context.categoryName}）、診断結果を反映した交渉文を作成できます。`;
  }

  return "診断結果をもとに、あなた専用の交渉文を作成できます。";
}

function hasDiagnosisContext(context?: LeadDiagnosisContext): boolean {
  return Boolean(
    context?.userRate && context.userRate > 0 && context.marketRate && context.marketRate > 0
  );
}

export function PremiumPurchaseModal({
  isOpen,
  onClose,
  source = "unknown",
  diagnosisContext,
}: PremiumPurchaseModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const showContext = hasDiagnosisContext(diagnosisContext);
  const marketComparison = useMemo(
    () =>
      getRateComparison(
        diagnosisContext?.userRate ?? 0,
        diagnosisContext?.marketRate ?? 0
      ),
    [diagnosisContext?.userRate, diagnosisContext?.marketRate]
  );
  const diagnosisLabel = diagnosisContext?.diagnosisLevel
    ? DIAGNOSIS_LEVEL_LABELS[diagnosisContext.diagnosisLevel]
    : null;
  const personalizedMessage = useMemo(
    () => buildPersonalizedMessage(diagnosisContext),
    [diagnosisContext]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsPreparing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const { overflow: bodyOverflow, position, top, width } = document.body.style;
    const htmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.width = width;
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handlePurchaseClick = async () => {
    setIsPreparing(true);

    const result = await startPremiumCheckout(source);

    if (result.url) {
      window.location.href = result.url;
      return;
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[115] flex items-end justify-center overflow-hidden p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-purchase-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="閉じる"
      />

      <div className="relative z-10 flex max-h-[min(90vh,100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-accent/25 bg-surface-elevated shadow-[0_0_60px_rgba(232,197,71,0.1)]">
        <header className="shrink-0 border-b border-border px-6 py-5">
          <p className="text-xs font-medium tracking-widest text-accent">
            PriceSense Premium
          </p>
          <h2
            id="premium-purchase-title"
            className="mt-1 font-display text-xl font-semibold text-foreground sm:text-2xl"
          >
            Premiumプラン
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            診断結果をもとに、単価改善の分析から交渉準備までをサポートします。
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {showContext ? (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <p className="text-xs font-medium text-accent">あなたの診断結果</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted">現在の単価</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {formatYen(diagnosisContext!.userRate!)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">市場平均</p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {formatYen(diagnosisContext!.marketRate!)}
                  </p>
                </div>
                {diagnosisContext?.categoryName && (
                  <div>
                    <p className="text-xs text-muted">職種</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground/90">
                      {diagnosisContext.categoryName}
                    </p>
                  </div>
                )}
                {diagnosisContext?.targetRate && diagnosisContext.targetRate > 0 && (
                  <div>
                    <p className="text-xs text-muted">交渉目標単価</p>
                    <p className="mt-0.5 text-sm font-semibold text-accent">
                      {formatYen(diagnosisContext.targetRate)}
                    </p>
                  </div>
                )}
              </div>
              {diagnosisLabel && (
                <p className="mt-3 text-xs text-muted">
                  市場比較:{" "}
                  <span className="text-foreground/80">
                    {diagnosisLabel}（{marketComparison.gapLabel}）
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border/80 bg-surface/60 px-4 py-3 text-sm text-muted">
              単価診断を完了すると、あなたの診断結果がここに表示されます。
            </div>
          )}

          <div className="mt-4 rounded-xl border border-accent/30 bg-surface/60 px-4 py-3">
            <p className="text-sm leading-relaxed text-foreground/90">
              {personalizedMessage}
            </p>
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium tracking-wide text-accent">
              Premiumで作成できる内容
            </p>
            <ol className="mt-3 space-y-4">
              <li className="rounded-xl border border-border/80 bg-surface/40 px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  1. あなた専用の値上げ交渉文
                </p>
                <ul className="mt-2 space-y-1.5">
                  {[
                    showContext
                      ? `現在単価（${formatYen(diagnosisContext!.userRate!)})`
                      : "現在単価",
                    diagnosisContext?.targetRate && diagnosisContext.targetRate > 0
                      ? `目標単価（${formatYen(diagnosisContext.targetRate)}）`
                      : "目標単価",
                    diagnosisContext?.categoryName
                      ? `職種（${diagnosisContext.categoryName}）`
                      : "職種",
                    diagnosisLabel
                      ? `市場比較結果（${diagnosisLabel}）`
                      : "市場比較結果",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-xs text-muted"
                    >
                      <span className="mt-0.5 shrink-0 text-accent">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted/80">を反映</p>
              </li>

              <li className="rounded-xl border border-border/80 bg-surface/40 px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  2. 3種類の交渉パターン
                </p>
                <ul className="mt-2 space-y-1.5">
                  {NEGOTIATION_PATTERNS.map((pattern) => (
                    <li
                      key={pattern}
                      className="flex items-center gap-2 text-xs text-muted"
                    >
                      <CheckIcon />
                      {pattern}
                    </li>
                  ))}
                </ul>
              </li>

              <li className="rounded-xl border border-border/80 bg-surface/40 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckIcon />
                  3. 断られた場合の返答文
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  一度断られたあとも、関係性を保ちながら再交渉できる返答文を用意します。
                </p>
              </li>
            </ol>
          </div>

          <div className="mt-5 rounded-xl border border-accent/30 bg-accent/5 px-4 py-4 text-center">
            <p className="text-xs text-muted">料金（予定）</p>
            <p className="mt-1 text-3xl font-bold text-accent">
              ¥{PREMIUM_MONTHLY_PRICE.toLocaleString("ja-JP")}
              <span className="ml-1 text-sm font-normal text-muted">/ 月</span>
            </p>
            <p className="mt-1 text-xs text-muted/80">
              正式価格は公開時に告知します
            </p>
          </div>

          {isPreparing ? (
            <div className="mt-5 rounded-xl border border-accent/25 bg-accent/5 px-4 py-4 text-center">
              <p className="text-sm font-medium text-foreground">公開準備中</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                決済機能は現在準備中です。公開時に改めてご案内します。
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePurchaseClick}
              className="mt-5 w-full rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-background transition-all hover:bg-accent/90"
            >
              Premiumを開始する
            </button>
          )}

          <p className="mt-3 text-center text-xs text-muted/80">
            現在は購入・決済できません。公開準備中です。
          </p>
        </div>

        <footer className="shrink-0 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs text-muted transition-colors hover:text-foreground"
          >
            閉じる
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
