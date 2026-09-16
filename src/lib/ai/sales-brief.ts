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
  type EscalationStatus,
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

  // Sales OS compatibility fields.
  pain: string;
  budget: "unknown";
  decisionMaker: boolean;
  decisionTimelineDays: number;
  competitor: string;

  objections: SalesBriefObjection[];
  primaryConcern: string;
  recommendedApproach: string;
  nextQuestions: string[];

  // Sales OS fields.
  companyName: string;
  industry: string;
  employeeCount: number | null;
  jobTitle: string;
  department: string;
  seniority: string;
  decisionMakerDistance: number;
  existingRelationship: boolean;
  replyReceived: boolean;
  meetingRequested: boolean;
  meetingScheduled: boolean;
  intentSignals: string[];
  relationshipSignals: string[];
  engagementSignals: string[];
  researchFindings: string[];
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

function userText(conversation: ConversationMessage[]): string {
  return conversation
    .filter((item) => item.role === "user")
    .map((item) => item.content)
    .join("\n");
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function arrayStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function extractSignals(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  const candidates = [
    record.signals,
    record.items,
    record.findings,
    record.events,
  ];

  for (const candidate of candidates) {
    const values = arrayStrings(candidate);
    if (values.length > 0) return values;
  }

  return [];
}

function mapObjections(events: ObjectionEventRow[]): SalesBriefObjection[] {
  return events
    .map((event) => {
      const type = event.objection_type || event.objection_key;
      if (!type) return null;

      return {
        type,
        message: event.customer_message || event.raw_text || "",
      };
    })
    .filter((item): item is SalesBriefObjection => item !== null);
}

function primaryConcernFromSalesState(
  scored: ScoreResult,
  objections: SalesBriefObjection[],
  text: string
): string {
  const objection = objections[0];

  if (objection?.message) {
    return objection.message;
  }

  if (scored.primaryObjection && scored.primaryObjection !== "none") {
    return scored.primaryObjection;
  }

  if (/担当者|決裁者|上長|稟議/.test(text)) {
    return "社内の意思決定構造";
  }

  if (/検討|時期|タイミング/.test(text)) {
    return "検討時期";
  }

  if (/競合|他社|既存/.test(text)) {
    return "既存サービス・競合";
  }

  return "次の営業アクション";
}

function recommendedApproach(
  lead: SalesLeadRow,
  scored: ScoreResult,
  concern: string
): string {
  const company =
    stringValue(lead.company_name) ||
    stringValue(lead.category_name) ||
    "対象企業";

  if (scored.nextAction) {
    return `${company}に対して、${scored.nextAction}を実行する。${concern}を確認しながら、次の接点を具体化する。`;
  }

  if (scored.intentSignals.intentScore >= 70) {
    return `${company}は意向シグナルを優先し、担当者確認から具体的な商談打診につなげる。`;
  }

  if (scored.intentSignals.relationshipScore >= 70) {
    return `${company}との既存接点を活用し、関係性を起点に担当者・決裁者への導線を作る。`;
  }

  return `${company}の企業情報・担当部署・意思決定構造を確認し、適切な担当者への初回接触を行う。`;
}

function nextQuestions(
  lead: SalesLeadRow,
  scored: ScoreResult
): string[] {
  const questions = [
    "現在のご担当部署とご担当者様を確認する",
    "社内での意思決定者・承認プロセスを確認する",
    "現在の検討時期と次回接点を確認する",
  ];

  if (!lead.job_title || !lead.department) {
    questions.unshift("担当者の役職・部署を特定する");
  }

  if (!lead.decision_maker) {
    questions.unshift("決裁者までの距離を確認する");
  }

  if (scored.intentSignals.intentScore >= 70) {
    questions.unshift("今動いている具体的なニーズ・導入理由を確認する");
  }

  return Array.from(new Set(questions)).slice(0, 5);
}

function buildOverview(
  lead: SalesLeadRow,
  scored: ScoreResult
): string {
  const company =
    stringValue(lead.company_name) ||
    stringValue(lead.category_name) ||
    "企業名未設定";

  const department = stringValue(lead.department);
  const title = stringValue(lead.job_title);

  const contact =
    [department, title].filter(Boolean).join(" / ") || "担当者未特定";

  return `${company} / ${contact} / Sales Score ${scored.score}`;
}

function deterministicSummary(
  lead: SalesLeadRow,
  scored: ScoreResult,
  conversation: ConversationMessage[]
): string {
  const text = userText(conversation);

  const signals = [
    `Fit ${scored.intentSignals.fitScore}`,
    `Intent ${scored.intentSignals.intentScore}`,
    `Engagement ${scored.intentSignals.engagementScore}`,
    `Relationship ${scored.intentSignals.relationshipScore}`,
    `Sales Readiness ${scored.intentSignals.salesReadinessScore}`,
  ];

  const state =
    scored.escalationStatus === "handed_off"
      ? "商談引き継ぎ対象"
      : `営業状態: ${scored.escalationStatus}`;

  const reaction = text
    ? "顧客との会話履歴あり"
    : "顧客との会話履歴なし";

  return `${state} / ${signals.join(" / ")} / ${reaction}`;
}

export function buildDeterministicSalesBrief(input: {
  lead: SalesLeadRow;
  conversation: ConversationMessage[];
  scored: ScoreResult;
  objections?: ObjectionEventRow[];
}): SalesBrief {
  const { lead, conversation, scored } = input;
  const objections = mapObjections(input.objections ?? []);

  const signals = scored.intentSignals;

  const intentSignals = [
    ...signals.signals,
    ...extractSignals(lead.intent_signals),
  ];

  const salesOsLead = lead as SalesLeadRow & { relationship_signals?: unknown; engagement_signals?: unknown; research_findings?: unknown };
  const relationshipSignals = extractSignals(salesOsLead.relationship_signals);
  const engagementSignals = extractSignals(salesOsLead.engagement_signals);
  const researchFindings = extractSignals(salesOsLead.research_findings);

  const concern = primaryConcernFromSalesState(
    scored,
    objections,
    userText(conversation)
  );

  return {
    leadId: lead.id,
    overview: buildOverview(lead, scored),
    summary: deterministicSummary(lead, scored, conversation),
    score: scored.score,
    escalationStatus: scored.escalationStatus,
    nextAction: scored.nextAction,

    // Compatibility values. Price diagnosis is no longer used.
    pain: "",
    budget: "unknown",
    decisionMaker: booleanValue(lead.decision_maker),
    decisionTimelineDays: 0,
    competitor: "",

    objections,
    primaryConcern: concern,
    recommendedApproach: recommendedApproach(
      lead,
      scored,
      concern
    ),
    nextQuestions: nextQuestions(lead, scored),

    companyName:
      stringValue(lead.company_name) ||
      stringValue(lead.category_name),
    industry: stringValue(lead.industry),
    employeeCount: numberValue(lead.employee_count),
    jobTitle: stringValue(lead.job_title),
    department: stringValue(lead.department),
    seniority: stringValue(lead.seniority),
    decisionMakerDistance:
      typeof lead.decision_maker_distance === "number"
        ? lead.decision_maker_distance
        : 0,
    existingRelationship: booleanValue(
      lead.existing_relationship
    ),
    replyReceived: booleanValue(lead.reply_received),
    meetingRequested: booleanValue(lead.meeting_requested),
    meetingScheduled: booleanValue(lead.meeting_scheduled),

    intentSignals,
    relationshipSignals,
    engagementSignals,
    researchFindings,
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
            content: `
You are the AI sales strategist inside PriceSense.

PriceSense is a Japanese B2B appointment-setting and sales workspace.

Use the following proven model structure:
- Apollo: prospecting, targeting, pipeline
- Clay: enrichment, AI research, scoring
- Sales Marker: Japanese intent and company signals
- Sansan: Japanese company/person/relationship context
- Instantly: outreach and follow-up

Do not perform price diagnosis.
Do not invent company facts.
Do not assume the contacted person is the final decision maker.
Account for Japanese decision structures such as departments, managers,
executives, internal approval and稟議.

Return JSON only:
{
  "summary": "...",
  "recommendedApproach": "..."
}

The summary must state the current sales situation.
The recommendedApproach must describe the next concrete sales action.
`,
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
      choices?: Array<{
        message?: {
          content?: unknown;
        };
      }>;
    };

    const content = payload.choices?.[0]?.message?.content;

    if (typeof content !== "string") return brief;

    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");

    if (start < 0 || end <= start) return brief;

    const parsed = JSON.parse(
      content.slice(start, end + 1)
    ) as {
      summary?: unknown;
      recommendedApproach?: unknown;
    };

    return {
      ...brief,
      summary:
        typeof parsed.summary === "string" &&
        parsed.summary.trim()
          ? parsed.summary.trim()
          : brief.summary,
      recommendedApproach:
        typeof parsed.recommendedApproach === "string" &&
        parsed.recommendedApproach.trim()
          ? parsed.recommendedApproach.trim()
          : brief.recommendedApproach,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown AI error";

    console.error(
      "[ai/handoff] sales brief refine failed:",
      message
    );

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
  return refineSummaryWithLlm(
    fallback,
    input.conversation
  );
}

export function apiSalesBrief(brief: SalesBrief) {
  return {
    summary: brief.summary,
    score: brief.score,
    escalationStatus: brief.escalationStatus,
    nextAction: brief.nextAction,
    overview: brief.overview,
    companyName: brief.companyName,
    industry: brief.industry,
    employeeCount: brief.employeeCount,
    jobTitle: brief.jobTitle,
    department: brief.department,
    seniority: brief.seniority,
    decisionMaker: brief.decisionMaker,
    decisionMakerDistance: brief.decisionMakerDistance,
    existingRelationship: brief.existingRelationship,
    replyReceived: brief.replyReceived,
    meetingRequested: brief.meetingRequested,
    meetingScheduled: brief.meetingScheduled,
    intentSignals: brief.intentSignals,
    relationshipSignals: brief.relationshipSignals,
    engagementSignals: brief.engagementSignals,
    researchFindings: brief.researchFindings,
    objections: brief.objections,
    primaryConcern: brief.primaryConcern,
    recommendedApproach: brief.recommendedApproach,
    nextQuestions: brief.nextQuestions,
  };
}

export function mergeSalesHandoff(
  existing: {
    id: string;
    status: string;
    meeting_status: string;
  } | null,
  next: SalesHandoffRecord
): {
  action: "insert" | "update";
  status: HandoffStatus;
  meetingStatus: MeetingStatus;
} {
  if (!existing) {
    return {
      action: "insert",
      status: "ready",
      meetingStatus: "not_scheduled",
    };
  }

  const keepStatus =
    existing.status === "accepted" ||
    existing.status === "completed"
      ? (existing.status as HandoffStatus)
      : "ready";

  const meetingStatus = isMeetingStatus(existing.meeting_status)
    ? existing.meeting_status
    : next.meeting_status;

  return {
    action: "update",
    status: keepStatus,
    meetingStatus,
  };
}

function isMeetingStatus(
  value: string
): value is MeetingStatus {
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
  const conversation = parseConversation(
    input.lead.conversation
  );

  const scored = scoreLead(
    scoreInputFromLeadConversation(
      input.lead,
      conversation
    )
  );

  const followupBase =
    input.followupState ??
    emptyFollowupState(input.lead.id);

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
    followupState: stopFollowupState(
      followupBase,
      "handed_off"
    ),
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


