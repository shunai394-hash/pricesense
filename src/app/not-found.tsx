import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="noise-overlay fixed inset-0 z-50 opacity-40" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
      </div>

      <SiteHeader />

      <main
        id="main-content"
        className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center px-6 py-24 text-center"
      >
        <p className="text-xs font-medium tracking-widest text-accent">404</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
          ページが見つかりません
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          お探しのページは移動または削除された可能性があります。
          トップページから単価診断をお試しください。
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-background transition-all hover:bg-accent/90"
          >
            トップへ戻る
          </Link>
          <Link
            href="/#diagnosis"
            className="inline-flex items-center justify-center rounded-xl border border-border px-8 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40"
          >
            無料で単価診断
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
