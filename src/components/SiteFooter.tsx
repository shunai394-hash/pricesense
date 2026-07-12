import Link from "next/link";
import { SubscriptionPortalLink } from "@/components/SubscriptionPortalLink";
import { LEGAL_LINKS } from "@/lib/legal";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-border/50 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
            <Link
              href="/"
              className="font-display text-lg font-semibold text-foreground"
            >
              PriceSense
            </Link>
            <span className="text-sm text-muted">© 2026</span>
            <Link
              href="/pricing"
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              料金
            </Link>
          </div>
          <p className="text-center text-xs text-muted sm:text-right">
            本サービスの相場データは参考値です。個別の案件条件により異なります。
          </p>
        </div>

        <nav
          aria-label="法的情報"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border/40 pt-6 sm:justify-start"
        >
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <SubscriptionPortalLink />
        </nav>
      </div>
    </footer>
  );
}
