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

interface Discovery {
  id: string;
  title: string;
  fact_text: string;
  interpretation: string | null;
  hypothesis: string | null;
  unknown: string | null;
  verification_status: string;
  region_code: string | null;
  country: string | null;
  pricesense_status: string;
  newfind_status: string;
  needs_human_review: boolean;
  used_ai: boolean;
  created_at: string;
  research_sources?:
    | {
        url: string;
        source_name: string | null;
        published_at: string | null;
        retrieved_at: string;
        source_type: string;
        verification_status: string;
      }
    | Array<{
        url: string;
        source_name: string | null;
        published_at: string | null;
        retrieved_at: string;
        source_type: string;
        verification_status: string;
      }>
    | null;
  research_organizations?: { name: string } | Array<{ name: string }> | null;
  research_correspondents?: { name: string } | Array<{ name: string }> | null;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function DiscoveriesPanel() {
  const { token, setToken, persist, ready } = useAdminToken();
  const [items, setItems] = useState<Discovery[]>([]);
  const [emptyReason, setEmptyReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [url, setUrl] = useState("");

  const authorizedFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const response = await fetch(path, {
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
      const json = await authorizedFetch("/api/research/discoveries");
      setItems(Array.isArray(json.discoveries) ? (json.discoveries as Discovery[]) : []);
      setEmptyReason(typeof json.emptyReason === "string" ? json.emptyReason : "");
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="共通Research基盤"
        title="Discoveries"
        description="Fact と AI仮説を分けて保存します。ソースが取れない情報は未確認として扱います。"
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
          <form
            className="grid gap-3 rounded-xl border border-border/80 bg-surface/50 p-4 md:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                setActing("ingest");
                setNotice("");
                setError("");
                try {
                  const json = await authorizedFetch("/api/research/discoveries", {
                    method: "POST",
                    body: JSON.stringify({ url }),
                  });
                  setUrl("");
                  setNotice(
                    json.duplicate
                      ? "同じソースは既に取り込まれています。"
                      : `取り込みました。usedAi=${String(json.usedAi)}`
                  );
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "取り込みに失敗しました");
                } finally {
                  setActing(null);
                }
              })();
            }}
          >
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="確認する公開URL（https://...）"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={!url || Boolean(acting)}>
              {acting === "ingest" ? "取得中…" : "URLを取り込む"}
            </Button>
          </form>

          {items.length === 0 ? (
            <EmptyState title="発見がありません" description={emptyReason} />
          ) : (
            items.map((item) => {
              const source = one(item.research_sources);
              const org = one(item.research_organizations);
              const reporter = one(item.research_correspondents);
              return (
                <Card key={item.id}>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{item.verification_status}</Badge>
                    {item.used_ai ? <Badge tone="ai">AI解釈あり</Badge> : <Badge>ソース事実</Badge>}
                    {item.needs_human_review ? <Badge tone="accent">要人間確認</Badge> : null}
                    <Badge>{item.region_code || "region unknown"}</Badge>
                  </div>
                  <h2 className="mt-3 font-display text-xl">{item.title}</h2>
                  <p className="mt-2 text-sm">
                    <span className="text-xs text-muted">Fact</span>
                    <br />
                    {item.fact_text}
                  </p>
                  {item.interpretation ? (
                    <p className="mt-2 text-sm text-muted">
                      <span className="text-xs">AI interpretation</span>
                      <br />
                      {item.interpretation}
                    </p>
                  ) : null}
                  {item.hypothesis ? (
                    <p className="mt-2 text-sm text-muted">
                      <span className="text-xs">Hypothesis（事実ではない）</span>
                      <br />
                      {item.hypothesis}
                    </p>
                  ) : null}
                  {item.unknown ? (
                    <p className="mt-2 text-sm text-muted">
                      <span className="text-xs">Unknown</span>
                      <br />
                      {item.unknown}
                    </p>
                  ) : null}
                  <dl className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
                    <div>特派員: {reporter?.name || "—"}</div>
                    <div>組織: {org?.name || "未確認"}</div>
                    <div>Source: {source?.source_name || "—"}</div>
                    <div className="break-all">
                      URL:{" "}
                      {source?.url ? (
                        <a href={source.url} className="text-accent" target="_blank" rel="noreferrer">
                          {source.url}
                        </a>
                      ) : (
                        "未確認"
                      )}
                    </div>
                    <div>published: {source?.published_at || "—"}</div>
                    <div>retrieved: {source?.retrieved_at || "—"}</div>
                    <div>PriceSense: {item.pricesense_status}</div>
                    <div>NEWFIND: {item.newfind_status}</div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={Boolean(acting) || item.pricesense_status === "promoted"}
                      onClick={() => {
                        void (async () => {
                          setActing(`ps-${item.id}`);
                          setError("");
                          setNotice("");
                          try {
                            await authorizedFetch("/api/research/promote", {
                              method: "POST",
                              body: JSON.stringify({
                                discovery_id: item.id,
                                consumer: "pricesense",
                              }),
                            });
                            setNotice("PriceSenseへ送る準備をしました。メールは送信していません。");
                            await load();
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "送付に失敗しました"
                            );
                          } finally {
                            setActing(null);
                          }
                        })();
                      }}
                    >
                      PriceSenseへ送る
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={Boolean(acting) || item.newfind_status === "promoted"}
                      onClick={() => {
                        void (async () => {
                          setActing(`nf-${item.id}`);
                          setError("");
                          setNotice("");
                          try {
                            await authorizedFetch("/api/research/promote", {
                              method: "POST",
                              body: JSON.stringify({
                                discovery_id: item.id,
                                consumer: "newfind",
                              }),
                            });
                            setNotice("NEWFIND受け取り口へマークしました（本体は未接続）。");
                            await load();
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "送付に失敗しました"
                            );
                          } finally {
                            setActing(null);
                          }
                        })();
                      }}
                    >
                      NEWFINDへ送れる状態にする
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : ready ? (
        <EmptyState
          title="管理者セッションがありません"
          description="トークンを入力すると発見を確認できます。"
        />
      ) : null}
    </div>
  );
}
