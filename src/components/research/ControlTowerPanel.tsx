"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui/primitives";
import { useAdminToken } from "@/hooks/useAdminToken";

interface Correspondent {
  id: string;
  name: string;
  role: string;
  correspondent_type: string;
  region_code: string;
  regionLabel?: string;
  status: string;
  current_focus: string | null;
  last_run_at: string | null;
  last_error: string | null;
}

interface TowerPayload {
  correspondents?: Correspondent[];
  counts?: {
    active: number;
    paused: number;
    error: number;
    discoveries: number;
    duplicates: number;
    unverified: number;
    runErrors: number;
    needsHuman: number;
    sentToPriceSense: number;
    availableToNewfind: number;
  };
  recentRuns?: Array<{
    id: string;
    status: string;
    started_at: string;
    items_fetched: number;
    discoveries_created: number;
    duplicates_skipped: number;
    used_ai: boolean;
    error_message: string | null;
    current_focus: string | null;
  }>;
  importantSignals?: Array<{
    id: string;
    title: string;
    signal_type: string;
    verification_status: string;
    created_at: string;
  }>;
  integrations?: Array<{
    name: string;
    statusLabel: string;
    detail: string;
    connected: boolean;
  }>;
  ai?: { configured?: boolean; statusLabel?: string };
  error?: string;
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "未実行";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

export function ControlTowerPanel() {
  const { token, setToken, persist, ready } = useAdminToken();
  const [payload, setPayload] = useState<TowerPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const authorizedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
      });
      const json = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : `失敗（${response.status}）`
        );
      }
      persist(token);
      return json;
    },
    [persist, token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const json = (await authorizedFetch(
        "/api/research/control-tower"
      )) as TowerPayload;
      setPayload(json);
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, token]);

  useEffect(() => {
    if (ready && token) void load();
  }, [ready, token, load]);

  async function runDue() {
    setActing("run");
    setNotice("");
    setError("");
    try {
      const json = await authorizedFetch("/api/research/correspondents", {
        method: "POST",
        body: JSON.stringify({ action: "run_due" }),
      });
      setNotice(
        `期限到来の特派員を ${typeof json.ran === "number" ? json.ran : 0} 件実行しました。公開ソースが取れない場合は発見0件のままです。`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "実行に失敗しました");
    } finally {
      setActing(null);
    }
  }

  const counts = payload?.counts;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="世界AI特派員"
        title="AI Control Tower"
        description="稼働中の特派員、発見、未確認情報、PriceSense / NEWFIND への受け渡しを確認します。架空の稼働実績は表示しません。"
      />

      <AdminSessionBar
        token={token}
        onTokenChange={setToken}
        onSubmit={() => void load()}
        loading={loading}
      />

      {error ? (
        <div className="mb-6">
          <ErrorState message={error} />
        </div>
      ) : null}
      {notice ? (
        <p className="mb-6 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          {notice}
        </p>
      ) : null}
      {loading ? (
        <div className="mb-6">
          <LoadingState />
        </div>
      ) : null}

      {counts ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void runDue()} disabled={Boolean(acting)}>
              {acting === "run" ? "探索中…" : "期限到来の特派員を実行"}
            </Button>
            <Link
              href="/app/correspondents"
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              特派員一覧
            </Link>
            <Link
              href="/app/research"
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              Research
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs text-muted">稼働中</p>
              <p className="mt-2 font-display text-3xl">{counts.active}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted">停止中</p>
              <p className="mt-2 font-display text-3xl">{counts.paused}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted">発見件数</p>
              <p className="mt-2 font-display text-3xl">{counts.discoveries}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted">要人間確認</p>
              <p className="mt-2 font-display text-3xl">{counts.needsHuman}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted">未確認情報</p>
              <p className="mt-2 font-display text-3xl">{counts.unverified}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted">重複情報</p>
              <p className="mt-2 font-display text-3xl">{counts.duplicates}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted">エラー</p>
              <p className="mt-2 font-display text-3xl">{counts.runErrors + counts.error}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted">PriceSenseへ送った情報</p>
              <p className="mt-2 font-display text-3xl">{counts.sentToPriceSense}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted">NEWFINDへ送れる情報</p>
              <p className="mt-2 font-display text-3xl">{counts.availableToNewfind}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted">AI</p>
              <p className="mt-2 text-sm">
                {payload.ai?.configured ? payload.ai.statusLabel : "未設定"}
              </p>
            </Card>
          </div>

          <Card>
            <h2 className="font-display text-xl">現在の探索対象</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(payload.correspondents ?? [])
                .filter((item) => item.status === "active")
                .map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{item.regionLabel || item.region_code}</Badge>
                    <span>{item.name}</span>
                    <span className="text-muted">{item.current_focus || item.role}</span>
                    <span className="text-xs text-muted">
                      最終実行 {formatTime(item.last_run_at)}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>

          <Card>
            <h2 className="font-display text-xl">重要Signal</h2>
            {(payload.importantSignals ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                確認済みソースからのSignalはまだありません。
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {(payload.importantSignals ?? []).map((item) => (
                  <li key={item.id}>
                    <span className="font-medium">{item.title}</span>
                    <span className="ml-2 text-xs text-muted">
                      {item.signal_type} / {item.verification_status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-display text-xl">最近の実行</h2>
            {(payload.recentRuns ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted">実行履歴はまだありません。</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {(payload.recentRuns ?? []).map((run) => (
                  <li key={run.id} className="rounded-lg border border-border/70 p-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{run.status}</Badge>
                      {run.used_ai ? <Badge tone="ai">usedAi</Badge> : <Badge>rule/source</Badge>}
                      <span className="text-muted">{formatTime(run.started_at)}</span>
                    </div>
                    <p className="mt-1">
                      取得 {run.items_fetched} / 発見 {run.discoveries_created} / 重複{" "}
                      {run.duplicates_skipped}
                    </p>
                    {run.error_message ? (
                      <p className="mt-1 text-xs text-muted">{run.error_message}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-display text-xl">外部サービス</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(payload.integrations ?? []).map((item) => (
                <li key={item.name} className="flex justify-between gap-3">
                  <span>{item.name}</span>
                  <span className="text-muted">
                    {item.statusLabel} / {item.detail}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : !token && ready ? (
        <EmptyState
          title="管理者セッションがありません"
          description="トークンを入力するとControl Towerを表示できます。"
        />
      ) : null}
    </div>
  );
}
