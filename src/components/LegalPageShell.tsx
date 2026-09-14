import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LEGAL_CONFIG } from "@/lib/legal";

interface LegalPageShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function LegalPageShell({
  title,
  description,
  children,
}: LegalPageShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="noise-overlay fixed inset-0 z-50 opacity-40" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
        <div className="absolute -left-40 top-1/3 h-[400px] w-[400px] rounded-full bg-accent/[0.02] blur-[100px]" />
      </div>

      <SiteHeader />

      <main id="main-content" className="relative z-10 px-6 py-16 sm:py-24">
        <article className="mx-auto max-w-3xl">
          <p className="text-xs font-medium tracking-widest text-accent">
            Legal
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
              {description}
            </p>
          )}
          <p className="mt-3 text-xs text-muted/80">
            最終更新日: {LEGAL_CONFIG.lastUpdated}
          </p>

          <div className="mt-10 space-y-10">{children}</div>

          <div className="mt-12 rounded-xl border border-border/80 bg-surface/40 px-5 py-4">
            <p className="text-xs font-medium text-muted">関連ページ</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link
                href="/privacy"
                className="text-accent transition-colors hover:text-accent/80"
              >
                プライバシーポリシー
              </Link>
              <Link
                href="/terms"
                className="text-accent transition-colors hover:text-accent/80"
              >
                利用規約
              </Link>
              <Link
                href="/legal"
                className="text-accent transition-colors hover:text-accent/80"
              >
                特定商取引法に基づく表記
              </Link>
              <Link
                href="/ai-policy"
                className="text-accent transition-colors hover:text-accent/80"
              >
                AI利用ポリシー
              </Link>
              <Link
                href="/security"
                className="text-accent transition-colors hover:text-accent/80"
              >
                セキュリティ
              </Link>
              <Link
                href="/acceptable-use"
                className="text-accent transition-colors hover:text-accent/80"
              >
                利用禁止事項
              </Link>
              <Link
                href="/contact"
                className="text-accent transition-colors hover:text-accent/80"
              >
                お問い合わせ
              </Link>
            </div>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}

interface LegalSectionProps {
  title: string;
  children: React.ReactNode;
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section>
      <h2 className="border-b border-accent/20 pb-2 font-display text-xl font-semibold text-foreground">
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted [&_li]:ml-5 [&_li]:list-disc [&_ol]:space-y-2 [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}
