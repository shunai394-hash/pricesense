import { A8AdSection } from "@/components/A8AffiliateBanner";
import { Calculator } from "@/components/Calculator";
import { Features } from "@/components/Features";
import { LeadDebugPanel } from "@/components/LeadDebugPanel";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SoftwareApplicationStructuredData } from "@/components/SoftwareApplicationStructuredData";
import { TrustSection } from "@/components/TrustSection";
import { JOB_CATEGORY_COUNT } from "@/data/jobCategories";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="noise-overlay fixed inset-0 z-50 opacity-40" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
        <div className="absolute -left-40 top-1/3 h-[400px] w-[400px] rounded-full bg-accent/[0.02] blur-[100px]" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-accent/[0.02] blur-[100px]" />
      </div>

      <SiteHeader active="home" />

      <main id="main-content" className="relative z-10">
        <section className="px-6 pb-16 pt-16 sm:pb-24 sm:pt-20 lg:pt-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-xl lg:sticky lg:top-24 lg:self-start">
                <p className="animate-fade-up text-xs font-medium tracking-widest text-accent">
                  収入改善の意思決定ツール
                </p>
                <h1 className="animate-fade-up-delay-1 mt-4 font-display text-4xl font-semibold leading-[1.2] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
                  あなたなら、次に
                  <br />
                  何をすれば
                  <br />
                  <span className="gold-shimmer">収入を上げられるか</span>
                </h1>

                <div className="animate-fade-up-delay-2 mt-6 space-y-2 text-sm text-foreground/90 sm:text-base">
                  <p>診断は入口です。</p>
                  <p className="text-muted">
                    市場との差を見たあと、案件・交渉・転職のうち今やるべき一手まで出します。
                  </p>
                </div>

                <ul className="animate-fade-up-delay-2 mt-6 grid gap-2 sm:grid-cols-2">
                  {[
                    "職種と単価を入れるだけ",
                    "市場平均との差がわかる",
                    "今やるべき一手がわかる",
                    "単価交渉文まで作れる",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface/40 px-3 py-2 text-sm text-foreground/90"
                    >
                      <svg
                        className="h-4 w-4 shrink-0 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="animate-fade-up-delay-3 mt-8">
                  <a
                    href="#diagnosis"
                    className="group relative inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent px-8 py-4 text-base font-semibold text-background shadow-[0_0_32px_rgba(232,197,71,0.15)] transition-all hover:bg-accent/90 hover:shadow-[0_0_48px_rgba(232,197,71,0.3)] active:scale-[0.98] sm:w-auto sm:px-10 sm:py-5 sm:text-lg"
                  >
                    無料で単価診断する（30秒）
                    <svg
                      className="h-5 w-5 transition-transform group-hover:translate-y-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 15.75l7.5-7.5 7.5 7.5"
                      />
                    </svg>
                  </a>
                  <p className="mt-3 text-center text-xs text-muted sm:text-left">
                    登録不要 / {JOB_CATEGORY_COUNT}職種対応 / 市場相場と比較
                  </p>
                </div>
              </div>

              <div
                id="diagnosis"
                className="animate-fade-up-delay-2 scroll-mt-24 lg:self-start"
              >
                <Calculator />
              </div>
            </div>
          </div>
        </section>

        <TrustSection variant="section" />

        <div id="features" className="scroll-mt-24">
          <Features />
        </div>

        <section className="relative px-6 pb-16 pt-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="gold-line mx-auto mb-10 w-24" />
            <h2 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
              収入を上げるなら、
              <br />
              次の一手から始める。
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted">
              相場を知るだけで終わらせない。診断結果から、今のあなたに合う行動までつなげます。
            </p>
            <a
              href="#diagnosis"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-semibold text-background transition-all hover:bg-accent/90 hover:shadow-[0_0_40px_rgba(232,197,71,0.25)]"
            >
              無料で単価診断する（30秒）
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 15.75l7.5-7.5 7.5 7.5"
                />
              </svg>
            </a>
          </div>
        </section>

        <A8AdSection />
      </main>

      <SiteFooter />

      <LeadDebugPanel />
      <SoftwareApplicationStructuredData />
    </div>
  );
}
