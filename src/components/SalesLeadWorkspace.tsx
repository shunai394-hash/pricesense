"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { formatAdminClientError } from "@/lib/admin-ui";
import { DEAL_STATUSES, type DealStatus } from "@/lib/ai/deal";
import { DEAL_LOST_REASONS, type SalesAction } from "@/lib/ai/sales-actions";

const TOKEN_STORAGE_KEY = "pricesense.adminToken";

interface QuoteItemView {
  name?: string;
  quantity?: number | null;
  unitPrice?: number | null;
  amount?: number | null;
}

interface LeadDetailResponse {
  success: boolean;
  error?: string;
  action?: SalesAction | null;
  lead?: {
    id: string;
    email: string | null;
    categoryName: string | null;
    categoryId: string | null;
    leadSource: string | null;
    userRate: number | null;
    marketRate: number | null;
    diagnosisLevel: string | null;
    targetRate: number | null;
    handedOffAt: string | null;
    handoffChannel: string | null;
    createdAt: string;
    primaryObjection: string | null;
    modelVersion: string | null;
  };
  score?: {
    score: number | null;
    escalationStatus: string | null;
    nextAction: string | null;
    intentSignals: unknown;
  };
  conversation?: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
  objections?: Array<{
    id: string;
    objectionType: string | null;
    customerMessage: string | null;
    responsePlay: string | null;
    createdAt: string;
  }>;
  salesBrief?: {
    summary: string;
    pain: string;
    budget: string;
    decisionMaker: boolean;
    decisionTimelineDays: number;
    competitor: string;
    objections: Array<{ type: string; message: string }>;
    recommendedApproach: string;
    nextQuestions: string[];
  } | null;
  meeting?: {
    id: string;
    meetingStatus: string | null;
    meetingAt: string | null;
    summary: string | null;
    customerNeeds: string[];
    objections: string[];
    agreedPoints: string[];
    unresolvedPoints: string[];
    nextAction: string | null;
    createdAt: string;
  } | null;
  proposal?: {
    id: string;
    title: string | null;
    problem: string | null;
    proposedSolution: string | null;
    benefits: string[];
    implementationPlan: string[];
    assumptions: string[];
    risks: string[];
    nextSteps: string[];
    status: string | null;
    createdAt: string;
  } | null;
  quote?: {
    id: string;
    items: QuoteItemView[];
    subtotal: number | null;
    discount: number | null;
    total: number | null;
    currency: string | null;
    assumptions: string[];
    validUntil: string | null;
    status: string | null;
    createdAt: string;
  } | null;
  deal?: {
    id: string;
    status: string | null;
    probability: number | null;
    expectedValue: number | null;
    currency: string | null;
    nextAction: string | null;
    nextFollowupAt: string | null;
    lostReason: string | null;
    wonAt: string | null;
    lostAt: string | null;
  } | null;
  followupHistory?: Array<{
    id: string;
    source: "lead" | "deal";
    sequenceNumber: number | null;
    message: string | null;
    reason: string | null;
    status: string | null;
    scheduledAt: string | null;
    createdAt: string;
  }>;
  actionHistory?: Array<{
    id: string;
    actionType: string | null;
    priority: string | null;
    operation: string;
    actionContent: string | null;
    previousStatus: string | null;
    nextStatus: string | null;
    result: string;
    status?: string;
    executedBy: string;
    executedAt: string;
    error?: string | null;
    actorKind?: string;
    retryOf?: string | null;
    attempt?: number;
    idempotencyKey?: string;
    reason: string | null;
  }>;
}

function formatAmount(value: number | null): string {
  if (value === null) return "";
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(
    value
  );
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-surface/70 p-4">
      <h2 className="mb-3 font-display text-2xl text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted">{text}</p>;
}

function List({ items }: { items: string[] }) {
  if (items.length === 0) return <Empty text="なし" />;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">
        {value === null || value === undefined ? "—" : value}
      </dd>
    </div>
  );
}

export function SalesLeadWorkspace({ leadId }: { leadId: string }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [data, setData] = useState<LeadDetailResponse | null>(null);
  const [status, setStatus] = useState<DealStatus>("proposal_ready");
  const [lostReason, setLostReason] = useState<(typeof DEAL_LOST_REASONS)[number]>(
    "unknown"
  );

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) setToken(stored);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai/sales-actions/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await response.json()) as LeadDetailResponse;
      if (!response.ok || !json.success) {
        setData(null);
        setError(
          formatAdminClientError(
            json.error || `Request failed (${response.status})`,
            response.status
          )
        );
        return;
      }
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      setData(json);
      if (json.deal?.status && DEAL_STATUSES.includes(json.deal.status as DealStatus)) {
        setStatus(json.deal.status as DealStatus);
      }
      if (
        json.deal?.lostReason &&
        DEAL_LOST_REASONS.includes(
          json.deal.lostReason as (typeof DEAL_LOST_REASONS)[number]
        )
      ) {
        setLostReason(json.deal.lostReason as (typeof DEAL_LOST_REASONS)[number]);
      }
    } catch (loadError) {
      setData(null);
      setError(
        formatAdminClientError(
          loadError instanceof Error ? loadError.message : "Failed to load lead"
        )
      );
    } finally {
      setLoading(false);
    }
  }, [leadId, token]);

  async function postJson(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as {
      success?: boolean;
      error?: string;
      reply?: string;
      nextAction?: string;
      duplicate?: boolean;
    };
    if (!response.ok || !json.success) {
      throw new Error(
        formatAdminClientError(
          json.error || `Request failed (${response.status})`,
          response.status
        )
      );
    }
    return json;
  }

  async function runAction(
    name: string,
    work: () => Promise<{ reply?: string; nextAction?: string; duplicate?: boolean }>
  ) {
    setActing(name);
    setError(null);
    setNotice(null);
    try {
      const result = await work();
      if (result.duplicate) {
        setNotice("同一操作のため登録をスキップしました（二重実行防止）");
      } else if (result.reply) {
        setNotice(`保存しました（送信していません）: ${result.reply}`);
      } else if (result.nextAction) {
        setNotice(`保存しました: ${result.nextAction}`);
      } else {
        setNotice("保存しました（送信していません）");
      }
      await load();
    } catch (actionError) {
      setError(
        formatAdminClientError(
          actionError instanceof Error ? actionError.message : "Action failed"
        )
      );
    } finally {
      setActing(null);
    }
  }

  const lead = data?.lead;
  const quote = data?.quote;
  const proposal = data?.proposal;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 border-b border-border/60 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Admin</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">
          営業アクション詳細
        </h1>
        <p className="mt-2 text-sm text-muted">
          既存データのみ表示します。メール送信はしません。
        </p>
        <p className="mt-3">
          <Link href="/admin/sales" className="text-sm text-accent">
            ← 今日の営業一覧
          </Link>
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
            {loading ? "読み込み中…" : "読み込む"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-6 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          {notice}
        </p>
      ) : null}

      {!data?.success ? (
        <p className="text-sm text-muted">トークンを入力して詳細を読み込んでください。</p>
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border border-border/80 bg-surface/70 p-4">
            <h2 className="mb-3 font-display text-2xl">操作</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(acting)}
                onClick={() =>
                  void runAction("followup", () =>
                    postJson("/api/ai/sales-action-execute", {
                      leadId,
                      operation: "followup_created",
                    })
                  )
                }
                className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"
              >
                {acting === "followup" ? "作成中…" : "次のフォローを作成"}
              </button>
              <button
                type="button"
                disabled={Boolean(acting)}
                onClick={() =>
                  void runAction("won", () =>
                    postJson("/api/ai/deal-status", { leadId, status: "won" })
                  )
                }
                className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"
              >
                Won
              </button>
              <button
                type="button"
                disabled={Boolean(acting)}
                onClick={() =>
                  void runAction("lost", () =>
                    postJson("/api/ai/deal-status", {
                      leadId,
                      status: "lost",
                      lostReason,
                    })
                  )
                }
                className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"
              >
                Lost
              </button>
              <button
                type="button"
                disabled={Boolean(acting)}
                onClick={() =>
                  void runAction("stop", () =>
                    postJson("/api/ai/deal-stop", {
                      leadId,
                      reason: "manual_stop",
                    })
                  )
                }
                className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"
              >
                Manual stop
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Deal status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as DealStatus)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {DEAL_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Lost reason</span>
                <select
                  value={lostReason}
                  onChange={(event) =>
                    setLostReason(
                      event.target.value as (typeof DEAL_LOST_REASONS)[number]
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {DEAL_LOST_REASONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={Boolean(acting)}
                  onClick={() =>
                    void runAction("status", () =>
                      postJson("/api/ai/deal-status", {
                        leadId,
                        status,
                        lostReason: status === "lost" ? lostReason : undefined,
                      })
                    )
                  }
                  className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
                >
                  {acting === "status" ? "保存中…" : "Statusを保存"}
                </button>
              </div>
            </div>
            {data.action ? (
              <p className="mt-3 text-sm text-muted">
                現在のAction: {data.action.priority} / {data.action.actionType} /{" "}
                {data.action.reason}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted">
                現在のAction対象ではありません（won / lost または対象外）。
              </p>
            )}
          </section>

          <Section title="Lead情報">
            {!lead ? (
              <Empty text="なし" />
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Lead ID" value={lead.id} />
                <Field label="Email" value={lead.email} />
                <Field label="Category" value={lead.categoryName} />
                <Field label="Source" value={lead.leadSource} />
                <Field label="Diagnosis" value={lead.diagnosisLevel} />
                <Field
                  label="User rate"
                  value={lead.userRate == null ? "" : String(lead.userRate)}
                />
                <Field
                  label="Market rate"
                  value={lead.marketRate == null ? "" : String(lead.marketRate)}
                />
                <Field label="Handed off" value={formatWhen(lead.handedOffAt)} />
                <Field label="Created" value={formatWhen(lead.createdAt)} />
              </dl>
            )}
          </Section>

          <p className="px-3 text-center text-xs text-muted">↓</p>

          <Section title="Lead Score">
            <dl className="grid gap-3 sm:grid-cols-3">
              <Field
                label="Score"
                value={data.score?.score == null ? "" : String(data.score.score)}
              />
              <Field label="Escalation" value={data.score?.escalationStatus} />
              <Field label="Next action" value={data.score?.nextAction} />
            </dl>
          </Section>

          <p className="px-3 text-center text-xs text-muted">↓</p>

          <Section title="Conversation">
            {!data.conversation || data.conversation.length === 0 ? (
              <Empty text="会話なし" />
            ) : (
              <ol className="space-y-3">
                {data.conversation.map((message, index) => (
                  <li
                    key={`${message.createdAt}-${index}`}
                    className="rounded-lg border border-border/60 p-3"
                  >
                    <p className="text-xs text-muted">
                      {message.role === "user" ? "customer" : "assistant"} ·{" "}
                      {formatWhen(message.createdAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {message.content}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <p className="px-3 text-center text-xs text-muted">↓</p>

          <Section title="Objections">
            {!data.objections || data.objections.length === 0 ? (
              <Empty text="なし" />
            ) : (
              <ol className="space-y-3">
                {data.objections.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border/60 p-3">
                    <p className="text-sm font-medium">{item.objectionType || "objection"}</p>
                    <p className="mt-1 text-sm">{item.customerMessage || "—"}</p>
                    {item.responsePlay ? (
                      <p className="mt-1 text-xs text-muted">{item.responsePlay}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <p className="px-3 text-center text-xs text-muted">↓</p>

          <Section title="Sales Brief">
            {!data.salesBrief ? (
              <Empty text="なし（再生成しません）" />
            ) : (
              <div className="space-y-3 text-sm">
                <Field label="summary" value={data.salesBrief.summary} />
                <Field label="pain" value={data.salesBrief.pain} />
                <Field label="budget" value={data.salesBrief.budget} />
                <Field
                  label="decisionMaker"
                  value={data.salesBrief.decisionMaker ? "true" : "false"}
                />
                <Field
                  label="decisionTimelineDays"
                  value={String(data.salesBrief.decisionTimelineDays)}
                />
                <Field label="competitor" value={data.salesBrief.competitor} />
                <div>
                  <p className="text-xs text-muted">objections</p>
                  {data.salesBrief.objections.length === 0 ? (
                    <Empty text="なし" />
                  ) : (
                    <ul className="mt-1 list-disc pl-5">
                      {data.salesBrief.objections.map((item, index) => (
                        <li key={`${item.type}-${index}`}>
                          {item.type}: {item.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Field
                  label="recommendedApproach"
                  value={data.salesBrief.recommendedApproach}
                />
                <div>
                  <p className="text-xs text-muted">nextQuestions</p>
                  <List items={data.salesBrief.nextQuestions} />
                </div>
              </div>
            )}
          </Section>

          <p className="px-3 text-center text-xs text-muted">↓</p>

          <Section title="Meeting">
            {!data.meeting ? (
              <Empty text="なし" />
            ) : (
              <div className="space-y-3 text-sm">
                <Field label="summary" value={data.meeting.summary} />
                <div>
                  <p className="text-xs text-muted">customerNeeds</p>
                  <List items={data.meeting.customerNeeds} />
                </div>
                <div>
                  <p className="text-xs text-muted">objections</p>
                  <List items={data.meeting.objections} />
                </div>
                <div>
                  <p className="text-xs text-muted">agreedPoints</p>
                  <List items={data.meeting.agreedPoints} />
                </div>
                <div>
                  <p className="text-xs text-muted">unresolvedPoints</p>
                  <List items={data.meeting.unresolvedPoints} />
                </div>
                <Field label="nextAction" value={data.meeting.nextAction} />
              </div>
            )}
          </Section>

          <p className="px-3 text-center text-xs text-muted">↓</p>

          <Section title="Proposal">
            {!proposal ? (
              <Empty text="なし" />
            ) : (
              <div className="space-y-3 text-sm">
                <Field label="title" value={proposal.title} />
                <Field label="problem" value={proposal.problem} />
                <Field label="proposedSolution" value={proposal.proposedSolution} />
                <div>
                  <p className="text-xs text-muted">benefits</p>
                  <List items={proposal.benefits} />
                </div>
                <div>
                  <p className="text-xs text-muted">implementationPlan</p>
                  <List items={proposal.implementationPlan} />
                </div>
                <div>
                  <p className="text-xs text-muted">assumptions</p>
                  <List items={proposal.assumptions} />
                </div>
                <div>
                  <p className="text-xs text-muted">risks</p>
                  <List items={proposal.risks} />
                </div>
                <div>
                  <p className="text-xs text-muted">nextSteps</p>
                  <List items={proposal.nextSteps} />
                </div>
              </div>
            )}
          </Section>

          <p className="px-3 text-center text-xs text-muted">↓</p>

          <Section title="Quote">
            {!quote ? (
              <Empty text="なし" />
            ) : (
              <div className="space-y-3 text-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead className="text-muted">
                      <tr>
                        <th className="py-1 font-medium">Item</th>
                        <th className="py-1 font-medium">Qty</th>
                        <th className="py-1 font-medium">Unit</th>
                        <th className="py-1 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.items.length === 0 ? (
                        <tr>
                          <td className="py-2 text-muted" colSpan={4}>
                            なし
                          </td>
                        </tr>
                      ) : (
                        quote.items.map((item, index) => (
                          <tr key={`${item.name ?? "item"}-${index}`}>
                            <td className="py-1">{item.name ?? "—"}</td>
                            <td className="py-1">
                              {item.quantity == null ? "" : item.quantity}
                            </td>
                            <td className="py-1">{formatAmount(item.unitPrice ?? null)}</td>
                            <td className="py-1">{formatAmount(item.amount ?? null)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="subtotal" value={formatAmount(quote.subtotal)} />
                  <Field label="discount" value={formatAmount(quote.discount)} />
                  <Field label="total" value={formatAmount(quote.total)} />
                  <Field label="currency" value={quote.currency} />
                  <Field label="validUntil" value={formatWhen(quote.validUntil)} />
                  <Field label="status" value={quote.status} />
                </dl>
                <div>
                  <p className="text-xs text-muted">assumptions</p>
                  <List items={quote.assumptions} />
                </div>
              </div>
            )}
          </Section>

          <p className="px-3 text-center text-xs text-muted">↓</p>

          <Section title="Deal">
            {!data.deal ? (
              <Empty text="なし" />
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="status" value={data.deal.status} />
                <Field
                  label="probability"
                  value={
                    data.deal.probability == null ? "" : String(data.deal.probability)
                  }
                />
                <Field
                  label="expected_value"
                  value={formatAmount(data.deal.expectedValue)}
                />
                <Field label="currency" value={data.deal.currency} />
                <Field label="next_action" value={data.deal.nextAction} />
                <Field
                  label="next_followup_at"
                  value={formatWhen(data.deal.nextFollowupAt)}
                />
                <Field label="lost_reason" value={data.deal.lostReason} />
              </dl>
            )}
          </Section>

          <p className="px-3 text-center text-xs text-muted">↓</p>

          <Section title="営業操作履歴">
            {!data.actionHistory || data.actionHistory.length === 0 ? (
              <Empty text="なし" />
            ) : (
              <ol className="space-y-3">
                {data.actionHistory.map((event) => (
                  <li key={event.id} className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted">{formatWhen(event.executedAt)}</p>
                    <p className="mt-1 text-sm">
                      {event.actionType || "—"} / {event.operation}
                    </p>
                    <p className="mt-1 text-sm">{event.actionContent || "—"}</p>
                    <p className="mt-1 text-xs text-muted">
                      実行者: {event.executedBy}
                      {event.actorKind ? ` (${event.actorKind})` : ""} · 結果:{" "}
                      {event.result}
                      {event.status ? ` · 状態: ${event.status}` : ""}
                      {event.previousStatus || event.nextStatus
                        ? ` · ${event.previousStatus ?? "—"} → ${event.nextStatus ?? "—"}`
                        : ""}
                    </p>
                    {event.error ? (
                      <p className="mt-1 text-xs text-red-200">失敗: {event.error}</p>
                    ) : null}
                    {event.idempotencyKey ? (
                      <p className="mt-1 break-all text-xs text-muted">
                        idempotency: {event.idempotencyKey}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <p className="px-3 text-center text-xs text-muted">↓</p>

          <Section title="Follow-up History">
            {!data.followupHistory || data.followupHistory.length === 0 ? (
              <Empty text="なし" />
            ) : (
              <ol className="space-y-3">
                {data.followupHistory.map((event) => (
                  <li key={event.id} className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted">
                      {event.source} · #{event.sequenceNumber ?? "—"} ·{" "}
                      {formatWhen(event.createdAt)}
                    </p>
                    <p className="mt-1 text-sm">{event.message || "—"}</p>
                    <p className="mt-1 text-xs text-muted">
                      {event.reason || event.status || ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
