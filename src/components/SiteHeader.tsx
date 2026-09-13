import Link from "next/link";

import { LEGAL_LINKS } from "@/lib/legal";

interface SiteHeaderProps {
  active?: "home" | "pricing" | "account";
}

export function SiteHeader({ active = "home" }: SiteHeaderProps) {
  return (
    <header className="relative z-10 border-b border-border/50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent/10">
            <span className="font-display text-lg font-bold text-accent">P</span>
          </div>
          <span className="font-display text-xl font-semibold tracking-wide text-foreground">
            PriceSense
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/pricing"
            className={`text-sm transition-colors lg:hidden ${
              active === "pricing"
                ? "text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            料金
          </Link>
          <Link
            href="/account"
            className={`text-sm transition-colors lg:hidden ${
              active === "account"
                ? "text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            マイページ
          </Link>

          <nav
            className="hidden items-center gap-6 lg:flex"
            aria-label="メインナビゲーション"
          >
            <Link
              href="/#diagnosis"
              className={`text-sm transition-colors ${
                active === "home"
                  ? "text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              診断
            </Link>
            <Link
              href="/#features"
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              特徴
            </Link>
            <Link
              href="/pricing"
              className={`text-sm transition-colors ${
                active === "pricing"
                  ? "text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              料金
            </Link>
            <Link
              href="/account"
              className={`text-sm transition-colors ${
                active === "account"
                  ? "text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              マイページ
            </Link>
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-muted transition-colors hover:text-foreground"
              >
                {link.label === "特定商取引法に基づく表記"
                  ? "特商法表記"
                  : link.label}
              </Link>
            ))}
            <Link
              href="/#diagnosis"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition-all hover:bg-accent/90 hover:shadow-[0_0_24px_rgba(232,197,71,0.2)]"
            >
              無料で単価診断
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
