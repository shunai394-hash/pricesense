"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

function emptyCounts(): SalesActionCounts {
  return { total: 0, P0: 0, P1: 0, P2: 0, P3: 0 };
}

function emptyActivity(): SalesActivityCounts {
  return {
    pending: 0,
    executedToday: 0,
    stoppedToday: 0,
    wonToday: 0,
    lostToday: 0,
    failedToday: 0,
  };
}

function formatDeadline(value: string | null, now: Date): string {
  if (!value) return "期限なし";
  const due = Date.parse(value);
  if (Number.isNaN(due)) return "期限なし";
  const dueDate = new Date(due);
  const today = now.toISOString().slice(0, 10);
  const dueDay = dueDate.toISOString().slice(0, 10);
  if (due <= now.getTime() && dueDay !== today) return "超過";
  if (dueDay === today) return "今日";
  return dueDay;
}

function leadLabel(action: SalesAction): string {
  return action.categoryName || action.email || action.leadId;
}

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-xl border border-border/80 bg-surface/70 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-foreground">{value}</p>
    </article>
  );
}

export function SalesActionsDashboard() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<SalesAction[]>([]);
  const [counts, setCounts] = useState<SalesActionCounts | null>(null);
  const [activity, setActivity] = useState<SalesActivityCounts | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) setToken(stored);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/sales-actions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = (await response.json()) as SalesActionsResponse;
      if (!response.ok || !json.success) {
        setActions([]);
        setCounts(null);
        setActivity(null);
        setError(json.error || `Request failed (${response.status})`);
        return;
      }
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      setActions(json.actions ?? []);
      setCounts(json.counts ?? emptyCounts());
      setActivity(json.activity ?? emptyActivity());
    } catch (loadError) {
      setActions([]);
      setCounts(null);
      setActivity(null);
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load actions"
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  const now = new Date();
  const displayCounts = counts ?? emptyCounts();
  const displayActivity = activity ?? emptyActivity();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 border-b border-border/60 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Admin</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">
          営業アクションセンター
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          今日やるべき営業を優先度順に確認します。管理者トークン（ADMIN_TOKEN）が必要です。
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
          トークンを入力して、今日の営業一覧を読み込んでください。
        </p>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 font-display text-2xl">今日の件数</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <KpiCard label="今日" value={displayCounts.total} />
              <KpiCard label="P0" value={displayCounts.P0} />
              <KpiCard label="P1" value={displayCounts.P1} />
              <KpiCard label="P2" value={displayCounts.P2} />
              <KpiCard label="P3" value={displayCounts.P3} />
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl">実行状況</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <KpiCard label="未処理Action" value={displayActivity.pending} />
              <KpiCard label="本日実行" value={displayActivity.executedToday} />
              <KpiCard label="停止" value={displayActivity.stoppedToday} />
              <KpiCard label="Won" value={displayActivity.wonToday} />
              <KpiCard label="Lost" value={displayActivity.lostToday} />
              <KpiCard label="本日失敗" value={displayActivity.failedToday} />
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl">営業アクション一覧</h2>
            {actions.length === 0 ? (
              <p className="text-sm text-muted">今日の対象はありません。</p>
            ) : (
              <ul className="space-y-3">
                {actions.map((action) => (
                  <li key={action.leadId}>
                    <article className="rounded-xl border border-border/80 bg-surface/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-accent">
                            {action.priority}
                          </p>
                          <h3 className="mt-1 font-display text-2xl text-foreground">
                            {leadLabel(action)}
                          </h3>
                          {action.email && action.categoryName ? (
                            <p className="mt-1 text-sm text-muted">{action.email}</p>
                          ) : null}
                        </div>
                        <Link
                          href={`/admin/sales/${action.leadId}`}
                          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background"
                        >
                          詳細を見る
                        </Link>
                      </div>
                      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <dt className="text-muted">Score</dt>
                          <dd>{action.score ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Deal</dt>
                          <dd>{action.dealStatus ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Lead</dt>
                          <dd>{action.leadStatus ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">期限</dt>
                          <dd>{formatDeadline(action.nextFollowupAt, now)}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-sm text-foreground">
                        「{action.nextAction}」
                      </p>
                      <p className="mt-1 text-xs text-muted">{action.reason}</p>
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
