"use client";

import Link from "next/link";
import { useState } from "react";
import { PricingCheckoutButton } from "@/components/PricingCheckoutButton";
import {
  PRICING_COMPARISON,
  PRICING_FAQ,
  PRICING_PLANS,
  type ComparisonValue,
} from "@/lib/pricing";

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

function DashIcon({ className }: { className?: string }) {
  return (
    <span className={`text-muted/60 ${className ?? ""}`} aria-hidden>
      —
    </span>
  );
}

function ComparisonCell({ value }: { value: ComparisonValue }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-foreground/90">
        <CheckIcon className="h-4 w-4 text-accent" />
        利用可
      </span>
    );
  }

  if (value === false) {
    return <DashIcon />;
  }

  return <span className="text-sm text-muted">{value}</span>;
}

function FaqItem({
  id,
  question,
  answer,
  isOpen,
  onToggle,
}: {
  id: string;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-surface/40 overflow-hidden">
      <button
        type="button"
        id={`faq-${id}`}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${id}`}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface/60"
      >
        <span className="text-sm font-medium text-foreground">{question}</span>
        <svg
          className={`h-5 w-5 shrink-0 text-accent transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>
      {isOpen && (
        <div
          id={`faq-panel-${id}`}
          role="region"
          aria-labelledby={`faq-${id}`}
          className="border-t border-border/60 px-5 py-4"
        >
          <p className="text-sm leading-relaxed text-muted">{answer}</p>
        </div>
      )}
    </div>
  );
}

export function PricingPageContent() {
  const [openFaqId, setOpenFaqId] = useState<string | null>(
    PRICING_FAQ[0]?.id ?? null
  );

  return (
    <>
      <section className="px-6 pb-12 pt-16 sm:pb-16 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-medium tracking-widest text-accent">
            Pricing
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
            料金プラン
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            まずは無料診断で市場との差を把握。
            <br className="hidden sm:block" />
            単価を上げる準備までするなら Premium へ。
          </p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <div className="glass-card rounded-2xl border border-border/80 p-6 sm:p-8">
            <p className="text-xs font-medium text-muted">
              {PRICING_PLANS.free.label}
            </p>
            <p className="mt-2 font-display text-3xl font-semibold text-foreground">
              {PRICING_PLANS.free.priceLabel}
            </p>
            <p className="mt-1 text-sm text-muted">{PRICING_PLANS.free.period}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {PRICING_PLANS.free.description}
            </p>
            <ul className="mt-6 space-y-2">
              {[
                "基本単価診断",
                "市場平均との差",
                "交渉文サンプル（冒頭）",
                "PDF保存",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-foreground/85"
                >
                  <CheckIcon className="h-4 w-4 shrink-0 text-muted" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/#diagnosis"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl border border-border px-5 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:text-accent"
            >
              無料で診断する
            </Link>
          </div>

          <div className="glass-card relative overflow-hidden rounded-2xl border border-accent/35 bg-gradient-to-br from-accent/[0.1] via-surface/60 to-surface/40 p-6 shadow-[0_0_40px_rgba(232,197,71,0.08)] sm:p-8">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-accent">
                  {PRICING_PLANS.premium.label}
                </p>
                <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent">
                  おすすめ
                </span>
              </div>
              <p className="mt-2 font-display text-3xl font-semibold text-accent">
                {PRICING_PLANS.premium.priceLabel}
                <span className="ml-1 text-base font-normal text-muted">
                  {PRICING_PLANS.premium.period}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted/80">税込 · Stripe決済</p>
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">
                {PRICING_PLANS.premium.description}
              </p>
              <ul className="mt-6 space-y-2">
                {[
                  "詳細レポート全文",
                  "単価交渉文・応募文",
                  "職務経歴書・面談対策",
                  "コピー・編集・履歴保存",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-foreground/90"
                  >
                    <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
              <PricingCheckoutButton
                source="pricing_page"
                className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-background transition-all hover:bg-accent/90 hover:shadow-[0_0_32px_rgba(232,197,71,0.2)] disabled:opacity-50"
              >
                Premiumを開始する
              </PricingCheckoutButton>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16" aria-labelledby="comparison-title">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <h2
              id="comparison-title"
              className="font-display text-2xl font-semibold text-foreground sm:text-3xl"
            >
              Free と Premium の比較
            </h2>
            <p className="mt-2 text-sm text-muted">
              診断は無料のまま。交渉準備を加速したい方へ Premium をご用意しています。
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/80">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface/60">
                  <th className="px-5 py-4 text-xs font-medium text-muted">
                    機能
                  </th>
                  <th className="px-5 py-4 text-xs font-medium text-muted">
                    Free
                  </th>
                  <th className="px-5 py-4 text-xs font-medium text-accent">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {PRICING_COMPARISON.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/60 last:border-b-0"
                  >
                    <td className="px-5 py-4 text-sm text-foreground/90">
                      {row.feature}
                    </td>
                    <td className="px-5 py-4">
                      <ComparisonCell value={row.free} />
                    </td>
                    <td className="bg-accent/[0.03] px-5 py-4">
                      <ComparisonCell value={row.premium} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16" aria-labelledby="faq-title">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h2
              id="faq-title"
              className="font-display text-2xl font-semibold text-foreground sm:text-3xl"
            >
              よくある質問
            </h2>
          </div>
          <div className="space-y-3">
            {PRICING_FAQ.map((item) => (
              <FaqItem
                key={item.id}
                id={item.id}
                question={item.question}
                answer={item.answer}
                isOpen={openFaqId === item.id}
                onToggle={() =>
                  setOpenFaqId((current) =>
                    current === item.id ? null : item.id
                  )
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.08] via-surface/60 to-surface/40 px-6 py-10 text-center sm:px-10">
          <div className="gold-line mx-auto mb-6 w-20" />
          <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            まずは無料診断から
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
            30秒で市場との差がわかります。交渉文のサンプルも無料で確認できます。
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/#diagnosis"
              className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-background transition-all hover:bg-accent/90 hover:shadow-[0_0_32px_rgba(232,197,71,0.2)] sm:w-auto"
            >
              無料で単価診断する
            </Link>
            <PricingCheckoutButton
              source="pricing_page_cta"
              className="inline-flex w-full items-center justify-center rounded-xl border border-accent/40 bg-accent/10 px-8 py-3.5 text-sm font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/15 sm:w-auto"
            >
              Premiumを開始する
            </PricingCheckoutButton>
          </div>
          <p className="mt-4 text-xs text-muted/80">
            Premiumは月額¥1,480（税込）· いつでも解約可能
          </p>
        </div>
      </section>
    </>
  );
}
