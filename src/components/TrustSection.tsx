import { JOB_CATEGORY_COUNT } from "@/data/jobCategories";
import { MARKET_DATA_META } from "@/lib/calculator";

const trustItems = [
  {
    id: "methodology",
    label: "相場データの算出方法",
    value: MARKET_DATA_META.methodology,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    ),
  },
  {
    id: "reference",
    label: "参考データについて",
    value: `${MARKET_DATA_META.sourceLabel}。${MARKET_DATA_META.referenceNote}`,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    ),
  },
  {
    id: "updated",
    label: "最終更新",
    value: `${MARKET_DATA_META.updatedAt}（${JOB_CATEGORY_COUNT}職種の相場データを反映）`,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    ),
  },
  {
    id: "criteria",
    label: "PriceSenseの診断基準",
    value: MARKET_DATA_META.diagnosisCriteria,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    ),
  },
] as const;

interface TrustSectionProps {
  variant?: "section" | "compact" | "banner";
}

function TrustIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10">
      <svg
        className="h-4 w-4 text-accent"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        {children}
      </svg>
    </div>
  );
}

export function TrustSection({ variant = "section" }: TrustSectionProps) {
  if (variant === "banner") {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5 text-xs text-muted">
        <span className="font-medium text-accent">診断の根拠</span>
        <span className="hidden sm:inline">·</span>
        <span>{MARKET_DATA_META.workingDaysNote}</span>
        <span className="hidden sm:inline">·</span>
        <span>最終更新 {MARKET_DATA_META.updatedAt}</span>
        <a
          href="#trust"
          className="ml-auto text-accent hover:text-accent/80"
        >
          データの詳細 →
        </a>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <aside
        className="rounded-xl border border-border/80 bg-surface/50 px-4 py-3"
        aria-label="診断データの根拠"
      >
        <p className="text-xs font-medium text-accent">診断の根拠（参考値）</p>
        <dl className="mt-2 space-y-2 text-xs text-muted">
          {trustItems.map((item) => (
            <div key={item.id}>
              <dt className="font-medium text-foreground/70">{item.label}</dt>
              <dd className="mt-0.5 leading-relaxed">{item.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 border-t border-border/60 pt-2 text-xs text-muted/80">
          {MARKET_DATA_META.disclaimer}
        </p>
      </aside>
    );
  }

  return (
    <section
      id="trust"
      className="scroll-mt-24 border-y border-border/50 bg-surface/30 px-6 py-12 sm:py-16"
      aria-labelledby="trust-title"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium tracking-widest text-accent">
            データの信頼性
          </p>
          <h2
            id="trust-title"
            className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl"
          >
            診断結果の数字は、こう算出しています
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            感覚値ではなく、公開データに基づく参考相場との比較です。
            下記の基準をご確認のうえ、ご自身の状況と合わせてご判断ください。
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {trustItems.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-border/80 bg-surface/60 p-5"
            >
              <div className="flex items-start gap-3">
                <TrustIcon>{item.icon}</TrustIcon>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    {item.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {item.value}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-muted/80">
          {MARKET_DATA_META.disclaimer} {MARKET_DATA_META.positionNote}
        </p>
      </div>
    </section>
  );
}
