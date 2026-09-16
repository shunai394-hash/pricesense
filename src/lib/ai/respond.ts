import { getCompatibleAiConfig } from "@/lib/server/env";
import type {
  IntentSignals,
  LeadScoreInput,
} from "@/lib/sales/scoring";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

/**
 * Temporary compatibility shape for public.leads.
 * Legacy diagnosis columns remain in the database for now, but are not used
 * by the Sales OS logic.
 */
export interface SalesLeadRow {
  id: string;
  category_name: string | null;
  user_rate: number | null;
  market_rate: number | null;
  diagnosis_level: string | null;
  target_rate: number | null;
  intent_signals: unknown;
  conversation: unknown;
  handed_off_at: string | null;
  handoff_channel: string | null;

  company_name?: string | null;
  industry?: string | null;
  employee_count?: number | null;
  job_title?: string | null;
  department?: string | null;
  seniority?: string | null;
  decision_maker?: boolean | null;
  decision_maker_distance?: number | null;
  existing_relationship?: boolean | null;
  reply_received?: boolean | null;
  meeting_requested?: boolean | null;
  meeting_scheduled?: boolean | null;
  primary_objection?: string | null;
  next_action?: string | null;
}

export interface ExtractedIntentPatch {
  fitScore?: number;
  intentScore?: number;
  engagementScore?: number;
  relationshipScore?: number;
  salesReadinessScore?: number;

  companyName?: string;
  industry?: string;
  employeeCount?: number;
  jobTitle?: string;
  department?: string;
  seniority?: string;

  decisionMaker?: boolean;
  decisionMakerDistance?: number;
  existingRelationship?: boolean;
  replyReceived?: boolean;
  meetingRequested?: boolean;
  meetingScheduled?: boolean;

  primaryObjection?: string;
  nextAction?: string;
}

export interface SalesReplyContext {
  lead: SalesLeadRow;
  conversation: ConversationMessage[];
  scoreInput: LeadScoreInput;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function parseConversation(value: unknown): ConversationMessage[] {
  if (!Array.isArray(value)) return [];

  const messages: ConversationMessage[] = [];

  for (const item of value) {
    if (!isRecord(item)) continue;
    if (item.role !== "user" && item.role !== "assistant") continue;
    if (typeof item.content !== "string") continue;

    const content = item.content.trim();
    if (!content) continue;

    const createdAt =
      typeof item.createdAt === "string" && item.createdAt.length > 0
        ? item.createdAt
        : new Date().toISOString();

    messages.push({
      role: item.role,
      content,
      createdAt,
    });
  }

  return messages.slice(-40);
}

export function appendConversationMessage(
  conversation: ConversationMessage[],
  role: ConversationMessage["role"],
  content: string
): ConversationMessage[] {
  const normalized = content.trim();
  if (!normalized) return conversation.slice(-40);

  return [
    ...conversation,
    {
      role,
      content: normalized,
      createdAt: new Date().toISOString(),
    },
  ].slice(-40);
}

function parseSignals(value: unknown): IntentSignals | undefined {
  if (!isRecord(value)) return undefined;
  return value as unknown as IntentSignals;
}

function parseScore(value: unknown, fallback: number): number {
  const parsed = numberValue(value);
  return parsed === null ? fallback : clamp(parsed);
}

export function parseStoredScoreInput(
  value: unknown
): Partial<LeadScoreInput> {
  if (!isRecord(value)) return {};

  const result: Partial<LeadScoreInput> = {};

  if ("fitScore" in value) {
    result.fitScore = parseScore(value.fitScore, 0);
  }

  if ("intentScore" in value) {
    result.intentScore = parseScore(value.intentScore, 0);
  }

  if ("engagementScore" in value) {
    result.engagementScore = parseScore(value.engagementScore, 0);
  }

  if ("relationshipScore" in value) {
    result.relationshipScore = parseScore(value.relationshipScore, 0);
  }

  if ("salesReadinessScore" in value) {
    result.salesReadinessScore = parseScore(value.salesReadinessScore, 0);
  }

  if ("decisionMaker" in value && typeof value.decisionMaker === "boolean") {
    result.decisionMaker = value.decisionMaker;
  }

  if ("decisionMakerDistance" in value) {
    const distance = numberValue(value.decisionMakerDistance);
    if (distance !== null) result.decisionMakerDistance = Math.max(0, Math.round(distance));
  }

  if ("existingRelationship" in value && typeof value.existingRelationship === "boolean") {
    result.existingRelationship = value.existingRelationship;
  }

  if ("replyReceived" in value && typeof value.replyReceived === "boolean") {
    result.replyReceived = value.replyReceived;
  }

  if ("meetingRequested" in value && typeof value.meetingRequested === "boolean") {
    result.meetingRequested = value.meetingRequested;
  }

  if ("meetingScheduled" in value && typeof value.meetingScheduled === "boolean") {
    result.meetingScheduled = value.meetingScheduled;
  }

  if (typeof value.primaryObjection === "string") {
    result.primaryObjection = value.primaryObjection;
  }

  if (typeof value.nextAction === "string") {
    result.nextAction = value.nextAction;
  }

  return result;
}

export function defaultScoreInputFromLead(lead: SalesLeadRow): LeadScoreInput {
  const stored = parseStoredScoreInput(lead.intent_signals);
  const conversation = parseConversation(lead.conversation);

  const replyReceived =
    lead.reply_received ??
    conversation.some((message) => message.role === "user");

  const meetingRequested =
    lead.meeting_requested ??
    conversation.some((message) =>
      /(アポ|商談|打ち合わせ|面談|日程|schedule|meeting|appointment)/i.test(
        message.content
      )
    );

  const meetingScheduled = lead.meeting_scheduled ?? false;

  const existingRelationship = lead.existing_relationship ?? false;

  const decisionMaker =
    lead.decision_maker ??
    stored.decisionMaker ??
    false;

  const decisionMakerDistance =
    lead.decision_maker_distance ??
    stored.decisionMakerDistance ??
    (decisionMaker ? 0 : 2);

  return {
    fitScore: parseScore(stored.fitScore, lead.category_name ? 50 : 25),
    intentScore: parseScore(stored.intentScore, replyReceived ? 45 : 15),
    engagementScore: parseScore(
      stored.engagementScore,
      Math.min(100, conversation.length * 12)
    ),
    relationshipScore: parseScore(
      stored.relationshipScore,
      existingRelationship ? 70 : 0
    ),
    salesReadinessScore: parseScore(
      stored.salesReadinessScore,
      meetingScheduled ? 90 : meetingRequested ? 70 : replyReceived ? 45 : 10
    ),

    companyName: lead.company_name ?? undefined,
    industry: lead.industry,
    employeeCount: lead.employee_count,
    jobTitle: lead.job_title,
    department: lead.department,
    seniority: lead.seniority,

    intentSignals: parseSignals(lead.intent_signals),
    decisionMaker,
    decisionMakerDistance,
    existingRelationship,
    replyReceived,
    meetingRequested,
    meetingScheduled,

    primaryObjection: lead.primary_objection ?? undefined,
    nextAction: lead.next_action ?? undefined,
  };
}

export function mergeScoreInput(
  base: LeadScoreInput,
  patch: Partial<LeadScoreInput>
): LeadScoreInput {
  return {
    ...base,
    ...patch,

    fitScore: patch.fitScore === undefined ? base.fitScore : clamp(patch.fitScore),
    intentScore:
      patch.intentScore === undefined
        ? base.intentScore
        : clamp(patch.intentScore),
    engagementScore:
      patch.engagementScore === undefined
        ? base.engagementScore
        : clamp(patch.engagementScore),
    relationshipScore:
      patch.relationshipScore === undefined
        ? base.relationshipScore
        : clamp(patch.relationshipScore),
    salesReadinessScore:
      patch.salesReadinessScore === undefined
        ? base.salesReadinessScore
        : clamp(patch.salesReadinessScore),
  };
}

function userText(conversation: ConversationMessage[]): string {
  return conversation
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n")
    .slice(-6000);
}

function detectDecisionMaker(text: string): boolean | undefined {
  if (/(決裁者|決裁権|代表|社長|経営者|役員|最終判断)/i.test(text)) {
    return true;
  }

  if (/(担当者|窓口|実務担当|上司に確認|上長に確認|社内確認)/i.test(text)) {
    return false;
  }

  return undefined;
}

function detectDecisionMakerDistance(text: string): number | undefined {
  if (/(本人が決裁|私が決裁|私が判断|代表です|社長です)/i.test(text)) {
    return 0;
  }

  if (/(役員|部長|事業責任者|決裁者)/i.test(text)) {
    return 1;
  }

  if (/(上司|上長|社内確認|稟議|決裁を取る)/i.test(text)) {
    return 2;
  }

  if (/(担当者|窓口|現場)/i.test(text)) {
    return 3;
  }

  return undefined;
}

function detectMeetingRequest(text: string): boolean | undefined {
  if (/(アポ|商談|打ち合わせ|面談|日程調整|お時間|オンラインで|お話し)/i.test(text)) {
    return true;
  }

  return undefined;
}

function detectObjection(text: string): string | undefined {
  const patterns: Array<[RegExp, string]> = [
    [/(予算|費用|価格|金額)/i, "予算・費用"],
    [/(時期|タイミング|今は|来期|来月以降)/i, "時期・タイミング"],
    [/(競合|他社|既存サービス|既存業者)/i, "競合・既存取引"],
    [/(社内確認|上司|上長|稟議|決裁)/i, "社内承認"],
    [/(必要ない|間に合っている|結構です)/i, "ニーズ不足"],
    [/(資料だけ|メールで|まず資料)/i, "資料送付"],
  ];

  for (const [pattern, label] of patterns) {
    if (pattern.test(text)) return label;
  }

  return undefined;
}

function detectNextAction(text: string): string | undefined {
  if (/(日程|アポ|打ち合わせ|商談)/i.test(text)) {
    return "日程調整";
  }

  if (/(資料|メールで送|送付)/i.test(text)) {
    return "資料送付後フォロー";
  }

  if (/(社内確認|上司|上長|稟議|決裁)/i.test(text)) {
    return "社内確認後フォロー";
  }

  if (/(また連絡|後日|来月|来期|時期)/i.test(text)) {
    return "再接触";
  }

  if (text.trim()) return "次回接触";

  return undefined;
}

export function extractIntentPatch(
  conversation: ConversationMessage[]
): ExtractedIntentPatch {
  const text = userText(conversation);

  if (!text) return {};

  const decisionMaker = detectDecisionMaker(text);
  const decisionMakerDistance = detectDecisionMakerDistance(text);
  const meetingRequested = detectMeetingRequest(text);
  const primaryObjection = detectObjection(text);
  const nextAction = detectNextAction(text);

  const replyCount = conversation.filter(
    (message) => message.role === "user"
  ).length;

  const patch: ExtractedIntentPatch = {};

  if (replyCount > 0) {
    patch.replyReceived = true;
    patch.engagementScore = clamp(35 + replyCount * 10);
  }

  if (decisionMaker !== undefined) {
    patch.decisionMaker = decisionMaker;
  }

  if (decisionMakerDistance !== undefined) {
    patch.decisionMakerDistance = decisionMakerDistance;
    patch.relationshipScore = clamp(60 - decisionMakerDistance * 12);
  }

  if (meetingRequested !== undefined) {
    patch.meetingRequested = meetingRequested;
    patch.salesReadinessScore = meetingRequested ? 75 : 45;
  }

  if (primaryObjection) {
    patch.primaryObjection = primaryObjection;
  }

  if (nextAction) {
    patch.nextAction = nextAction;
  }

  if (
    /(導入したい|検討したい|興味がある|詳しく聞きたい|話を聞きたい|相談したい)/i.test(
      text
    )
  ) {
    patch.intentScore = 75;
  } else if (/(興味|検討|資料|情報)/i.test(text)) {
    patch.intentScore = 55;
  }

  if (/(社内で確認|稟議|上司に確認|決裁を取る)/i.test(text)) {
    patch.salesReadinessScore = Math.max(
      patch.salesReadinessScore ?? 0,
      60
    );
  }

  return patch;
}

function nextHearingQuestion(input: LeadScoreInput): string {
  if (!input.companyName) {
    return "まず対象企業名と、現在アプローチしている部署を教えてください。";
  }

  if (!input.department) {
    return "今回の商材に関係する部署・担当者はどこでしょうか？";
  }

  if ((input.decisionMakerDistance ?? 0) > 0) {
    return "現在の担当者から、最終的な決裁者まではどのような流れでしょうか？";
  }

  if (!input.replyReceived) {
    return "まずは相手企業に接触できているか、現在の状況を教えてください。";
  }

  if (!input.meetingRequested) {
    return "相手から具体的な関心や、話を聞きたいという反応はありましたか？";
  }

  if (!input.meetingScheduled) {
    return "アポイント候補日は提示済みでしょうか？";
  }

  return "次回の商談に向けて、相手が重視しているポイントは何でしょうか？";
}

export function buildDeterministicReply(context: SalesReplyContext): string {
  const patch = extractIntentPatch(context.conversation);
  const merged = mergeScoreInput(context.scoreInput, patch);

  if (merged.meetingScheduled) {
    return "ありがとうございます。商談前に、相手企業の決裁者・関係部署・確認事項を整理しておきましょう。";
  }

  if (merged.meetingRequested) {
    return "ありがとうございます。次は日程調整に進めます。候補日を2〜3つ提示できる状態にしましょう。";
  }

  if ((merged.decisionMakerDistance ?? 0) > 0) {
    return "承知しました。日本企業では担当者から上長・決裁者への社内確認が入ることが多いため、決裁までの流れを確認して次の接点を作りましょう。";
  }

  if (merged.replyReceived) {
    return "返信ありがとうございます。相手の関心点を確認し、次の接点を具体化しましょう。";
  }

  return nextHearingQuestion(merged);
}

function buildSystemPrompt(context: SalesReplyContext): string {
  const latestUserMessage =
    [...context.conversation]
      .reverse()
      .find((message) => message.role === "user")?.content ?? "";

  return [
    "あなたはPriceSenseのAI営業アシスタントです。",
    "目的は単価診断ではなく、日本企業向けの新規開拓とアポイント獲得を前進させることです。",
    "Apollo型のターゲティング、Clay型の企業調査、Sales Marker型の意向シグナル、Sansan型の人脈・接点情報、Instantly型のアウトリーチ運用を組み合わせた営業OSとして回答してください。",
    "架空の企業情報、担当者情報、シグナル、実績は絶対に作らないでください。",
    "日本企業では担当者と決裁者が異なる場合があるため、部署、役職、決裁者までの距離、社内確認、稟議を考慮してください。",
    "回答は日本語で簡潔にしてください。",
    "営業担当が次に取るべき行動を1つに絞ってください。",
    "相手への返信文を求められている場合は、そのまま送れる自然な日本語を作ってください。",
    `企業: ${context.lead.company_name ?? "未特定"}`,
    `部署: ${context.lead.department ?? "未特定"}`,
    `担当者: ${context.lead.job_title ?? "未特定"}`,
    `決裁者距離: ${context.scoreInput.decisionMakerDistance}`,
    `最新の相手メッセージ: ${latestUserMessage || "なし"}`,
  ].join("\n");
}

async function completeChat(
  systemPrompt: string,
  userMessage: string
): Promise<string | null> {
  const config = getCompatibleAiConfig();
  if (!config) return null;

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: unknown;
        };
      }>;
    };

    const content = data.choices?.[0]?.message?.content;

    return typeof content === "string" && content.trim()
      ? content.trim()
      : null;
  } catch {
    return null;
  }
}

export async function generateSalesReply(
  context: SalesReplyContext
): Promise<string> {
  const fallback = buildDeterministicReply(context);

  const latestUserMessage =
    [...context.conversation]
      .reverse()
      .find((message) => message.role === "user")?.content ?? "";

  if (!latestUserMessage) return fallback;

  const generated = await completeChat(
    buildSystemPrompt(context),
    latestUserMessage
  );

  return generated ?? fallback;
}

export function scoreInputFromLeadConversation(
  lead: SalesLeadRow,
  conversation: ConversationMessage[]
): LeadScoreInput {
  const base = defaultScoreInputFromLead({
    ...lead,
    conversation,
  });

  const patch = extractIntentPatch(conversation);

  return mergeScoreInput(base, patch);
}

export type { IntentSignals };

