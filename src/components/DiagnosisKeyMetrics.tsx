"use client";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import {
  calculateMonthlyFromAnnual,
  formatYen,
  type RateComparison,
} from "@/lib/calculator";

interface DiagnosisKeyMetricsProps {
  parsedRate: number;
  marketRate: number;
  comparison: RateComparison;
  annualOpportunity: number;
  isBelowMarket: boolean;
  isAboveMarket: boolean;
  onViewUpgradePotential: () => void;
  onCreateNegotiation: () => void;
}

export function DiagnosisKeyMetrics({
  parsedRate,
  marketRate,
  comparison,
  annualOpportunity,
  isBelowMarket,
  isAboveMarket,
  onViewUpgradePotential,
  onCreateNegotiation,
}: DiagnosisKeyMetricsProps) {
  const absAnnual = Math.abs(annualOpportunity);
  const monthlyEquivalent = calculateMonthlyFromAnnual(annualOpportunity);

  const annualLabel = isBelowMarket
    ? "年間で取り逃している金額（参考値）"
    : isAboveMarket
      ? "年間の超過収益（参考値）"
      : "年間の機会損失（参考値）";

  const monthlyLabel = isBelowMarket
    ? "月あたりの参考差額"
    : isAboveMarket
      ? "月あたりの参考超過分"
      : "月あたりの参考差額";

  return (
    <section
      id="diagnosis-results"
      className="space-y-3"
      aria-label="診断結果サマリー"
    >
      <p className="text-xs font-medium tracking-widest text-accent">
        診断結果
      </p>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface/60 p-4 sm:p-5">
          <p className="text-xs text-muted">1. 現在の単価</p>
          <p className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
            {formatYen(parsedRate)}
            <span className="ml-1 text-sm font-normal text-muted">/ 日</span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface/60 p-4 sm:p-5">
          <p className="text-xs text-muted">2. 市場平均との差</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p
              className={`text-2xl font-bold sm:text-3xl ${
                isBelowMarket
                  ? "text-accent"
                  : isAboveMarket
                    ? "text-emerald-400"
                    : "text-foreground"
              }`}
            >
              {comparison.direction === "at"
                ? "±¥0"
                : `${isBelowMarket ? "−" : "+"}${formatYen(comparison.dailyDiff)}`}
            </p>
            <p className="text-sm text-muted">
              {comparison.gapLabel}（市場平均 {formatYen(marketRate)}）
            </p>
          </div>
        </div>

        <div
          className={`rounded-xl border p-4 sm:p-5 ${
            isBelowMarket
              ? "border-accent/30 bg-accent/5"
              : isAboveMarket
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-border bg-surface/60"
          }`}
        >
          <p className="text-xs text-muted">3. {annualLabel}</p>

          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">年間（220稼働日換算）</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <AnimatedNumber
                  value={absAnnual}
                  className={`text-3xl font-bold sm:text-4xl ${
                    isBelowMarket
                      ? "gold-shimmer"
                      : isAboveMarket
                        ? "text-emerald-400"
                        : "text-foreground"
                  }`}
                  duration={700}
                />
                <span className="text-sm text-muted">/ 年</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted">{monthlyLabel}</p>
              <p
                className={`mt-1 text-2xl font-bold sm:text-3xl ${
                  isBelowMarket
                    ? "text-accent/90"
                    : isAboveMarket
                      ? "text-emerald-400/90"
                      : "text-foreground/80"
                }`}
              >
                {formatYen(monthlyEquivalent)}
                <span className="ml-1 text-sm font-normal text-muted">/ 月</span>
              </p>
              <p className="mt-1 text-xs text-muted/80">
                年間参考値を12で割った目安です
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted/80">
            ※
            市場平均との差を220稼働日で換算した参考値です。実際の収入は案件数・稼働日数により異なります。
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onViewUpgradePotential}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent transition-all hover:border-accent/60 hover:bg-accent/15"
            >
              あなたの単価アップ余地を見る
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onCreateNegotiation}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-background transition-all hover:bg-accent/90"
            >
              交渉シナリオを作成する
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
