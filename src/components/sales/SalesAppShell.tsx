"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  IconBell,
  IconCalendar,
  IconClose,
  IconDashboard,
  IconDeals,
  IconFollowups,
  IconGlobe,
  IconLeads,
  IconMenu,
  IconMeetings,
  IconProposals,
  IconRevops,
  IconSales,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconTower,
  IconUser,
} from "@/components/ui/icons";
import { APP_NAME } from "@/lib/sales/workspace-ui";

const NAV = [
  { href: "/app", label: "AI営業部", icon: IconDashboard, group: "営業" },
  { href: "/app/correspondents", label: "AI特派員", icon: IconGlobe, group: "特派員" },
  { href: "/app/control-tower", label: "Control Tower", icon: IconTower, group: "特派員" },
  { href: "/app/research", label: "Research", icon: IconSales, group: "特派員" },
  { href: "/app/knowledge", label: "Knowledge", icon: IconGlobe, group: "特派員" },
  { href: "/app/companies", label: "Companies", icon: IconLeads, group: "営業" },
  { href: "/app/contacts", label: "担当者", icon: IconLeads, group: "営業" },
  { href: "/app/prospects", label: "Prospects", icon: IconLeads, group: "営業" },
  { href: "/app/signals", label: "Intent", icon: IconSales, group: "営業" },
  { href: "/app/inbox", label: "Inbox", icon: IconSales, group: "営業" },
  { href: "/app/meetings", label: "Meetings", icon: IconMeetings, group: "営業" },
  { href: "/app/proposals", label: "Proposals", icon: IconProposals, group: "営業" },
  { href: "/app/quotes", label: "Quotes", icon: IconProposals, group: "営業" },
  { href: "/app/deals", label: "Deals", icon: IconDeals, group: "営業" },
  { href: "/app/followups", label: "Follow-ups", icon: IconFollowups, group: "営業" },
  { href: "/app/outreach", label: "Outreach", icon: IconSales, group: "営業" },
  { href: "/app/leads", label: "Leads", icon: IconLeads, group: "営業" },
  { href: "/app/sequences", label: "Sequences", icon: IconSales, group: "営業" },
  { href: "/app/negotiation", label: "交渉", icon: IconSales, group: "営業" },
  { href: "/app/sales", label: "AI Actions", icon: IconSales, group: "営業" },
  { href: "/app/integrations", label: "連携", icon: IconSettings, group: "基盤" },
  { href: "/app/revops", label: "RevOps", icon: IconRevops, group: "基盤" },
  { href: "/app/settings", label: "設定", icon: IconSettings, group: "基盤" },
] as const;

const NAV_GROUPS = ["特派員", "営業", "基盤"] as const;

const MOBILE_PRIMARY = [
  NAV[0],
  NAV[1],
  NAV[2],
  NAV[9],
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SalesAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/app";
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    const href = trimmed
      ? `/app/leads?q=${encodeURIComponent(trimmed)}`
      : "/app/leads";
    router.push(href);
    setMenuOpen(false);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 lg:flex lg:min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-surface/40 lg:flex lg:flex-col">
          <div className="border-b border-border/60 px-5 py-5">
            <Link href="/app" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                <IconSparkles className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-display text-lg text-foreground">
                  {APP_NAME}
                </span>
                <span className="block text-[11px] text-muted">
                  AI営業部
                </span>
              </span>
            </Link>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="AI営業ワークスペース">
            {NAV_GROUPS.map((group) => (
              <div key={group} className="mb-3">
                <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wide text-muted">
                  {group}
                </p>
                {NAV.filter((item) => item.group === group).map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                        active
                          ? "bg-accent/15 text-accent"
                          : "text-muted hover:bg-surface hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <p className="px-5 pb-5 text-[11px] leading-relaxed text-muted">
            AIは提案まで、送信・金額・成約・引き継ぎは人間が確定します。
          </p>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className="border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-border p-2 text-muted lg:hidden"
                aria-label="メニューを開く"
                onClick={() => setMenuOpen(true)}
              >
                <IconMenu className="h-5 w-5" />
              </button>
              <Link
                href="/app"
                className="font-display text-lg text-foreground lg:hidden"
              >
                {APP_NAME}
              </Link>
              <p className="hidden text-sm text-muted lg:block">AI営業部ワークスペース</p>
              <form
                onSubmit={onSearch}
                className="ml-auto hidden min-w-0 flex-1 items-center gap-2 md:flex lg:max-w-md"
              >
                <label className="relative block w-full">
                  <span className="sr-only">Lead / Emailを検索</span>
                  <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Lead / Emailを検索"
                    className="w-full rounded-lg border border-border bg-surface px-9 py-2 text-sm outline-none focus:border-accent"
                  />
                </label>
              </form>
              <Link
                href="/app/followups"
                className="ml-auto rounded-lg border border-border p-2 text-muted hover:text-foreground md:ml-0"
                aria-label="Follow-ups"
              >
                <IconBell className="h-4 w-4" />
              </Link>
              <Link
                href="/app/meetings"
                className="hidden rounded-lg border border-border p-2 text-muted hover:text-foreground sm:inline-flex"
                aria-label="商談一覧を開く"
              >
                <IconCalendar className="h-4 w-4" />
              </Link>
              <Link
                href="/app/settings"
                className="rounded-lg border border-border p-2 text-muted hover:text-foreground"
                aria-label="設定を開く"
              >
                <IconUser className="h-4 w-4" />
              </Link>
            </div>
            <form onSubmit={onSearch} className="mt-3 md:hidden">
              <label className="relative block">
                <span className="sr-only">Lead / Emailを検索</span>
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Lead / Emailを検索"
                  className="w-full rounded-lg border border-border bg-surface px-9 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            </form>
          </header>
          {children}
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="メニューを閉じる"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-border bg-background p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg">{APP_NAME}</p>
              <button
                type="button"
                className="rounded-lg border border-border p-2 text-muted"
                aria-label="メニューを閉じる"
                onClick={() => setMenuOpen(false)}
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col gap-1" aria-label="AI営業ワークスペース">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                      active ? "bg-accent/15 text-accent" : "text-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur lg:hidden"
        aria-label="モバイル主要メニュー"
      >
        <ul className="grid grid-cols-5">
          {MOBILE_PRIMARY.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] ${
                    active ? "text-accent" : "text-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 text-[10px] text-muted"
              aria-label="メニューを開く"
            >
              <IconMenu className="h-4 w-4" />
              メニュー
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
