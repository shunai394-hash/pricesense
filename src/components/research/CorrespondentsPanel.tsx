"use client";

import { useCallback, useEffect, useState } from "react";
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
  country_code: string | null;
  search_query: string | null;
  cadence_minutes: number;
  sources: unknown;
  status: string;
  current_focus: string | null;
  last_run_at: string | null;
  last_error: string | null;
}

function sourceLabel(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "未設定";
  return value.filter((item) => typeof item === "string").join(", ") || "未設定";
}

export function CorrespondentsPanel() {
  const { token, setToken, persist, ready } = useAdminToken();
  const [items, setItems] = useState<Correspondent[]>([]);
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
      const json = await authorizedFetch("/api/research/correspondents");
      setItems(
        Array.isArray(json.correspondents)
          ? (json.correspondents as Correspondent[])
          : []
      );
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, token]);

  useEffect(() => {
    if (ready && token) void load();
  }, [ready, token, load]);

  async function act(id: string, action: "run" | "pause" | "resume") {
    setActing(`${action}-${id}`);
    setNotice("");
    setError("");
    try {
      const json = await authorizedFetch("/api/research/correspondents", {
        method: "POST",
        body: JSON.stringify(
          action === "run"
            ? { action: "run", id }
            : { action: "set_status", id, status: action === "pause" ? "paused" : "active" }
        ),
      });
      if (action === "run") {
        setNotice(
          `実行結果: ${String(json.status)} / 発見 ${String(json.discoveriesCreated ?? 0)} / usedAi ${String(json.usedAi)}`
        );
      } else {
        setNotice(action === "pause" ? "停止しました。" : "再開しました。");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作に失敗しました");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="世界AI特派員ネットワーク"
        title="AI特派員"
        description="役割別の特派員です。公開情報と接続済みソースだけを探索します。停止中の特派員は実行しません。"
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

      {token ? (
        <div className="space-y-4">
          {items.length === 0 ? (
            <EmptyState
              title="特派員がありません"
              description="migration適用後に標準特派員が登録されます。"
            />
          ) : (
            items.map((item) => (
              <Card key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl">{item.name}</h2>
                    <p className="mt-1 text-sm text-muted">{item.role}</p>
                  </div>
                  <Badge tone={item.status === "active" ? "accent" : "muted"}>
                    {item.status === "active"
                      ? "稼働中"
                      : item.status === "paused"
                        ? "停止中"
                        : item.status}
                  </Badge>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted">対象地域</dt>
                    <dd>
                      {item.region_code}
                      {item.country_code ? ` / ${item.country_code}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">対象情報</dt>
                    <dd>{item.current_focus || item.correspondent_type}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">検索条件</dt>
                    <dd className="break-all">{item.search_query || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">実行頻度</dt>
                    <dd>{item.cadence_minutes} 分</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">情報源</dt>
                    <dd>{sourceLabel(item.sources)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">最終実行</dt>
                    <dd>{item.last_run_at || "未実行"}</dd>
                  </div>
                </dl>
                {item.last_error ? (
                  <p className="mt-3 text-xs text-muted">エラー: {item.last_error}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={Boolean(acting) || item.status === "paused"}
                    onClick={() => void act(item.id, "run")}
                  >
                    {acting === `run-${item.id}` ? "実行中…" : "今すぐ探索"}
                  </Button>
                  {item.status === "paused" ? (
                    <Button
                      variant="secondary"
                      disabled={Boolean(acting)}
                      onClick={() => void act(item.id, "resume")}
                    >
                      再開
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={Boolean(acting)}
                      onClick={() => void act(item.id, "pause")}
                    >
                      停止
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : ready ? (
        <EmptyState
          title="管理者セッションがありません"
          description="トークンを入力すると特派員を管理できます。"
        />
      ) : null}
    </div>
  );
}
