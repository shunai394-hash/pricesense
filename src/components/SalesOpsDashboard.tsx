"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SalesActionStatus } from "@/lib/ai/sales-action-history";

const TOKEN_STORAGE_KEY = "pricesense.adminToken";

type OpsTab = "all" | "failed" | "audit";

interface AuditEvent {
  id: string;
  leadId: string;
  actionType: string | null;
  operation: string;
  result: string;
  status: SalesActionStatus;
  executedBy: string;
  executedAt: string;
  completedAt: string | null;
  createdAt: string;
  error: string | null;
  actorKind: "human" | "ai";
  retryOf: string | null;
  attempt: number;
  externalDelivery: string;
  approvalRequired: boolean;
  idempotencyKey: string;
  reason: string | null;
  audit?: {
    judgment: string | null;
    selectedAction: string;
    approvalRequired: boolean;
    actorKind: string;
    executed: boolean;
    status: string;
    result: string;
    error: string | null;
    retried: boolean;
    attempt: number;
    externalDelivery: string;
  };
}

interface AuditResponse {
  success: boolean;
  error?: string;
  events?: AuditEvent[];
  counts?: Record<SalesActionStatus, number>;
  failedToday?: number;
}

interface MutationResponse {
  success: boolean;
  error?: string;
  history?: AuditEvent;
}

const STATUS_LABEL: Record<SalesActionStatus, string> = {
  pending: "pending",
  running: "running",
  succeeded: "succeeded",
  failed: "failed",
  skipped: "skipped",
  cancelled: "cancelled",
};

function emptyCounts(): Record<SalesActionStatus, number> {
  return {
    pending: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
  };
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-border/80 bg-surface/70 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-foreground">{value}</p>
    </article>
  );
}

export function SalesOpsDashboard() {
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<OpsTab>("all");
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [counts, setCounts] = useState<Record<SalesActionStatus, number> | null>(
    null
  );
  const [failedToday, setFailedToday] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) setToken(stored);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tab === "failed") params.set("status", "failed");
      params.set("limit", "200");
      const response = await fetch(`/api/ai/sales-action-audit?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await response.json()) as AuditResponse;
      if (!response.ok || !json.success) {
        setEvents([]);
        setCounts(null);
        setError(json.error || `Request failed (${response.status})`);
        return;
      }
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      setEvents(json.events ?? []);
      setCounts(json.counts ?? emptyCounts());
      setFailedToday(json.failedToday ?? 0);
    } catch (loadError) {
      setEvents([]);
      setCounts(null);
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load audit"
      );
    } finally {
      setLoading(false);
    }
  }, [tab, token]);

  useEffect(() => {
    if (!counts) return;
    void load();
    // Reload the current tab after the first successful fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const mutate = useCallback(
    async (path: string, eventId: string) => {
      setMutating(eventId);
      setError(null);
      try {
        const response = await fetch(path, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ eventId }),
        });
        const json = (await response.json()) as MutationResponse;
        if (!response.ok || !json.success) {
          setError(json.error || `Request failed (${response.status})`);
          return;
        }
        await load();
      } catch (mutateError) {
        setError(
          mutateError instanceof Error
            ? mutateError.message
            : "Failed to update action"
        );
      } finally {
        setMutating(null);
      }
    },
    [load, token]
  );

  const displayCounts = counts ?? emptyCounts();
  const rows = useMemo(() => events, [events]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 border-b border-border/60 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Admin</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">
          営業オペレーション監査
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          AI判断から実行結果、失敗、再実行までを追跡します。外部への自動営業送信は行いません。管理者トークン（ADMIN_TOKEN）が必要です。
        </p>
        <nav className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href="/admin/sales" className="text-accent">
            今日の営業
          </Link>
          <Link href="/admin/revops" className="text-accent">
            RevOps
          </Link>
        </nav>
      </header>

      <form
        className="mb-8 grid gap-3 rounded-xl border border-border/80 bg-surface/60 p-4 md:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Admin token</span>
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
          >
            {loading ? "読み込み中…" : "監査ログを見る"}
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
          トークンを入力して、営業アクションの監査ログを読み込んでください。
        </p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 font-display text-2xl">状態</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="succeeded" value={displayCounts.succeeded} />
              <KpiCard label="failed" value={displayCounts.failed} />
              <KpiCard label="skipped" value={displayCounts.skipped} />
              <KpiCard label="cancelled" value={displayCounts.cancelled} />
              <KpiCard label="pending" value={displayCounts.pending} />
              <KpiCard label="running" value={displayCounts.running} />
              <KpiCard label="本日失敗" value={failedToday} />
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "Sales Actions"],
                ["failed", "Failed Actions"],
                ["audit", "Audit Log"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-lg px-4 py-2 text-sm ${
                  tab === id
                    ? "bg-accent text-background"
                    : "border border-border text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <section>
            <h2 className="mb-4 font-display text-2xl">
              {tab === "failed" ? "失敗したアクション" : "監査ログ"}
            </h2>
            {rows.length === 0 ? (
              <p className="text-sm text-muted">該当する記録はありません。</p>
            ) : (
              <ul className="space-y-3">
                {rows.map((event) => (
                  <li key={event.id}>
                    <article className="rounded-xl border border-border/80 bg-surface/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-accent">
                            {STATUS_LABEL[event.status]} · {event.actorKind}
                          </p>
                          <h3 className="mt-1 font-display text-xl text-foreground">
                            {event.actionType || event.operation}
                          </h3>
                          <p className="mt-1 text-sm text-muted">
                            {event.operation}
                            {event.retryOf ? ` · retry of ${event.retryOf}` : ""}
                            {` · attempt ${event.attempt}`}
                          </p>
                        </div>
                        <Link
                          href={`/admin/sales/${event.leadId}`}
                          className="text-sm text-accent"
                        >
                          Lead workspace
                        </Link>
                      </div>
                      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <dt className="text-muted">Lead</dt>
                          <dd className="break-all">{event.leadId}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">executed_at</dt>
                          <dd>{formatWhen(event.executedAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">created_at</dt>
                          <dd>{formatWhen(event.createdAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">result</dt>
                          <dd>{event.result}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-xs text-muted">
                        AI判断: {event.audit?.judgment || event.reason || "—"}
                        {" · "}
                        承認: {event.approvalRequired ? "必要" : "内部実行のみ"}
                        {" · "}
                        外部送信: {event.externalDelivery}
                        {" · "}
                        実行: {event.audit?.executed ? "済み" : "未完了"}
                      </p>
                      {event.error ? (
                        <p className="mt-2 text-sm text-red-200">
                          失敗理由: {event.error}
                        </p>
                      ) : null}
                      <p className="mt-2 break-all text-xs text-muted">
                        idempotency: {event.idempotencyKey}
                      </p>
                      {(event.status === "failed" ||
                        event.status === "pending" ||
                        event.status === "running") && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {event.status === "failed" ? (
                            <button
                              type="button"
                              disabled={mutating === event.id}
                              onClick={() =>
                                void mutate("/api/ai/sales-action-retry", event.id)
                              }
                              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
                            >
                              {mutating === event.id ? "処理中…" : "再実行"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={mutating === event.id}
                            onClick={() =>
                              void mutate("/api/ai/sales-action-cancel", event.id)
                            }
                            className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40"
                          >
                            キャンセル
                          </button>
                        </div>
                      )}
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
