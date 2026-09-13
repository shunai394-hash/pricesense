import { getCompatibleAiConfig } from "@/lib/server/env";
import {
  parseConversation,
  scoreInputFromLeadConversation,
  type ConversationMessage,
  type SalesLeadRow,
} from "@/lib/ai/respond";
import {
  emptyFollowupState,
  stopFollowupState,
  type LeadFollowupState,
} from "@/lib/ai/followup";
import {
  scoreLead,
  type BudgetStatus,
  type EscalationStatus,
  type IntentSignals,
  type ScoreResult,
} from "@/lib/sales/scoring";

export type HandoffStatus = "pending" | "ready" | "accepted" | "completed";
export type MeetingStatus =
  | "not_scheduled"
  | "scheduled"
  | "completed"
  | "cancelled";

export interface ObjectionEventRow {
  objection_type?: string | null;
  objection_key?: string | null;
  customer_message?: string | null;
  raw_text?: string | null;
  response_play?: string | null;
}

export interface SalesBriefObjection {
  type: string;
  message: string;
}

export interface SalesBrief {
  leadId: string;
  overview: string;
  summary: string;
  score: number;
  escalationStatus: EscalationStatus;
  nextAction: string;
  pain: string;
  budget: BudgetStatus;
  decisionMaker: boolean;
  decisionTimelineDays: number;
  competitor: string;
  objections: SalesBriefObjection[];
  primaryConcern: string;
  recommendedApproach: string;
  nextQuestions: string[];
}

export interface SalesHandoffRecord {
  lead_id: string;
  status: HandoffStatus;
  score: number;
  brief: SalesBrief;
  handoff_reason: string;
  handed_off_at: string;
  meeting_status: MeetingStatus;
}

export interface HandoffEvaluation {
  handoff: boolean;
  scored: ScoreResult;
  brief: SalesBrief | null;
  followupState: LeadFollowupState;
  record: SalesHandoffRecord | null;
}

const PAIN_LABELS: Record<IntentSignals["painSpecificity"], string> = {
  high: "課題が具体的（単価・価格への不満が明確）",
  medium: "課題は認識している（改善意向あり）",
  low: "課題の具体性はまだ低い",
};

function userText(conversation: ConversationMessage[]): string {
  return conversation
    .filter((item) => item.role === "user")
    .map((item) => item.content)
    .join("\n");
}

function formatCompetitor(names: string[]): string {
  return names.length > 0 ? names.join("、") : "なし";
}

function mapObjections(events: ObjectionEventRow[]): SalesBriefObjection[] {
  const mapped: SalesBriefObjection[] = [];
  for (const event of events) {
    const type = event.objection_type || event.objection_key;
    if (!type) continue;
    mapped.push({
      type,
      message: event.customer_message || event.raw_text || "",
    });
  }
  return mapped;
}

function concernFromSignals(
  scored: ScoreResult,
  text: string,
  objections: SalesBriefObjection[]
): string {
  if (
    objections.some((item) => item.type === "too_expensive") ||
    /高(い|すぎ)|価格/.test(text)
  ) {
    return "価格";
  }
  if (objections.some((item) => item.type === "no_budget")) return "予算";
  if (objections.some((item) => item.type === "no_need_now")) return "今は不要";
  if (objections.some((item) => item.type === "think_it_over")) return "検討保留";
  if (
    objections.some((item) => item.type === "competitor_X") ||
    scored.intentSignals.competitor.length > 0
  ) {
    return "競合比較";
  }
  if (scored.primaryObjection === "price") return "価格";
  if (scored.primaryObjection === "budget") return "予算";
  if (scored.primaryObjection === "authority") return "決裁者";
  if (scored.primaryObjection === "timing") return "導入時期";
  if (scored.primaryObjection === "competitor") return "競合比較";
  return "特になし";
}

function recommendedApproach(concern: string, competitor: string): string {
  if (concern === "価格") {
    return "価格だけを下げる提案ではなく、導入効果・回収期間・競合比較軸を提示する。";
  }
  if (concern === "競合比較") {
    return `${competitor === "なし" ? "他社" : competitor}を批判せず、選定基準（精度・運用負荷・支援範囲）で差分を整理する。`;
  }
  if (concern === "予算") {
    return "今の予算有無で終了せず、予算化時期と最低条件を確認する。";
  }
  if (concern === "検討保留") {
    return "無理にクロージングせず、判断に足りない情報を特定する。";
  }
  return "HOT条件は揃っている。導入条件・決裁プロセス・開始希望日を先に確定する。";
}

function nextQuestions(concern: string): string[] {
  const questions = [
    "導入条件（対象範囲・期間）はどこまで決まっていますか？",
    "決裁プロセスに、ほかに確認が必要な方はいますか？",
    "開始希望日はいつですか？",
  ];
  if (concern === "価格") {
    questions.unshift("価格以外で、今回必ず満たしたい条件は何ですか？");
  }
  return questions.slice(0, 4);
}

function overviewFromLead(
  lead: SalesLeadRow,
  scored: ScoreResult
): string {
  const parts: string[] = [];
  if (lead.category_name) parts.push(lead.category_name);
  if (typeof lead.user_rate === "number") {
    parts.push(`現在単価 ${lead.user_rate.toLocaleString("ja-JP")}円`);
  }
  if (typeof lead.market_rate === "number") {
    parts.push(`市場目安 ${lead.market_rate.toLocaleString("ja-JP")}円`);
  }
  parts.push(
    scored.escalationStatus === "handed_off" ? "HOT" : scored.escalationStatus
  );
  return parts.join(" / ");
}

function deterministicSummary(
  scored: ScoreResult,
  concern: string,
  competitor: string
): string {
  const signals = scored.intentSignals;
  const bits = [
    scored.escalationStatus === "handed_off" ? "HOT" : `score=${scored.score}`,
    signals.budget === "confirmed" ? "予算確定" : `予算=${signals.budget}`,
    signals.decisionMaker ? "決裁者本人" : "決裁者は未確認",
    `導入希望${signals.decisionTimelineDays}日以内`,
  ];
  if (competitor !== "なし") bits.push(`競合${competitor}`);
  if (concern !== "特になし") bits.push(`主な懸念：${concern}`);
  return bits.join("。") + "。";
}

export function buildDeterministicSalesBrief(input: {
  lead: SalesLeadRow;
  conversation: ConversationMessage[];
  scored: ScoreResult;
  objections?: ObjectionEventRow[];
}): SalesBrief {
  const objections = mapObjections(input.objections ?? []);
  const text = userText(input.conversation);
  const signals = input.scored.intentSignals;
  const competitor = formatCompetitor(signals.competitor);
  const concern = concernFromSignals(input.scored, text, objections);
  const overview = overviewFromLead(input.lead, input.scored);

  return {
    leadId: input.lead.id,
    overview,
    summary: deterministicSummary(input.scored, concern, competitor),
    score: input.scored.score,
    escalationStatus: input.scored.escalationStatus,
    nextAction: input.scored.nextAction,
    pain: PAIN_LABELS[signals.painSpecificity],
    budget: signals.budget,
    decisionMaker: signals.decisionMaker,
    decisionTimelineDays: signals.decisionTimelineDays,
    competitor,
    objections,
    primaryConcern: concern,
    recommendedApproach: recommendedApproach(concern, competitor),
    nextQuestions: nextQuestions(concern),
  };
}

async function refineSummaryWithLlm(
  brief: SalesBrief,
  conversation: ConversationMessage[]
): Promise<SalesBrief> {
  const config = getCompatibleAiConfig();
  if (!config) return brief;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "営業担当向けに、JSONだけ返す。キーは summary, recommendedApproach。日本語。売込みやメール送信は書かない。",
          },
          {
            role: "user",
            content: JSON.stringify({
              brief,
              conversation: conversation.map((item) => ({
                role: item.role,
                content: item.content,
              })),
            }),
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return brief;
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") return brief;
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) return brief;
    const parsed = JSON.parse(content.slice(start, end + 1)) as {
      summary?: unknown;
      recommendedApproach?: unknown;
    };
    return {
      ...brief,
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : brief.summary,
      recommendedApproach:
        typeof parsed.recommendedApproach === "string" &&
        parsed.recommendedApproach.trim()
          ? parsed.recommendedApproach.trim()
          : brief.recommendedApproach,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown AI error";
    console.error("[ai/handoff] brief refine failed:", message);
    return brief;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateSalesBrief(input: {
  lead: SalesLeadRow;
  conversation: ConversationMessage[];
  scored: ScoreResult;
  objections?: ObjectionEventRow[];
}): Promise<SalesBrief> {
  const fallback = buildDeterministicSalesBrief(input);
  return refineSummaryWithLlm(fallback, input.conversation);
}

export function apiSalesBrief(brief: SalesBrief) {
  return {
    summary: brief.summary,
    pain: brief.pain,
    budget: brief.budget,
    decisionMaker: brief.decisionMaker,
    decisionTimelineDays: brief.decisionTimelineDays,
    competitor: brief.competitor,
    objections: brief.objections,
    recommendedApproach: brief.recommendedApproach,
    nextQuestions: brief.nextQuestions,
  };
}

export function mergeSalesHandoff(
  existing: { id: string; status: string; meeting_status: string } | null,
  next: SalesHandoffRecord
): { action: "insert" | "update"; status: HandoffStatus; meetingStatus: MeetingStatus } {
  if (!existing) {
    return { action: "insert", status: "ready", meetingStatus: "not_scheduled" };
  }

  const keepStatus =
    existing.status === "accepted" || existing.status === "completed"
      ? (existing.status as HandoffStatus)
      : "ready";
  const meetingStatus = isMeetingStatus(existing.meeting_status)
    ? existing.meeting_status
    : next.meeting_status;

  return { action: "update", status: keepStatus, meetingStatus };
}

function isMeetingStatus(value: string): value is MeetingStatus {
  return (
    value === "not_scheduled" ||
    value === "scheduled" ||
    value === "completed" ||
    value === "cancelled"
  );
}

export async function evaluateHandoff(input: {
  lead: SalesLeadRow;
  objections?: ObjectionEventRow[];
  followupState?: LeadFollowupState;
}): Promise<HandoffEvaluation> {
  const conversation = parseConversation(input.lead.conversation);
  const scored = scoreLead(
    scoreInputFromLeadConversation(input.lead, conversation)
  );
  const followupBase = input.followupState ?? emptyFollowupState(input.lead.id);

  if (scored.escalationStatus !== "handed_off") {
    return {
      handoff: false,
      scored,
      brief: null,
      followupState: followupBase,
      record: null,
    };
  }

  const brief = await generateSalesBrief({
    lead: input.lead,
    conversation,
    scored,
    objections: input.objections,
  });
  const handedOffAt = new Date().toISOString();

  return {
    handoff: true,
    scored,
    brief,
    followupState: stopFollowupState(followupBase, "handed_off"),
    record: {
      lead_id: input.lead.id,
      status: "ready",
      score: scored.score,
      brief,
      handoff_reason: "handed_off",
      handed_off_at: handedOffAt,
      meeting_status: "not_scheduled",
    },
  };
}
