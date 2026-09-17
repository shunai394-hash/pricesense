"use client";

import Link from "next/link";
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
import { LEARNING_LABELS, type Offering } from "@/lib/nbos/types";

interface WorkspaceProspect {
  id: string;
  status: string;
  score: number | null;
  fit_score: number | null;
  intent_score: number | null;
  pursue_decision: string | null;
  target_department: string | null;
  target_role: string | null;
  contactability: string;
  ready_to_contact: boolean;
  research_ready: boolean;
  contact_ready: boolean;
  why_now_ready: boolean;
  message_ready: boolean;
  approval_ready: boolean;
  next_action: string | null;
  lead_id: string | null;
  metadata: unknown;
  companies:
    | {
        id: string;
        name: string;
        domain: string | null;
        industry: string | null;
        account_status: string | null;
        country: string | null;
        last_researched_at: string | null;
        website_url: string | null;
      }
    | Array<{
        id: string;
        name: string;
        domain: string | null;
        industry: string | null;
        account_status: string | null;
        country: string | null;
        last_researched_at: string | null;
        website_url: string | null;
      }>
    | null;
}

interface WhyNowBrief {
  id: string;
  company_id: string;
  prospect_id: string | null;
  fact_text: string;
  source_url: string | null;
  source_name: string | null;
  detected_at: string | null;
  business_change: string | null;
  potential_need: string | null;
  why_now: string | null;
  recommended_action: string | null;
  recommended_contact: string | null;
  confidence: number | null;
}

interface Assessment {
  id: string;
  prospect_id: string | null;
  icp_fit: number;
  intent: number;
  timing: number;
  recent_change: number;
  need_hypothesis: number;
  evidence_quality: number;
  contactability: number;
  why_this_company: string | null;
  decision: string;
}

interface WorkspaceResponse {
  offering?: Offering | null;
  counts?: Record<string, number>;
  queue?: WorkspaceProspect[];
  whyNow?: WhyNowBrief[];
  assessments?: Assessment[];
  learning?: { items: Array<{ label: string; note: string | null }>; counts: Record<string, number> };
  error?: string;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function decisionTone(
  value: string | null
): "hot" | "warm" | "nurture" | "danger" | "accent" {
  if (value === "pursue") return "hot";
  if (value === "watch") return "warm";
  if (value === "disqualify") return "danger";
  if (value === "investigate") return "accent";
  return "nurture";
}

export function DiscoveryOsPanel() {
  const { token, setToken, persist, ready } = useAdminToken();
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [feedbackLabel, setFeedbackLabel] = useState(LEARNING_LABELS[0]);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      const json = (await authorizedFetch("/api/sales/nbos")) as WorkspaceResponse;
      setData(json);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, token]);

  useEffect(() => {
    if (ready && token) void load();
  }, [ready, token, load]);

  const selected = data?.queue?.find((item) => item.id === selectedId) ?? data?.queue?.[0];
  const company = selected ? one(selected.companies) : null;
  const why = data?.whyNow?.find(
    (item) => item.prospect_id === selected?.id || item.company_id === company?.id
  );
  const assessment = data?.assessments?.find((item) => item.prospect_id === selected?.id);

  async function run(action: string, extra?: Record<string, unknown>) {
    setActing(action);
    setNotice("");
    setError("");
    try {
      const json = await authorizedFetch("/api/sales/nbos", {
        method: "POST",
        body: JSON.stringify({ action, ...extra }),
      });
      const parts = [
        typeof json.notice === "string" ? json.notice : null,
        json.blocked ? String(json.reason ?? "ブロックしました") : null,
        json.offeringName ? `Offering: ${String(json.offeringName)}` : null,
        json.processed && typeof json.processed === "object"
          ? "未処理DiscoveryをQualificationまで進めました"
          : null,
      ].filter(Boolean);
      setNotice(parts.join(" / ") || "完了しました。営業メールは送信していません。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "実行に失敗しました");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="AI新規開拓営業OS"
        title="Account Discovery"
        description="売りたいもの → ICP → 公開シグナルで企業を発見 → Fact/Hypothesis分離 → 未接触確認 → 人間承認後に営業。既存Leadの処理だけでは新規開拓になりません。"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/offerings" className="text-sm text-accent">
              Offering設定
            </Link>
          </div>
        }
      />
      <AdminSessionBar
        token={token}
        onTokenChange={setToken}
        onSubmit={() => void load()}
        loading={loading}
      />
      {error ? <div className="mb-6"><ErrorState message={error} /></div> : null}
      {notice ? (
        <p className="mb-6 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          {notice}
        </p>
      ) : null}
      {loading ? <div className="mb-6"><LoadingState /></div> : null}

      {token ? (
        <div className="space-y-6">
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Active Offering</p>
            <h2 className="mt-1 font-display text-2xl">
              {data?.offering?.name || "未設定"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {data?.offering?.problem_solved ||
                "Offeringが無いとAIは企業を探せません。"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={Boolean(acting)}
                onClick={() => void run("run_cycle")}
              >
                {acting === "run_cycle" ? "探索中…" : "新規開拓サイクルを実行"}
              </Button>
              <Button
                variant="secondary"
                disabled={Boolean(acting)}
                onClick={() => void run("process_pending")}
              >
                未処理DiscoveryをQualification
              </Button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
              <Stat label="PURSUE" value={data?.counts?.pursue ?? 0} />
              <Stat label="WATCH" value={data?.counts?.watch ?? 0} />
              <Stat label="INVESTIGATE" value={data?.counts?.investigate ?? 0} />
              <Stat label="DISQUALIFY" value={data?.counts?.disqualify ?? 0} />
              <Stat label="READY TO CONTACT" value={data?.counts?.readyToContact ?? 0} />
            </dl>
          </Card>

          {(data?.queue ?? []).length === 0 ? (
            <EmptyState
              title="まだ新規開拓キューがありません"
              description="Offeringを確認し、サイクルを実行するとGoogle Newsの公開情報から企業発見を始めます。架空企業は作りません。"
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className="space-y-2">
                {(data?.queue ?? []).map((item) => {
                  const rowCompany = one(item.companies);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left ${
                        selected?.id === item.id
                          ? "border-accent/50 bg-accent/10"
                          : "border-border/80 bg-surface/50"
                      }`}
                    >
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={decisionTone(item.pursue_decision)}>
                          {item.pursue_decision || item.status}
                        </Badge>
                        <Badge>{rowCompany?.account_status || "ACCOUNT"}</Badge>
                      </div>
                      <p className="mt-2 font-medium">{rowCompany?.name || "企業名未確認"}</p>
                      <p className="text-xs text-muted">
                        {item.target_department || "部署未特定"} / {item.target_role || "役職未特定"}
                      </p>
                    </button>
                  );
                })}
              </div>

              {selected && company ? (
                <div className="space-y-4">
                  <Card>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={decisionTone(selected.pursue_decision)}>
                        {selected.pursue_decision || "undecided"}
                      </Badge>
                      <Badge>{company.account_status}</Badge>
                      <Badge>{selected.contactability}</Badge>
                      {selected.ready_to_contact ? (
                        <Badge tone="hot">READY TO CONTACT</Badge>
                      ) : null}
                      {selected.lead_id ? <Badge tone="accent">Leadあり</Badge> : null}
                    </div>
                    <h2 className="mt-3 font-display text-2xl">{company.name}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {company.domain || company.website_url || "domain未確認"} /{" "}
                      {company.country || "country未確認"}
                    </p>
                    <p className="mt-3 text-sm">
                      {assessment?.why_this_company ||
                        "なぜこの企業かを評価中です。業種一致だけではPURSUEしません。"}
                    </p>
                    <ReadinessRow prospect={selected} />
                  </Card>

                  {why ? (
                    <Card>
                      <p className="text-xs uppercase tracking-wide text-accent">
                        CONFIRMED FACT
                      </p>
                      <p className="mt-1 text-sm">{why.fact_text}</p>
                      <p className="mt-3 text-xs uppercase tracking-wide text-muted">SOURCE</p>
                      <p className="mt-1 break-all text-sm">
                        {why.source_url ? (
                          <a href={why.source_url} className="text-accent" target="_blank" rel="noreferrer">
                            {why.source_url}
                          </a>
                        ) : (
                          "ソースURLなし"
                        )}
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-wide text-muted">
                        AI HYPOTHESIS — Business Change → Need → Why Now
                      </p>
                      <ol className="mt-2 space-y-2 text-sm">
                        <li>変化仮説: {why.business_change || "—"}</li>
                        <li>Needs仮説: {why.potential_need || "—"}</li>
                        <li>Why Now: {why.why_now || "—"}</li>
                        <li>推奨アクション: {why.recommended_action || "—"}</li>
                        <li>接触先: {why.recommended_contact || "個人名は生成していません"}</li>
                      </ol>
                      <p className="mt-3 text-xs text-muted">
                        CONFIDENCE {why.confidence ?? "—"}　仮説を事実としては表示していません。
                      </p>
                    </Card>
                  ) : null}

                  {assessment ? (
                    <Card>
                      <p className="text-xs uppercase tracking-wide text-muted">
                        Qualification（総合点だけでは判断しない）
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <Stat label="ICP FIT" value={assessment.icp_fit} />
                        <Stat label="INTENT" value={assessment.intent} />
                        <Stat label="TIMING" value={assessment.timing} />
                        <Stat label="RECENT CHANGE" value={assessment.recent_change} />
                        <Stat label="NEED HYPOTHESIS" value={assessment.need_hypothesis} />
                        <Stat label="EVIDENCE" value={assessment.evidence_quality} />
                        <Stat label="CONTACTABILITY" value={assessment.contactability} />
                      </dl>
                    </Card>
                  ) : null}

                  <Card>
                    <p className="text-xs uppercase tracking-wide text-muted">営業判断</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(["pursue", "watch", "investigate", "disqualify"] as const).map(
                        (decision) => (
                          <Button
                            key={decision}
                            variant={decision === "disqualify" ? "danger" : "secondary"}
                            disabled={Boolean(acting)}
                            onClick={() =>
                              void run("decide", {
                                prospect_id: selected.id,
                                decision,
                              })
                            }
                          >
                            {decision.toUpperCase()}
                          </Button>
                        )
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        disabled={Boolean(acting) || selected.pursue_decision !== "pursue"}
                        onClick={() =>
                          void run("promote_lead", { prospect_id: selected.id })
                        }
                      >
                        New LeadへPromote
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={Boolean(acting) || !selected.approval_ready}
                        onClick={() =>
                          void run("approve_outreach", { prospect_id: selected.id })
                        }
                      >
                        人間承認（送信はしない）
                      </Button>
                      {selected.lead_id ? (
                        <Link
                          href={`/app/leads/${selected.lead_id}`}
                          className="inline-flex min-h-11 items-center text-sm text-accent"
                        >
                          Leadワークスペースへ
                        </Link>
                      ) : (
                        <Link
                          href="/app/outreach"
                          className="inline-flex min-h-11 items-center text-sm text-accent"
                        >
                          Outreach下書き
                        </Link>
                      )}
                    </div>
                  </Card>

                  <Card>
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Human Feedback Learning
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                      <select
                        value={feedbackLabel}
                        onChange={(event) =>
                          setFeedbackLabel(event.target.value as typeof feedbackLabel)
                        }
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        {LEARNING_LABELS.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <Button
                        disabled={Boolean(acting)}
                        onClick={() =>
                          void run("feedback", {
                            label: feedbackLabel,
                            note: feedbackNote,
                            offering_id: data?.offering?.id,
                            company_id: company.id,
                            prospect_id: selected.id,
                            lead_id: selected.lead_id,
                          })
                        }
                      >
                        学習に戻す
                      </Button>
                    </div>
                    <textarea
                      value={feedbackNote}
                      onChange={(event) => setFeedbackNote(event.target.value)}
                      placeholder="なぜこの判断をしたか（Negative ICPに反映されます）"
                      className="mt-3 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Card>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : ready ? (
        <EmptyState
          title="管理者セッションがありません"
          description="トークンを入力すると実データで新規開拓キューを表示します。"
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-display text-2xl">{value}</dd>
    </div>
  );
}

function ReadinessRow({ prospect }: { prospect: WorkspaceProspect }) {
  const items = [
    ["Research", prospect.research_ready],
    ["Contact", prospect.contact_ready],
    ["Why Now", prospect.why_now_ready],
    ["Message", prospect.message_ready],
    ["Approval", prospect.approval_ready],
  ] as const;
  return (
    <ul className="mt-4 flex flex-wrap gap-2 text-xs">
      {items.map(([label, ready]) => (
        <li key={label}>
          <Badge tone={ready ? "accent" : "muted"}>
            {label} {ready ? "Ready" : "未完了"}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
