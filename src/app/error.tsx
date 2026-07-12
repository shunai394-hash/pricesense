"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

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
        role="alert"
      >
        <p className="text-xs font-medium tracking-widest text-accent">Error</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
          エラーが発生しました
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          一時的な問題が発生しました。ページを再読み込みするか、しばらく時間をおいて再度お試しください。
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-background transition-all hover:bg-accent/90"
          >
            再試行
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-border px-8 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40"
          >
            トップへ戻る
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
