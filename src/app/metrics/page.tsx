import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { FUNNEL_EVENTS, NORTH_STAR_KPI, REVENUE_KPIS } from "@/lib/revenue/kpis";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "収益KPI",
  description: "PriceSenseの収益指標と計測イベントの定義。",
  path: "/metrics",
  noIndex: true,
});

export default function MetricsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SiteHeader />
      <main id="main-content" className="relative z-10 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium tracking-widest text-accent">
            Internal
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">
            収益KPI
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            最重要指標は「{NORTH_STAR_KPI.label}」です。
            計算式は {NORTH_STAR_KPI.formula}。
            月10万円は事業目標であり、ユーザー向けの保証表現ではありません。
          </p>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">指標</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/60">
                    <th className="px-4 py-3 text-xs font-medium text-muted">KPI</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted">取得元</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted">イベント</th>
                  </tr>
                </thead>
                <tbody>
                  {REVENUE_KPIS.map((kpi) => (
                    <tr key={kpi.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3 text-foreground/90">{kpi.label}</td>
                      <td className="px-4 py-3 text-muted">{kpi.source}</td>
                      <td className="px-4 py-3 font-mono text-xs text-accent">
                        {kpi.event ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">
              追うべきファネル
            </h2>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted">
              {FUNNEL_EVENTS.map((event) => (
                <li key={event} className="font-mono text-xs text-foreground/80">
                  {event}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              診断完了後の次の一手クリックから、A8クリックまたは checkout_started /
              purchase_completed までを同一の category_id / diagnosis_level で接続できます。
              A8成果件数と承認額はA8管理画面の数値を、広告収益は補助媒体の管理画面を合算します。
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
