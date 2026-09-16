"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminToken } from "@/hooks/useAdminToken";
import { AdminSessionBar } from "@/components/sales/AdminSessionBar";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  TableWrap,
  Td,
  Th,
} from "@/components/ui/primitives";

type ViewKey =
  | "companies"
  | "contacts"
  | "signals"
  | "research"
  | "sequences"
  | "outreach"
  | "inbox";

const CONFIG: Record<
  ViewKey,
  {
    title: string;
    description: string;
    endpoint: string;
    resultKey: string;
    columns: Array<{ key: string; label: string }>;
  }
> = {
  companies: {
    title: "Companies",
    description:
      "既存Leadから生成した企業、または手動登録した企業です。架空の企業は表示しません。",
    endpoint: "/api/sales/companies",
    resultKey: "companies",
    columns: [
      { key: "name", label: "企業名" },
      { key: "domain", label: "ドメイン" },
      { key: "industry", label: "業種" },
      { key: "location", label: "所在地" },
      { key: "employee_count", label: "従業員数" },
      { key: "source", label: "ソース" },
    ],
  },
  contacts: {
    title: "Contacts",
    description: "確認済みの担当者・メール接点です。",
    endpoint: "/api/sales/contacts",
    resultKey: "contacts",
    columns: [
      { key: "full_name", label: "氏名" },
      { key: "job_title", label: "役職" },
      { key: "department", label: "部署" },
      { key: "email", label: "メール" },
      { key: "source", label: "ソース" },
    ],
  },
  signals: {
    title: "Intent Signals",
    description: "Leadスコアや確認済みシグナルです。未確認の購買意図は作りません。",
    endpoint: "/api/sales/signals",
    resultKey: "signals",
    columns: [
      { key: "title", label: "シグナル" },
      { key: "signal_type", label: "種別" },
      { key: "signal_strength", label: "強度" },
      { key: "description", label: "内容" },
      { key: "source", label: "ソース" },
      { key: "detected_at", label: "検知日" },
    ],
  },
  research: {
    title: "AI Research",
    description:
      "確認済み事実だけを使った企業リサーチです。未確認事項は仮説として残します。",
    endpoint: "/api/sales/research",
    resultKey: "research",
    columns: [
      { key: "research_type", label: "種別" },
      { key: "summary", label: "要約" },
      { key: "score", label: "スコア" },
      { key: "model", label: "モデル" },
      { key: "created_at", label: "作成日" },
    ],
  },
  sequences: {
    title: "Sequences",
    description: "接触ステップの下書きです。外部メールは自動送信しません。",
    endpoint: "/api/sales/sequences",
    resultKey: "sequences",
    columns: [
      { key: "name", label: "名前" },
      { key: "status", label: "状態" },
      { key: "channel", label: "チャネル" },
      { key: "description", label: "説明" },
    ],
  },
  outreach: {
    title: "Outreach",
    description: "初回・フォローのメール下書きです。送信は人間が承認するまで行いません。",
    endpoint: "/api/sales/outreach",
    resultKey: "outreach",
    columns: [
      { key: "subject", label: "件名" },
      { key: "channel", label: "チャネル" },
      { key: "status", label: "状態" },
      { key: "body", label: "本文" },
      { key: "created_at", label: "作成日" },
    ],
  },
  inbox: {
    title: "Inbox",
    description: "返信の解析とAI返信案です。返信・興味あり・質問・価格交渉・競合・保留・断り・商談希望・人間対応必要に分類します。送信は人間が承認します。",
    endpoint: "/api/sales/inbox",
    resultKey: "messages",
    columns: [
      { key: "subject", label: "件名" },
      { key: "body", label: "本文" },
      { key: "sentiment", label: "感情" },
      { key: "ai_classification", label: "分類" },
      { key: "ai_reply", label: "AI返信案" },
      { key: "status", label: "状態" },
    ],
  },
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function SalesOsDirectory({ view }: { view: ViewKey }) {
  const { token, setToken, persist, ready } = useAdminToken();
  const config = CONFIG[view];

  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [emptyReason, setEmptyReason] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [contactCompanyId, setContactCompanyId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [inboxProspectId, setInboxProspectId] = useState("");
  const [inboxBody, setInboxBody] = useState("");
  const [researchCompanyId, setResearchCompanyId] = useState("");
  const [outreachProspectId, setOutreachProspectId] = useState("");

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
      const payload = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : `Request failed (${response.status})`
        );
      }
      persist(token);
      return payload;
    },
    [persist, token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const payload = await authorizedFetch(config.endpoint);
      setItems(
        Array.isArray(payload[config.resultKey])
          ? (payload[config.resultKey] as Record<string, unknown>[])
          : []
      );
      setEmptyReason(
        typeof payload.emptyReason === "string" ? payload.emptyReason : ""
      );
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, config.endpoint, config.resultKey, token]);

  useEffect(() => {
    if (ready && token) void load();
  }, [ready, token, load]);

  async function run(name: string, work: () => Promise<string>) {
    setActing(name);
    setError("");
    setNotice("");
    try {
      const message = await work();
      setNotice(message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作に失敗しました");
    } finally {
      setActing(null);
    }
  }

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      Object.values(item).some((value) =>
        formatValue(value).toLowerCase().includes(normalized)
      )
    );
  }, [items, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="AI営業部"
        title={config.title}
        description={config.description}
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="検索..."
              aria-label={`${config.title}を検索`}
              className="w-full max-w-md rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
            />
            <span className="text-sm text-muted">
              {filteredItems.length} / {items.length} 件
            </span>
          </div>

          {view === "companies" ? (
            <form
              className="grid gap-3 rounded-xl border border-border/80 bg-surface/50 p-4 md:grid-cols-[1fr_1fr_auto_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void run("create-company", async () => {
                  await authorizedFetch("/api/sales/companies", {
                    method: "POST",
                    body: JSON.stringify({
                      name: companyName,
                      domain: companyDomain || null,
                    }),
                  });
                  setCompanyName("");
                  setCompanyDomain("");
                  return "企業を保存しました。";
                });
              }}
            >
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="企業名（必須）"
                aria-label="企業名"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                value={companyDomain}
                onChange={(event) => setCompanyDomain(event.target.value)}
                placeholder="ドメイン（任意）"
                aria-label="ドメイン"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={!companyName || Boolean(acting)}>
                {acting === "create-company" ? "保存中…" : "企業を追加"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={Boolean(acting)}
                onClick={() =>
                  void run("sync", async () => {
                    await authorizedFetch("/api/sales/companies", {
                      method: "POST",
                      body: JSON.stringify({ action: "sync" }),
                    });
                    return "Leadから企業・担当者を同期しました。";
                  })
                }
              >
                {acting === "sync" ? "同期中…" : "Leadから同期"}
              </Button>
            </form>
          ) : null}

          {view === "contacts" ? (
            <form
              className="grid gap-3 rounded-xl border border-border/80 bg-surface/50 p-4 md:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault();
                void run("create-contact", async () => {
                  await authorizedFetch("/api/sales/contacts", {
                    method: "POST",
                    body: JSON.stringify({
                      company_id: contactCompanyId,
                      full_name: contactName || null,
                      email: contactEmail || null,
                    }),
                  });
                  setContactCompanyId("");
                  setContactEmail("");
                  setContactName("");
                  return "担当者を保存しました。";
                });
              }}
            >
              <input
                value={contactCompanyId}
                onChange={(event) => setContactCompanyId(event.target.value)}
                placeholder="企業ID"
                aria-label="企業ID"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="氏名"
                aria-label="担当者名"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="メール"
                aria-label="担当者メール"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={!contactCompanyId || Boolean(acting)}>
                {acting === "create-contact" ? "保存中…" : "担当者を追加"}
              </Button>
            </form>
          ) : null}

          {view === "research" ? (
            <form
              className="grid gap-3 rounded-xl border border-border/80 bg-surface/50 p-4 md:grid-cols-[1fr_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void run("research", async () => {
                  const payload = await authorizedFetch("/api/sales/research", {
                    method: "POST",
                    body: JSON.stringify({ company_id: researchCompanyId }),
                  });
                  return payload.usedAi
                    ? "AIリサーチを保存しました。"
                    : "AI未設定のため、確認済み事実だけのリサーチを保存しました。";
                });
              }}
            >
              <input
                value={researchCompanyId}
                onChange={(event) => setResearchCompanyId(event.target.value)}
                placeholder="企業ID"
                aria-label="リサーチする企業ID"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={!researchCompanyId || Boolean(acting)}>
                {acting === "research" ? "実行中…" : "AIリサーチを実行"}
              </Button>
            </form>
          ) : null}

          {view === "sequences" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(acting)}
              onClick={() =>
                void run("sequence", async () => {
                  await authorizedFetch("/api/sales/sequences", {
                    method: "POST",
                    body: JSON.stringify({ action: "ensure_default" }),
                  });
                  return "3ステップの下書きシーケンスを用意しました（自動送信なし）。";
                })
              }
            >
              {acting === "sequence" ? "作成中…" : "標準シーケンスを用意"}
            </Button>
          ) : null}

          {view === "outreach" ? (
            <form
              className="grid gap-3 rounded-xl border border-border/80 bg-surface/50 p-4 md:grid-cols-[1fr_auto_auto_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void run("outreach", async () => {
                  await authorizedFetch("/api/sales/outreach", {
                    method: "POST",
                    body: JSON.stringify({
                      prospect_id: outreachProspectId,
                      kind: "initial",
                    }),
                  });
                  return "初回メール下書きを保存しました。外部送信はしていません。";
                });
              }}
            >
              <input
                value={outreachProspectId}
                onChange={(event) => setOutreachProspectId(event.target.value)}
                placeholder="Prospect ID"
                aria-label="OutreachするProspect ID"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={!outreachProspectId || Boolean(acting)}>
                {acting === "outreach" ? "作成中…" : "初回"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!outreachProspectId || Boolean(acting)}
                onClick={() =>
                  void run("outreach-follow", async () => {
                    await authorizedFetch("/api/sales/outreach", {
                      method: "POST",
                      body: JSON.stringify({
                        prospect_id: outreachProspectId,
                        kind: "followup",
                      }),
                    });
                    return "フォローアップ下書きを保存しました。外部送信はしていません。";
                  })
                }
              >
                フォロー
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!outreachProspectId || Boolean(acting)}
                onClick={() =>
                  void run("outreach-refollow", async () => {
                    await authorizedFetch("/api/sales/outreach", {
                      method: "POST",
                      body: JSON.stringify({
                        prospect_id: outreachProspectId,
                        kind: "refollow",
                      }),
                    });
                    return "再フォロー下書きを保存しました。外部送信はしていません。";
                  })
                }
              >
                再フォロー
              </Button>
            </form>
          ) : null}

          {view === "inbox" ? (
            <form
              className="grid gap-3 rounded-xl border border-border/80 bg-surface/50 p-4 md:grid-cols-[1fr_2fr_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void run("inbox", async () => {
                  await authorizedFetch("/api/sales/inbox", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "record",
                      prospect_id: inboxProspectId,
                      body: inboxBody,
                    }),
                  });
                  setInboxBody("");
                  return "返信を記録し、AI分類と返信案を保存しました。";
                });
              }}
            >
              <input
                value={inboxProspectId}
                onChange={(event) => setInboxProspectId(event.target.value)}
                placeholder="Prospect ID"
                aria-label="InboxのProspect ID"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <textarea
                value={inboxBody}
                onChange={(event) => setInboxBody(event.target.value)}
                placeholder="受信した返信本文"
                aria-label="受信本文"
                className="min-h-16 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={!inboxProspectId || !inboxBody || Boolean(acting)}>
                {acting === "inbox" ? "解析中…" : "返信を記録して解析"}
              </Button>
            </form>
          ) : null}

          {!loading && filteredItems.length === 0 ? (
            <EmptyState
              title="データがありません"
              description={
                emptyReason ||
                "DBに実データがないため、架空の件数やKPIは表示しません。"
              }
            />
          ) : null}

          {!loading && filteredItems.length > 0 ? (
            <TableWrap>
              <thead>
                <tr>
                  {config.columns.map((column) => (
                    <Th key={column.key}>{column.label}</Th>
                  ))}
                  {view === "companies" ||
                  view === "contacts" ||
                  view === "inbox" ? (
                    <Th>操作</Th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  const id = String(item.id ?? index);
                  return (
                    <tr key={id} className="hover:bg-surface">
                      {config.columns.map((column) => (
                        <Td key={column.key} className="max-w-[280px]">
                          <span className="line-clamp-3">
                            {formatValue(item[column.key])}
                          </span>
                        </Td>
                      ))}
                      {view === "companies" ? (
                        <Td>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={Boolean(acting)}
                              onClick={() =>
                                void run(`prospect-${id}`, async () => {
                                  await authorizedFetch("/api/sales/prospects", {
                                    method: "POST",
                                    body: JSON.stringify({ company_id: id }),
                                  });
                                  return "Prospect化しました。";
                                })
                              }
                            >
                              Prospect化
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={Boolean(acting)}
                              onClick={() =>
                                void run(`research-${id}`, async () => {
                                  const payload = await authorizedFetch(
                                    "/api/sales/research",
                                    {
                                      method: "POST",
                                      body: JSON.stringify({ company_id: id }),
                                    }
                                  );
                                  return payload.usedAi
                                    ? "AIリサーチを保存しました。"
                                    : "確認済み事実のリサーチを保存しました。";
                                })
                              }
                            >
                              リサーチ
                            </Button>
                          </div>
                        </Td>
                      ) : null}
                      {view === "contacts" ? (
                        <Td>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={Boolean(acting)}
                            onClick={() =>
                              void run(`contact-prospect-${id}`, async () => {
                                const company =
                                  item.companies && typeof item.companies === "object"
                                    ? (item.companies as Record<string, unknown>).id
                                    : item.company_id;
                                await authorizedFetch("/api/sales/prospects", {
                                  method: "POST",
                                  body: JSON.stringify({
                                    company_id: company,
                                    contact_id: id,
                                  }),
                                });
                                return "Prospect化しました。";
                              })
                            }
                          >
                            Prospect化
                          </Button>
                        </Td>
                      ) : null}
                      {view === "inbox" ? (
                        <Td>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={Boolean(acting)}
                              onClick={() =>
                                void run(`analyze-${id}`, async () => {
                                  await authorizedFetch("/api/sales/inbox", {
                                    method: "POST",
                                    body: JSON.stringify({
                                      action: "analyze",
                                      message_id: id,
                                    }),
                                  });
                                  return "返信を再解析しました。";
                                })
                              }
                            >
                              再解析
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={Boolean(acting)}
                              onClick={() =>
                                void run(`handoff-${id}`, async () => {
                                  await authorizedFetch("/api/sales/inbox", {
                                    method: "POST",
                                    body: JSON.stringify({
                                      action: "handoff",
                                      message_id: id,
                                    }),
                                  });
                                  return "人間への引き継ぎを実行しました。";
                                })
                              }
                            >
                              Handoff
                            </Button>
                          </div>
                        </Td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
