"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatAdminClientError } from "@/lib/admin-ui";
import type { RevopsKpis } from "@/lib/ai/revops";
import type { SalesAction, SalesActionCounts } from "@/lib/ai/sales-actions";
import type { SalesActivityCounts } from "@/lib/ai/sales-action-history";
import {
  AiBadge,
  AiHumanFlow,
  Badge,
  HumanBadge,
} from "@/components/ui/primitives";
import { ACTION_TYPE_LABEL, leadDisplayName } from "@/lib/sales/workspace-ui";

const TOKEN_STORAGE_KEY = "pricesense.adminToken";

interface SalesActionsResponse {
  success: boolean;
  error?: string;
  actions?: SalesAction[];
  counts?: SalesActionCounts;
  activity?: SalesActivityCounts;
}

interface RevopsResponse {
  success: boolean;
  error?: string;
  kpis?: RevopsKpis;
}

interface AuditEvent {
  id: string;
  leadId: string;
  operation: string;
  status: string;
  error: string | null;
  actorKind?: string;
  executedAt: string;
}

interface AuditResponse {
  success: boolean;
  error?: string;
  events?: AuditEvent[];
  counts?: { failed?: number };
  failedToday?: number;
}

function KpiCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href?: string;
}) {
  const inner = (
    <article className="rounded-xl border border-border/80 bg-surface/70 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-foreground">{value}</p>
    </article>
  );

  if (!href) return inner;

  return (
    <Link href={href} className="block transition-opacity hover:opacity-90">
      {inner}
    </Link>
  );
}

function leadLabel(action: SalesAction): string {
  return leadDisplayName({
    categoryName: action.categoryName,
    email: action.email,
    leadId: action.leadId,
  });
}

export function SalesWorkspaceHome() {
  const pathname = usePathname() || "";
  const inApp = pathname === "/" || pathname.startsWith("/app");
  const salesHref = inApp ? "/app/sales" : "/admin/sales";
  const leadHref = (leadId: string) =>
    inApp ? `/app/leads/${leadId}` : `/admin/sales/${leadId}`;
  const revopsHref = inApp ? "/app/revops" : "/admin/revops";
  const opsHref = "/admin/ops";
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<SalesAction[]>([]);
  const [counts, setCounts] = useState<SalesActionCounts | null>(null);
  const [activity, setActivity] = useState<SalesActivityCounts | null>(null);
  const [kpis, setKpis] = useState<RevopsKpis | null>(null);
  const [failed, setFailed] = useState<AuditEvent[]>([]);
  const [failedToday, setFailedToday] = useState(0);
  const autoLoaded = useRef(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) setToken(stored);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [salesRes, revopsRes, auditRes] = await Promise.all([
        fetch("/api/ai/sales-actions", { headers }),
        fetch("/api/ai/revops", { headers }),
        fetch("/api/ai/sales-action-audit?status=failed&limit=8", { headers }),
      ]);

      const salesJson = (await salesRes.json()) as SalesActionsResponse;
      const revopsJson = (await revopsRes.json()) as RevopsResponse;
      const auditJson = (await auditRes.json()) as AuditResponse;

      if (!salesRes.ok || !salesJson.success) {
        setActions([]);
        setCounts(null);
        setActivity(null);
        setKpis(null);
        setFailed([]);
        setError(
          formatAdminClientError(
            salesJson.error ||
              `営業アクションの取得に失敗しました（${salesRes.status}）`,
            salesRes.status
          )
        );
        return;
      }

      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      setActions(salesJson.actions ?? []);
      setCounts(salesJson.counts ?? null);
      setActivity(salesJson.activity ?? null);

      if (revopsRes.ok && revopsJson.success) {
        setKpis(revopsJson.kpis ?? null);
      } else {
        setKpis(null);
      }

      if (auditRes.ok && auditJson.success) {
        setFailed(auditJson.events ?? []);
        setFailedToday(auditJson.failedToday ?? auditJson.counts?.failed ?? 0);
      } else {
        setFailed([]);
        setFailedToday(0);
      }

      if (
        (!revopsRes.ok || !revopsJson.success) &&
        (!auditRes.ok || !auditJson.success)
      ) {
        setError(
          "今日の営業アクションは読み込めましたが、RevOpsまたは監査情報の一部を取得できませんでした。"
        );
      }
    } catch (loadError) {
      setActions([]);
      setCounts(null);
      setActivity(null);
      setKpis(null);
      setFailed([]);

      setError(
        formatAdminClientError(
          loadError instanceof Error
            ? loadError.message
            : "ワークスペースの読み込みに失敗しました"
        )
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || autoLoaded.current) return;
    autoLoaded.current = true;
    void load();
  }, [load, token]);

  const grouped = useMemo(
    () => ({
      P0: actions.filter((action) => action.priority === "P0"),
      P1: actions.filter((action) => action.priority === "P1"),
      P2: actions.filter((action) => action.priority === "P2"),
      P3: actions.filter((action) => action.priority === "P3"),
    }),
    [actions]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 border-b border-border/60 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          AI新規開拓営業OS
        </p>

        <h1 className="mt-2 font-display text-4xl text-foreground">
          今日の新規開拓と営業
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-muted">
          AIの主役は新規顧客開拓です。売りたいものを理解し、今その課題が起きている未接触企業を公開情報から探し、事実と仮説を分けて営業準備します。外部送信は人間承認が必須です。
        </p>
        <div className="mt-4">
          <AiHumanFlow />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          <Link href="/app/offerings" className="text-accent">Offering / ICP</Link>
          {" → "}
          <Link href="/app/discovery" className="text-accent">企業発見</Link>
          {" → "}
          <Link href="/app/research" className="text-accent">Research</Link>
          {" → "}
          <Link href="/app/signals" className="text-accent">Buying Signal / Why Now</Link>
          {" → "}
          <Link href="/app/prospects" className="text-accent">Qualification</Link>
          {" → "}
          <Link href="/app/outreach" className="text-accent">Outreach下書き</Link>
          {" → "}
          <Link href="/app/leads" className="text-accent">Lead</Link>
          {" → "}
          <Link href="/app/inbox" className="text-accent">Inbox</Link>
          {" → "}
          <Link href="/app/meetings" className="text-accent">Meeting</Link>
          {" → "}
          <Link href="/app/proposals" className="text-accent">Proposal / Quote</Link>
          {" → "}
          <Link href="/app/deals" className="text-accent">Deal</Link>
          {" → Learning。"}
        </p>
      </header>

      <form
        className="mb-8 grid gap-3 rounded-xl border border-border/80 bg-surface/60 p-4 md:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block text-muted">管理者トークン</span>

          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading || !token}
            className="min-h-11 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
          >
            {loading ? "読み込み中…" : "今日の営業を見る"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!counts ? (
        <p className="text-sm text-muted">
          管理者トークンを入力すると、HOT Lead・営業アクション・失敗した処理など、今日やるべきことが表示されます。
        </p>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 font-display text-2xl">今日やること</h2>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="未処理アクション"
                value={activity?.pending ?? counts.total}
                href={salesHref}
              />

              <KpiCard
                label="P0"
                value={counts.P0}
                href={salesHref}
              />

              <KpiCard
                label="HOT Lead"
                value={kpis?.hotLeads ?? "—"}
                href={revopsHref}
              />

              <KpiCard
                label="本日失敗"
                value={activity?.failedToday ?? failedToday}
                href={opsHref}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl">営業パイプライン</h2>

            {kpis ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Lead" value={kpis.leads} href={revopsHref} />
                <KpiCard label="WARM" value={kpis.warmLeads} href={revopsHref} />
                <KpiCard label="商談" value={kpis.meetings} href={revopsHref} />
                <KpiCard label="提案" value={kpis.proposals} href={revopsHref} />
                <KpiCard label="Deal" value={kpis.deals} href={revopsHref} />
                <KpiCard label="Won" value={kpis.won} href={revopsHref} />
                <KpiCard label="交渉中" value={kpis.negotiating} href={salesHref} />
                <KpiCard
                  label="Lead → Won"
                  value={`${kpis.conversionRates.leadToWon}%`}
                  href={revopsHref}
                />
              </div>
            ) : (
              <p className="rounded-lg border border-border/80 bg-surface/50 px-4 py-3 text-sm text-muted">
                RevOps情報を読み込めませんでした。RevOps画面から再確認できます。
              </p>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">今日やること</h2>
                <p className="mt-1 text-xs text-muted">
                  AIが優先度を提案し、人間が実行します。
                </p>
              </div>
              <Link href={salesHref} className="text-sm text-accent">
                すべて見る
              </Link>
            </div>

            {actions.length === 0 ? (
              <p className="rounded-lg border border-border/80 bg-surface/50 px-4 py-3 text-sm text-muted">
                今日の対象はありません。新しいLeadが登録されると、ここに営業アクションが表示されます。
                失敗した処理は
                {" "}
                <Link href={opsHref} className="text-accent">
                  監査・復旧
                </Link>
                から確認できます。
              </p>
            ) : (
              <div className="space-y-6">
                {(["P0", "P1", "P2", "P3"] as const).map((priority) => (
                  <div key={priority}>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <Badge tone={priority === "P0" ? "danger" : "accent"}>
                        {priority}
                      </Badge>
                      <span className="text-muted">
                        {grouped[priority].length}件
                      </span>
                    </h3>
                    {grouped[priority].length === 0 ? (
                      <p className="text-sm text-muted">対象なし</p>
                    ) : (
                      <ul className="space-y-3">
                        {grouped[priority].map((action) => (
                          <li key={action.leadId}>
                            <article className="rounded-xl border border-border/80 bg-surface/70 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap gap-2">
                                    <AiBadge />
                                    <HumanBadge />
                                    <Badge tone="muted">
                                      {ACTION_TYPE_LABEL[action.actionType]}
                                    </Badge>
                                  </div>
                                  <h3 className="mt-2 font-display text-xl text-foreground">
                                    {leadLabel(action)}
                                  </h3>
                                  <p className="mt-2 text-sm">{action.nextAction}</p>
                                </div>
                                <Link
                                  href={leadHref(action.leadId)}
                                  className="min-h-11 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background"
                                >
                                  詳細
                                </Link>
                              </div>
                            </article>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl">失敗したアクション</h2>

              <Link href={opsHref} className="text-sm text-accent">
                監査・復旧
              </Link>
            </div>

            {failed.length === 0 ? (
              <p className="rounded-lg border border-border/80 bg-surface/50 px-4 py-3 text-sm text-muted">
                失敗した営業アクションはありません。
              </p>
            ) : (
              <ul className="space-y-3">
                {failed.map((event) => (
                  <li key={event.id}>
                    <article className="rounded-xl border border-border/80 bg-surface/70 p-4">
                      <p className="text-xs text-accent">
                        {event.status} · {event.actorKind || "human"}
                      </p>

                      <p className="mt-1 text-sm">{event.operation}</p>

                      {event.error ? (
                        <p className="mt-1 text-xs text-red-200">
                          {event.error}
                        </p>
                      ) : null}

                      <Link
                        href={leadHref(event.leadId)}
                        className="mt-2 inline-block text-sm text-accent"
                      >
                        Leadを開く
                      </Link>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}