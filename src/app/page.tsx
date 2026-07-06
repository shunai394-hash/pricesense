import { Calculator } from "@/components/Calculator";
import { Features } from "@/components/Features";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="noise-overlay fixed inset-0 z-50 opacity-40" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
        <div className="absolute -left-40 top-1/3 h-[400px] w-[400px] rounded-full bg-accent/[0.02] blur-[100px]" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-accent/[0.02] blur-[100px]" />
      </div>

      <header className="relative z-10 border-b border-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent/10">
              <span className="font-display text-lg font-bold text-accent">
                P
              </span>
            </div>
            <span className="font-display text-xl font-semibold tracking-wide text-foreground">
              PriceSense
            </span>
          </div>
          <nav className="hidden items-center gap-8 sm:flex">
            <a
              href="#diagnosis"
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              診断
            </a>
            <a
              href="#features"
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              特徴
            </a>
            <a
              href="#diagnosis"
              className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-all hover:bg-accent/20"
            >
              無料診断
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="px-6 pb-16 pt-16 sm:pb-24 sm:pt-24 lg:pt-32">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-xl">
                <p className="animate-fade-up text-xs font-medium uppercase tracking-[0.25em] text-accent">
                  Market Rate Intelligence
                </p>
                <h1 className="animate-fade-up-delay-1 mt-4 font-display text-4xl font-semibold leading-[1.2] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
                  あなたの単価、
                  <br />
                  <span className="gold-shimmer">年間いくら</span>
                  <br />
                  取り逃していますか？
                </h1>
                <p className="animate-fade-up-delay-2 mt-6 text-base leading-relaxed text-muted sm:text-lg">
                  職種と単価を入力するだけ。
                  <br className="hidden sm:block" />
                  市場との比較を無料診断。
                </p>
                <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-surface-elevated text-xs text-muted"
                        >
                          {["田", "佐", "鈴", "山"][i]}
                        </div>
                      ))}
                    </div>
                    <span className="text-sm text-muted">
                      <span className="font-medium text-foreground">2,400+</span>{" "}
                      人が診断済み
                    </span>
                  </div>
                </div>
              </div>

              <div id="diagnosis" className="animate-fade-up-delay-2 scroll-mt-24">
                <Calculator />
              </div>
            </div>
          </div>
        </section>

        <div id="features" className="scroll-mt-24">
          <Features />
        </div>

        <section className="relative px-6 pb-24 pt-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="gold-line mx-auto mb-10 w-24" />
            <h2 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
              適正単価は、
              <br />
              データで決める時代。
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted">
              感覚ではなく、市場データに基づいた単価設定で、
              あなたのスキルに見合った報酬を実現しましょう。
            </p>
            <a
              href="#diagnosis"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-semibold text-background transition-all hover:bg-accent/90 hover:shadow-[0_0_40px_rgba(232,197,71,0.25)]"
            >
              今すぐ無料診断
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
      </main>

      <footer className="relative z-10 border-t border-border/50 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-semibold text-foreground">
              PriceSense
            </span>
            <span className="text-sm text-muted">© 2026</span>
          </div>
          <p className="text-xs text-muted">
            本サービスの相場データは参考値です。個別の案件条件により異なります。
          </p>
        </div>
      </footer>
    </div>
  );
}
