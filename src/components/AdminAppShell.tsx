"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/admin", label: "今日の状況", hint: "Dashboard" },
  { href: "/admin/sales", label: "営業アクション", hint: "Today" },
  { href: "/admin/ops", label: "監査・復旧", hint: "Audit" },
  { href: "/admin/revops", label: "売上分析", hint: "RevOps" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/sales") {
    return pathname === "/admin/sales" || pathname.startsWith("/admin/sales/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 lg:flex lg:min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-surface/40 lg:flex lg:flex-col">
          <div className="border-b border-border/60 px-5 py-5">
            <Link href="/" className="font-display text-lg text-foreground">
              PriceSense
            </Link>
            <p className="mt-1 text-xs text-muted">営業ワークスペース</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="管理メニュー">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2.5 text-sm ${
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-[11px] opacity-70">{item.hint}</span>
                </Link>
              );
            })}
          </nav>
          <p className="px-5 pb-5 text-[11px] leading-relaxed text-muted">
            AIは提案まで。外部への営業連絡は人間が確認してから実行します。自動メール送信はありません。
          </p>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className="border-b border-border/60 px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between">
              <Link href="/admin" className="font-display text-lg text-foreground">
                PriceSense
              </Link>
              <Link href="/" className="text-xs text-accent">
                診断サイトへ
              </Link>
            </div>
          </header>
          {children}
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur lg:hidden"
        aria-label="モバイル管理メニュー"
      >
        <ul className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex min-h-14 flex-col items-center justify-center px-1 text-center text-[11px] leading-tight ${
                    active ? "text-accent" : "text-muted"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
