"use client";

import { useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { NegotiationModal } from "@/components/NegotiationModal";
import {
  calculateAnnualOpportunity,
  formatYen,
  getPercentilePosition,
  JOB_CATEGORIES,
} from "@/lib/calculator";
import { generateNegotiationMessage } from "@/lib/negotiation";

export function Calculator() {
  const [categoryId, setCategoryId] = useState(JOB_CATEGORIES[0].id);
  const [userRate, setUserRate] = useState<string>("60000");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const category = useMemo(
    () => JOB_CATEGORIES.find((c) => c.id === categoryId) ?? JOB_CATEGORIES[0],
    [categoryId]
  );

  const parsedRate = parseInt(userRate.replace(/,/g, ""), 10) || 0;
  const marketRate = category.marketRate;
  const annualOpportunity = calculateAnnualOpportunity(parsedRate, marketRate);
  const isBelowMarket = annualOpportunity > 0;
  const isAboveMarket = annualOpportunity < 0;
  const percentile = getPercentilePosition(parsedRate, marketRate);
  const dailyDiff = marketRate - parsedRate;

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, "");
    setUserRate(raw);
  };

  const formattedRate = parsedRate > 0 ? parsedRate.toLocaleString("ja-JP") : "";

  const negotiationMessage = useMemo(
    () =>
      generateNegotiationMessage({
        category,
        userRate: parsedRate || 60000,
        marketRate,
      }),
    [category, parsedRate, marketRate]
  );

  return (
    <>
    <div className="glass-card relative overflow-hidden rounded-2xl p-6 sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/3 blur-3xl" />

      <div className="relative space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Free Diagnosis
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl">
              単価診断
            </h2>
          </div>
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-accent/20 bg-accent/5">
            <svg
              className="h-5 w-5 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="job-category"
              className="block text-sm font-medium text-muted"
            >
              職種
            </label>
            <div className="relative">
              <select
                id="job-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-border bg-surface px-4 py-3.5 pr-10 text-foreground transition-colors focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
              >
                {JOB_CATEGORIES.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.label} — {job.description}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg
                  className="h-5 w-5 text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="daily-rate"
              className="block text-sm font-medium text-muted"
            >
              あなたの日単価
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted">
                ¥
              </span>
              <input
                id="daily-rate"
                type="text"
                inputMode="numeric"
                value={formattedRate}
                onChange={handleRateChange}
                placeholder="60,000"
                className="w-full rounded-xl border border-border bg-surface py-3.5 pl-9 pr-16 text-foreground transition-colors placeholder:text-muted/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-xs text-muted">
                / 日
              </span>
            </div>
          </div>
        </div>

        <div className="gold-line w-full" />

        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted">市場相場（日単価）</p>
              <p className="mt-1 text-lg font-medium text-foreground/80">
                {formatYen(marketRate)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted">市場内ポジション</p>
              <p className="mt-1 text-lg font-medium text-accent">
                下位 {100 - percentile}%
              </p>
            </div>
          </div>

          <div
            className={`relative overflow-hidden rounded-xl border p-6 sm:p-8 ${
              isBelowMarket
                ? "border-accent/30 bg-accent/5"
                : isAboveMarket
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-surface"
            }`}
          >
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted">
                {isBelowMarket
                  ? "推定 年間機会損失"
                  : isAboveMarket
                    ? "推定 年間超過収益"
                    : "市場相場と一致"}
              </p>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {parsedRate > 0 ? (
                  <>
                    <AnimatedNumber
                      value={Math.abs(annualOpportunity)}
                      className={`text-3xl font-bold sm:text-4xl lg:text-5xl ${
                        isBelowMarket
                          ? "gold-shimmer"
                          : isAboveMarket
                            ? "text-emerald-400"
                            : "text-foreground"
                      }`}
                      duration={700}
                    />
                    <span className="text-sm text-muted">/ 年（220稼働日）</span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-muted/50 sm:text-4xl">
                    ¥—
                  </span>
                )}
              </div>
              {parsedRate > 0 && dailyDiff !== 0 && (
                <p className="text-sm text-muted">
                  1日あたり{" "}
                  <span
                    className={
                      isBelowMarket ? "text-accent" : "text-emerald-400"
                    }
                  >
                    {isBelowMarket ? "−" : "+"}
                    {formatYen(Math.abs(dailyDiff))}
                  </span>
                </p>
              )}
            </div>

            {parsedRate > 0 && (
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs text-muted">
                  <span>あなた</span>
                  <span>市場相場</span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent/60 to-accent transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, (parsedRate / marketRate) * 100)}%`,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 w-0.5 bg-foreground/40 transition-all duration-700"
                    style={{ left: "100%", transform: "translateX(-100%)" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={parsedRate <= 0}
          className="group relative w-full overflow-hidden rounded-xl bg-accent px-6 py-4 text-base font-semibold text-background transition-all hover:bg-accent/90 hover:shadow-[0_0_40px_rgba(232,197,71,0.25)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            値上げ交渉文を見る
            <svg
              className="h-5 w-5 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </button>

        <p className="text-center text-xs text-muted">
          登録不要 · 30秒で完了 · データは保存されません
        </p>
      </div>
    </div>

    <NegotiationModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      message={negotiationMessage}
    />
    </>
  );
}
