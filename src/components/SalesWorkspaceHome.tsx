"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatAdminClientError } from "@/lib/admin-ui";
import type { RevopsKpis } from "@/lib/ai/revops";
import type { SalesAction, SalesActionCounts } from "@/lib/ai/sales-actions";
import type { SalesActivityCounts } from "@/lib/ai/sales-action-history";

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
  return action.categoryName || action.email || action.leadId;
}

export function SalesWorkspaceHome() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<SalesAction[]>([]);
  const [counts, setCounts] = useState<SalesActionCounts | null>(null);
  const [activity, setActivity] = useState<SalesActivityCounts | null>(null);
  const [kpis, setKpis] = useState<RevopsKpis | null>(null);
  const [failed, setFailed] = useState<AuditEvent[]>([]);
  const [failedToday, setFailedToday] = useState(0);

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

  const todayActions = actions.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 border-b border-border/60 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          AI営業部
        </p>

        <h1 className="mt-2 font-display text-4xl text-foreground">
          今日の営業状況
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-muted">
          今日やるべき営業アクション、RevOps、監査情報をまとめて確認できます。
          AIは提案を支援し、重要な判断や外部への営業連絡は人が確認します。
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
                href="/admin/sales"
              />

              <KpiCard
                label="P0"
                value={counts.P0}
                href="/admin/sales"
              />

              <KpiCard
                label="HOT Lead"
                value={kpis?.hotLeads ?? "—"}
                href="/admin/revops"
              />

              <KpiCard
                label="本日失敗"
                value={activity?.failedToday ?? failedToday}
                href="/admin/ops"
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl">営業パイプライン</h2>

            {kpis ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Lead" value={kpis.leads} href="/admin/revops" />
                <KpiCard label="WARM" value={kpis.warmLeads} href="/admin/revops" />
                <KpiCard label="商談" value={kpis.meetings} href="/admin/revops" />
                <KpiCard label="提案" value={kpis.proposals} href="/admin/revops" />
                <KpiCard label="Deal" value={kpis.deals} href="/admin/revops" />
                <KpiCard label="Won" value={kpis.won} href="/admin/revops" />
                <KpiCard label="交渉中" value={kpis.negotiating} href="/admin/sales" />
                <KpiCard
                  label="Lead → Won"
                  value={`${kpis.conversionRates.leadToWon}%`}
                  href="/admin/revops"
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
              <h2 className="font-display text-2xl">優先アクション</h2>

              <Link href="/admin/sales" className="text-sm text-accent">
                すべて見る
              </Link>
            </div>

            {todayActions.length === 0 ? (
              <p className="rounded-lg border border-border/80 bg-surface/50 px-4 py-3 text-sm text-muted">
                今日の対象はありません。新しいLeadが登録されると、ここに営業アクションが表示されます。
                失敗した処理は
                {" "}
                <Link href="/admin/ops" className="text-accent">
                  監査・復旧
                </Link>
                から確認できます。
              </p>
            ) : (
              <ul className="space-y-3">
                {todayActions.map((action) => (
                  <li key={action.leadId}>
                    <article className="rounded-xl border border-border/80 bg-surface/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-accent">
                            {action.priority} · {action.actionType}
                          </p>

                          <h3 className="mt-1 font-display text-xl text-foreground">
                            {leadLabel(action)}
                          </h3>

                          <p className="mt-2 text-sm">{action.nextAction}</p>
                        </div>

                        <Link
                          href={`/admin/sales/${action.leadId}`}
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
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl">失敗したアクション</h2>

              <Link href="/admin/ops" className="text-sm text-accent">
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
                        href={`/admin/sales/${event.leadId}`}
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