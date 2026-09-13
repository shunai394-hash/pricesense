"use client";

import { WORKING_DAYS_PER_YEAR, formatYen, type RateComparison } from "@/lib/calculator";

interface DiagnosisKeyMetricsProps {
  parsedRate: number;
  marketRate: number;
  comparison: RateComparison;
  annualOpportunity: number;
  isBelowMarket: boolean;
  isAboveMarket: boolean;
}

export function DiagnosisKeyMetrics({
  parsedRate,
  marketRate,
  comparison,
  annualOpportunity,
  isBelowMarket,
  isAboveMarket,
}: DiagnosisKeyMetricsProps) {
  const absAnnual = Math.abs(annualOpportunity);
  const annualTone = isBelowMarket
    ? "text-accent"
    : isAboveMarket
      ? "text-emerald-400"
      : "text-foreground";

  return (
    <section
      id="diagnosis-results"
      className="space-y-3"
      aria-label="診断結果サマリー"
    >
      <p className="text-xs font-medium tracking-widest text-accent">
        診断結果
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface/60 p-4">
          <p className="text-xs text-muted">あなたの現在の単価</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatYen(parsedRate)}
            <span className="ml-1 text-sm font-normal text-muted">/ 日</span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface/60 p-4">
          <p className="text-xs text-muted">市場の平均</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatYen(marketRate)}
            <span className="ml-1 text-sm font-normal text-muted">/ 日</span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface/60 p-4">
          <p className="text-xs text-muted">あなたの市場との差</p>
          <p className={`mt-1 text-2xl font-bold ${annualTone}`}>
            {comparison.direction === "at"
              ? "±¥0"
              : `${isBelowMarket ? "−" : "+"}${formatYen(comparison.dailyDiff)}`}
            <span className="ml-1 text-sm font-normal text-muted">/ 日</span>
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            isBelowMarket
              ? "border-accent/30 bg-accent/5"
              : isAboveMarket
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-border bg-surface/60"
          }`}
        >
          <p className="text-xs text-muted">年間で見ると</p>
          <p
            className={`mt-1 text-2xl font-bold sm:text-3xl ${
              isBelowMarket ? "gold-shimmer" : annualTone
            }`}
          >
            {absAnnual === 0
              ? "市場平均と同水準"
              : `最大 約¥${Math.round(absAnnual / 10000).toLocaleString("ja-JP")}万円の差`}
          </p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted/80">
        ※ 現在の単価と市場水準との差を{WORKING_DAYS_PER_YEAR}
        稼働日で単純換算した参考値です。実際の収入は案件数・稼働日数により異なります。
      </p>
    </section>
  );
}
