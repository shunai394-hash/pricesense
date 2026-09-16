"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui/primitives";
import { useAdminToken } from "@/hooks/useAdminToken";

interface IntegrationItem {
  id: string;
  name: string;
  role: string;
  connected: boolean;
  statusLabel: string;
  detail: string;
}

interface StatusPayload {
  ai?: { configured?: boolean; statusLabel?: string; model?: string | null };
  integrations?: IntegrationItem[];
  notice?: string;
  error?: string;
}

export function IntegrationsPanel() {
  const { token, setToken, persist, ready } = useAdminToken();
  const [payload, setPayload] = useState<StatusPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sales/integrations", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await response.json()) as StatusPayload;
      if (!response.ok) {
        setPayload(null);
        setError(json.error || `読み込みに失敗しました（${response.status}）`);
        return;
      }
      persist(token);
      setPayload(json);
    } catch {
      setPayload(null);
      setError("接続状態を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [persist, token]);

  useEffect(() => {
    if (ready && token) void load();
  }, [ready, token, load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="AI営業部"
        title="外部サービス連携"
        description="Apollo / Clay / Instantly / Sales Marker / Sansan の接続状態です。未接続のサービスに架空データは表示しません。"
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
      {loading ? (
        <div className="mb-6">
          <LoadingState />
        </div>
      ) : null}

      {payload ? (
        <div className="space-y-4">
          <Card>
            <h2 className="font-display text-xl">AI</h2>
            <p className="mt-2 text-sm text-muted">
              {payload.ai?.configured
                ? `設定済み${payload.ai.model ? `（${payload.ai.model}）` : ""}`
                : "未設定。AI提案はフォールバックのみで、架空の成功結果は出しません。"}
            </p>
          </Card>

          {(payload.integrations ?? []).map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl">{item.name}</h2>
                  <p className="mt-1 text-sm text-muted">{item.role}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    item.connected
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-border text-muted"
                  }`}
                >
                  {item.statusLabel}
                </span>
              </div>
              <p className="mt-3 text-sm">{item.detail}</p>
            </Card>
          ))}

          <p className="text-sm text-muted">{payload.notice}</p>
        </div>
      ) : !token && ready ? (
        <EmptyState
          title="管理者セッションがありません"
          description="トークンを入力すると接続状態を確認できます。"
        />
      ) : null}
    </div>
  );
}
