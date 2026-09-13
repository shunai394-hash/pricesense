"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnnualRevenueSimulation } from "@/components/AnnualRevenueSimulation";
import { CategorySearch } from "@/components/CategorySearch";
import { DiagnosisActionBar } from "@/components/DiagnosisActionBar";
import { DiagnosisNextActions } from "@/components/DiagnosisNextActions";
import { MoshimoAffiliateBanner } from "@/components/MoshimoAffiliateBanner";
import { DiagnosisKeyMetrics } from "@/components/DiagnosisKeyMetrics";
import { NegotiationModal } from "@/components/NegotiationModal";
import { PdfEmailCaptureModal } from "@/components/PdfEmailCaptureModal";
import { PremiumPreviewCard } from "@/components/PremiumPreviewCard";
import { PremiumPurchaseModal } from "@/components/PremiumPurchaseModal";
import { TrustSection } from "@/components/TrustSection";
import type { JobCategory } from "@/data/types";
import {
  calculateAnnualOpportunity,
  calculateUpgradeImpact,
  formatYen,
  getAnnualRevenueSimulation,
  getComparisonBarWidth,
  getDiagnosis,
  getMarketRangePosition,
  getNegotiationCtaLabel,
  getPdfCompleteInsight,
  getProposedRate,
  getRateComparison,
  JOB_CATEGORIES,
  MARKET_DATA_META,
} from "@/lib/calculator";
import {
  generateNegotiationPack,
  splitNegotiationPreview,
} from "@/lib/negotiation";
import { generateRateUpDocuments, type RateUpTab } from "@/lib/rateUpDocuments";
import { getNextMovePlan } from "@/lib/nextActions";
import {
  exportDiagnosisPdf,
  exportDiagnosisPdfAsBase64,
  type PdfExportData,
} from "@/lib/pdfExport";
import {
  type LeadDiagnosisContext,
} from "@/lib/leads";
import { logLeadPipeline } from "@/lib/leads/debug";
import { consumeResumeNegotiation } from "@/lib/premium/resume";
import {
  persistDiagnosisSession,
  restoreDiagnosisSession,
} from "@/lib/diagnosisSession";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const diagnosisBadgeStyles: Record<string, string> = {
  significantly_low: "border-accent/40 bg-accent/15 text-accent",
  below_market: "border-accent/30 bg-accent/10 text-accent",
  at_market: "border-border bg-surface text-foreground/80",
  above_market: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  premium: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
};

const urgencyStyles: Record<string, string> = {
  high: "border-accent/40 bg-accent/10 text-accent",
  medium: "border-accent/25 bg-accent/5 text-accent/90",
  low: "border-border bg-surface text-muted",
  optional: "border-emerald-500/25 bg-emerald-500/5 text-emerald-400",
};

export function Calculator() {
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();
  const [categoryId, setCategoryId] = useState(JOB_CATEGORIES[0].id);
  const [userRate, setUserRate] = useState("");
  const [targetRate, setTargetRate] = useState(JOB_CATEGORIES[0].marketRate);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rateUpTab, setRateUpTab] = useState<RateUpTab>("negotiation");
  const [isPremiumPurchaseOpen, setIsPremiumPurchaseOpen] = useState(false);
  const [premiumPurchaseSource, setPremiumPurchaseSource] = useState("unknown");
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isPdfEmailModalOpen, setIsPdfEmailModalOpen] = useState(false);
  const [showFullDiagnosis, setShowFullDiagnosis] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const diagnosisStartedRef = useRef(false);
  const diagnosisCompleteKeyRef = useRef("");
  const skipNextProposeRef = useRef(false);

  const markDiagnosisStarted = useCallback(
    (
      trigger: "category_select" | "rate_input",
      nextCategoryId: string = categoryId
    ) => {
      if (diagnosisStartedRef.current) return;
      diagnosisStartedRef.current = true;
      trackEvent(ANALYTICS_EVENTS.diagnosisStart, {
        trigger,
        category_id: nextCategoryId,
      });
    },
    [categoryId]
  );

  const openPdfModal = useCallback((source: string) => {
    setIsPdfExporting(false);
    setIsPdfEmailModalOpen(true);
    try {
      logLeadPipeline("Calculator:openPdfModal", { source });
      trackEvent(ANALYTICS_EVENTS.pdfExportClick, { source });
    } catch {
      // Never block modal open on analytics/logging failures.
    }
  }, []);

  const openNegotiationModal = useCallback((source: string, tab: RateUpTab = "negotiation") => {
    trackEvent(ANALYTICS_EVENTS.negotiationOpen, { source, tab });
    setRateUpTab(tab);
    setIsModalOpen(true);
  }, []);

  const category = useMemo(
    () => JOB_CATEGORIES.find((c) => c.id === categoryId) ?? JOB_CATEGORIES[0],
    [categoryId]
  );

  const parsedRate = parseInt(userRate.replace(/,/g, ""), 10) || 0;
  const marketRate = category.marketRate;
  const annualOpportunity = calculateAnnualOpportunity(parsedRate, marketRate);
  const comparison = getRateComparison(parsedRate, marketRate);
  const isBelowMarket = comparison.direction === "below";
  const isAboveMarket = comparison.direction === "above";
  const diagnosis = getDiagnosis(parsedRate, marketRate, category);
  const defaultProposedRate = getProposedRate(
    parsedRate || marketRate,
    marketRate
  );
  const effectiveTargetRate = Math.max(targetRate, parsedRate + 1000);
  const annualUpgradeImpact = calculateUpgradeImpact(
    parsedRate,
    effectiveTargetRate
  );
  const annualSimulationRows = useMemo(
    () => getAnnualRevenueSimulation(parsedRate, category, effectiveTargetRate),
    [parsedRate, category, effectiveTargetRate]
  );
  const rangePosition = getMarketRangePosition(
    parsedRate || marketRate,
    category.minRate,
    category.top10Rate
  );
  const barWidths = getComparisonBarWidth(
    parsedRate || marketRate,
    marketRate
  );

  useEffect(() => {
    const saved = restoreDiagnosisSession();
    if (saved) {
      skipNextProposeRef.current = true;
      setCategoryId(saved.categoryId);
      setUserRate(saved.userRate);
      if (saved.targetRate > 0) setTargetRate(saved.targetRate);
    }
    setSessionRestored(true);
  }, []);

  useEffect(() => {
    if (!sessionRestored || parsedRate < 1000) return;
    persistDiagnosisSession({
      categoryId,
      userRate,
      targetRate: effectiveTargetRate,
    });
  }, [sessionRestored, categoryId, userRate, effectiveTargetRate, parsedRate]);

  useEffect(() => {
    if (!sessionRestored) return;
    if (skipNextProposeRef.current) {
      skipNextProposeRef.current = false;
      return;
    }
    const proposed = getProposedRate(parsedRate || marketRate, marketRate);
    setTargetRate(proposed);
  }, [categoryId, parsedRate, marketRate, sessionRestored]);

  useEffect(() => {
    if (!diagnosisStartedRef.current || parsedRate < 1000) return;

    const key = `${categoryId}:${parsedRate}`;
    const timer = window.setTimeout(() => {
      if (diagnosisCompleteKeyRef.current === key) return;
      diagnosisCompleteKeyRef.current = key;
      trackEvent(ANALYTICS_EVENTS.diagnosisComplete, {
        category_id: categoryId,
        user_rate: parsedRate,
        diagnosis_level: diagnosis.level,
        market_rate: marketRate,
      });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [parsedRate, categoryId, diagnosis.level, marketRate]);

  useEffect(() => {
    if (!sessionRestored || !isPremium || isPremiumLoading) return;
    if (parsedRate < 1000) return;
    if (!consumeResumeNegotiation()) return;
    openNegotiationModal("checkout_success");
  }, [
    sessionRestored,
    isPremium,
    isPremiumLoading,
    parsedRate,
    openNegotiationModal,
  ]);

  const handleCategorySelect = (newCategory: JobCategory) => {
    markDiagnosisStarted("category_select", newCategory.id);
    setCategoryId(newCategory.id);
    setShowFullDiagnosis(false);
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    markDiagnosisStarted("rate_input");
    const raw = e.target.value.replace(/[^\d]/g, "");
    setUserRate(raw);
  };

  const handleTargetRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetRate(parseInt(e.target.value, 10));
  };

  const formattedRate = parsedRate > 0 ? parsedRate.toLocaleString("ja-JP") : "";

  const openPremiumPurchase = useCallback((source: string) => {
    setPremiumPurchaseSource(source);
    setIsPremiumPurchaseOpen(true);
  }, []);

  const negotiationPack = useMemo(
    () =>
      generateNegotiationPack({
        category,
        userRate: parsedRate || marketRate,
        marketRate,
        targetRate: effectiveTargetRate,
        diagnosisLevel: diagnosis.level,
      }),
    [
      category,
      parsedRate,
      marketRate,
      effectiveTargetRate,
      diagnosis.level,
    ]
  );

  const rateUpDocuments = useMemo(
    () =>
      generateRateUpDocuments({
        category,
        userRate: parsedRate || marketRate,
        marketRate,
        targetRate: effectiveTargetRate,
        diagnosisLevel: diagnosis.level,
      }),
    [
      category,
      parsedRate,
      marketRate,
      effectiveTargetRate,
      diagnosis.level,
    ]
  );

  const nextMovePlan = useMemo(
    () =>
      getNextMovePlan({
        diagnosis,
        category,
        annualOpportunity,
      }),
    [diagnosis, category, annualOpportunity]
  );

  const pdfCompleteInsight = useMemo(
    () =>
      getPdfCompleteInsight(
        parsedRate,
        marketRate,
        effectiveTargetRate,
        category
      ),
    [parsedRate, marketRate, effectiveTargetRate, category]
  );

  const ctaLabel = getNegotiationCtaLabel(diagnosis.negotiationUrgency);

  const handleOpenNegotiationAfterPdf = useCallback(() => {
    setIsPdfEmailModalOpen(false);
    openNegotiationModal("pdf_complete");
  }, [openNegotiationModal]);

  const handleViewPremiumAfterPdf = useCallback(() => {
    setIsPdfEmailModalOpen(false);
    setShowFullDiagnosis(true);
    window.setTimeout(() => {
      document
        .getElementById("premium-preview")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

  const buildPdfExportData = useCallback((): PdfExportData | null => {
    if (parsedRate <= 0) return null;

    const fullBody = negotiationPack.primary.body;
    const negotiationBody = isPremium
      ? fullBody
      : (() => {
          const { preview, isTruncated } = splitNegotiationPreview(fullBody);
          return isTruncated
            ? `${preview}\n\n（以下省略 — PriceSense Premium で全文・3パターン・断り対応文をご利用いただけます）`
            : preview;
        })();

    return {
      category,
      userRate: parsedRate,
      diagnosis,
      annualOpportunity,
      targetRate: effectiveTargetRate,
      annualUpgradeImpact,
      annualSimulationRows,
      negotiationSubject: negotiationPack.primary.subject,
      negotiationBody,
    };
  }, [
    parsedRate,
    isPremium,
    category,
    diagnosis,
    annualOpportunity,
    effectiveTargetRate,
    annualUpgradeImpact,
    annualSimulationRows,
    negotiationPack.primary.subject,
    negotiationPack.primary.body,
  ]);

  const runPdfExport = useCallback(async () => {
    const data = buildPdfExportData();
    if (!data) return;
    await exportDiagnosisPdf(data);
  }, [buildPdfExportData]);

  const getPdfAttachment = useCallback(async () => {
    const data = buildPdfExportData();
    if (!data) return null;
    return exportDiagnosisPdfAsBase64(data);
  }, [buildPdfExportData]);

  useEffect(() => {
    logLeadPipeline("Calculator:mounted", { version: "lead-pipeline-v3" });
  }, []);

  const leadDiagnosisContext = useMemo<LeadDiagnosisContext>(
    () => ({
      categoryId: category.id,
      categoryName: category.label,
      userRate: parsedRate,
      marketRate,
      diagnosisLevel: diagnosis.level,
      targetRate: effectiveTargetRate,
    }),
    [
      category.id,
      category.label,
      parsedRate,
      marketRate,
      diagnosis.level,
      effectiveTargetRate,
    ]
  );

  return (
    <>
      <div className="glass-card relative overflow-visible rounded-2xl p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/3 blur-3xl" />
        </div>

        <div className="relative space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-widest text-accent">
                STEP 1 · 無料診断
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl">
                職種と単価を入力
              </h2>
              <p className="mt-2 text-sm text-muted">
                診断は入口です。結果から、収入を上げる次の一手まで出します。
              </p>
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
            <div className="space-y-2 sm:col-span-2">
              <CategorySearch
                selectedId={categoryId}
                onSelect={handleCategorySelect}
              />
              <p className="text-xs text-muted">{category.description}</p>
            </div>

            <div className="space-y-2 sm:col-span-2">
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
                  aria-describedby="daily-rate-hint"
                  autoComplete="off"
                  className="w-full rounded-xl border border-border bg-surface py-3.5 pl-9 pr-16 text-foreground transition-colors placeholder:text-muted/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-xs text-muted">
                  / 日
                </span>
              </div>
              <p id="daily-rate-hint" className="text-xs text-muted">
                いまの日単価を入力すると、市場との差と次の一手が表示されます。
              </p>
            </div>
          </div>

          <div className="gold-line w-full" />

          <div className="space-y-6">
            {parsedRate > 0 ? (
              <>
                <DiagnosisKeyMetrics
                  parsedRate={parsedRate}
                  marketRate={marketRate}
                  comparison={comparison}
                  annualOpportunity={annualOpportunity}
                  isBelowMarket={isBelowMarket}
                  isAboveMarket={isAboveMarket}
                />

                <DiagnosisNextActions
                  plan={nextMovePlan}
                  categoryId={category.id}
                  diagnosisLevel={diagnosis.level}
                  onRaiseCurrent={() =>
                    openNegotiationModal("next_action_raise_current")
                  }
                />

                <PremiumPreviewCard
                  isPremium={isPremium}
                  onOpenPremiumPurchase={() =>
                    openPremiumPurchase("premium_preview_card")
                  }
                />

                <div>
                  <button
                    type="button"
                    onClick={() => setShowFullDiagnosis((open) => !open)}
                    className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
                    aria-expanded={showFullDiagnosis}
                  >
                    {showFullDiagnosis
                      ? "詳しい市場データを閉じる"
                      : "詳しい市場データを見る"}
                  </button>
                </div>

                {showFullDiagnosis && (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${diagnosisBadgeStyles[diagnosis.level]}`}
                      >
                        {diagnosis.label}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs ${urgencyStyles[diagnosis.negotiationUrgency]}`}
                      >
                        {diagnosis.negotiationUrgency === "high"
                          ? "交渉優先度: 高"
                          : diagnosis.negotiationUrgency === "medium"
                            ? "交渉優先度: 中"
                            : diagnosis.negotiationUrgency === "low"
                              ? "交渉優先度: 低"
                              : "交渉: 任意"}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted">
                      {diagnosis.summary}
                    </p>

                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted">
                        市場相場の詳細
                      </p>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { label: "最低", value: category.minRate },
                          { label: "平均", value: category.avgRate, highlight: true },
                          { label: "上位25%", value: category.top25Rate },
                          { label: "上位10%", value: category.top10Rate },
                        ].map((tier) => (
                          <div
                            key={tier.label}
                            className={`rounded-lg border px-3 py-2 text-center ${
                              tier.highlight
                                ? "border-accent/30 bg-accent/5"
                                : "border-border bg-surface/60"
                            }`}
                          >
                            <p className="text-xs text-muted">{tier.label}</p>
                            <p
                              className={`mt-0.5 text-sm font-semibold ${
                                tier.highlight ? "text-accent" : "text-foreground"
                              }`}
                            >
                              {formatYen(tier.value)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-border bg-surface/60 p-4">
                        <p className="text-sm text-muted">市場レンジ（最低〜上位10%）</p>
                        <p className="mt-1 text-xl font-semibold text-foreground">
                          {formatYen(category.minRate)} 〜{" "}
                          {formatYen(category.top10Rate)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {category.marketTrend}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-border/80 bg-surface/40 px-4 py-3">
                        <div>
                          <p className="text-xs text-muted">市場内ポジション</p>
                          <p className="mt-0.5 text-base font-medium text-accent">
                            {diagnosis.positionLabel}
                          </p>
                        </div>
                        <p className="text-xs text-muted">
                          4段階相場データに基づく推定値
                        </p>
                      </div>

                      <TrustSection variant="banner" />

                      <div className="space-y-5 rounded-xl border border-border bg-surface/40 p-4">
                        <div>
                          <div className="mb-2 flex justify-between text-xs text-muted">
                            <span>あなた {formatYen(parsedRate)}</span>
                            <span>市場平均 {formatYen(marketRate)}</span>
                          </div>
                          <div className="relative h-3 overflow-hidden rounded-full bg-border">
                            <div
                              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                                isBelowMarket
                                  ? "bg-gradient-to-r from-accent/60 to-accent"
                                  : isAboveMarket
                                    ? "bg-gradient-to-r from-emerald-500/60 to-emerald-400"
                                    : "bg-gradient-to-r from-foreground/30 to-foreground/50"
                              }`}
                              style={{ width: `${barWidths.userWidth}%` }}
                            />
                            <div
                              className="absolute inset-y-0 w-0.5 bg-foreground/50 transition-all duration-700"
                              style={{
                                left: `${barWidths.marketMarker}%`,
                                transform: "translateX(-50%)",
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 flex justify-between text-xs text-muted">
                            <span>{formatYen(category.minRate)}</span>
                            <span>市場レンジ内の位置</span>
                            <span>{formatYen(category.top10Rate)}</span>
                          </div>
                          <div className="relative h-3 overflow-hidden rounded-full bg-border">
                            <div
                              className="absolute inset-y-0 rounded-full bg-foreground/5"
                              style={{ left: "0%", right: "0%" }}
                            />
                            <div
                              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent/80 transition-all duration-700"
                              style={{ left: `${rangePosition}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      id="upgrade-proposal"
                      className="scroll-mt-24 rounded-xl border border-accent/25 bg-accent/5 p-5"
                    >
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            単価アップ提案
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            交渉目標単価を設定すると、年間増収と交渉文に反映されます
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-accent">
                          {formatYen(effectiveTargetRate)}
                        </p>
                      </div>

                      <input
                        type="range"
                        min={parsedRate + 1000}
                        max={Math.max(
                          category.top10Rate,
                          defaultProposedRate + 10000
                        )}
                        step={1000}
                        value={effectiveTargetRate}
                        onChange={handleTargetRateChange}
                        aria-label="交渉目標単価"
                        aria-valuemin={parsedRate + 1000}
                        aria-valuemax={Math.max(
                          category.top10Rate,
                          defaultProposedRate + 10000
                        )}
                        aria-valuenow={effectiveTargetRate}
                        aria-valuetext={formatYen(effectiveTargetRate)}
                        className="mt-4 w-full accent-accent"
                      />

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                        <span>現在 {formatYen(parsedRate)}</span>
                        <span>
                          改定後の年間増収（推定）:{" "}
                          <span className="font-medium text-emerald-400">
                            +{formatYen(annualUpgradeImpact)}
                          </span>
                        </span>
                        <span>
                          上限{" "}
                          {formatYen(
                            Math.max(
                              category.top10Rate,
                              defaultProposedRate + 10000
                            )
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTargetRate(defaultProposedRate)}
                        className="mt-3 text-xs text-accent hover:text-accent/80"
                      >
                        おすすめ目標（{formatYen(defaultProposedRate)}）に戻す
                      </button>
                    </div>

                    <AnnualRevenueSimulation rows={annualSimulationRows} />

                    <p className="text-xs leading-relaxed text-muted">
                      {MARKET_DATA_META.methodology} {MARKET_DATA_META.workingDaysNote}。
                      {MARKET_DATA_META.disclaimer}
                    </p>

                    <DiagnosisActionBar
                      onRequestPdfByEmail={() => openPdfModal("action_bar")}
                      onOpenNegotiation={() => openNegotiationModal("action_bar")}
                      isPdfExporting={isPdfExporting}
                      isDisabled={false}
                      ctaLabel={ctaLabel}
                    />
                  </>
                )}

                <MoshimoAffiliateBanner />
              </>
            ) : (
              <p className="text-sm text-muted">
                職種を選び、現在の日単価を入力すると診断結果と次の一手が表示されます。
              </p>
            )}
          </div>

          <p className="text-center text-xs text-muted">
            登録不要 · 30秒で完了 · 診断入力はサーバーに保存されません
          </p>
        </div>
      </div>

      <NegotiationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        negotiationPack={negotiationPack}
        rateUpDocuments={rateUpDocuments}
        initialTab={rateUpTab}
        isPremium={isPremium}
        userRate={parsedRate}
        targetRate={effectiveTargetRate}
        annualUpgradeImpact={annualUpgradeImpact}
        onRequestPdfByEmail={() => openPdfModal("negotiation_modal")}
        isPdfExporting={isPdfExporting}
        onOpenPremiumPurchase={openPremiumPurchase}
        onTargetRateChange={setTargetRate}
        targetRateMin={parsedRate > 0 ? parsedRate + 1000 : undefined}
        targetRateMax={
          parsedRate > 0
            ? Math.max(category.top10Rate, defaultProposedRate + 10000)
            : undefined
        }
      />

      <PremiumPurchaseModal
        isOpen={isPremiumPurchaseOpen}
        onClose={() => setIsPremiumPurchaseOpen(false)}
        source={premiumPurchaseSource}
        diagnosisContext={leadDiagnosisContext}
      />

      <PdfEmailCaptureModal
        isOpen={isPdfEmailModalOpen}
        onClose={() => setIsPdfEmailModalOpen(false)}
        leadContext={leadDiagnosisContext}
        exportPdf={runPdfExport}
        getPdfAttachment={getPdfAttachment}
        onExportingChange={setIsPdfExporting}
        onOpenNegotiation={handleOpenNegotiationAfterPdf}
        onViewPremiumReport={handleViewPremiumAfterPdf}
        insight={pdfCompleteInsight}
      />
    </>
  );
}
