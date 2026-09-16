import { getCompatibleAiConfig } from "@/lib/server/env";
import type { ExtractedIntentPatch } from "@/lib/ai/respond";
import {
  appendConversationMessage,
  mergeScoreInput,
  parseConversation,
  scoreInputFromLeadConversation,
  type ConversationMessage,
  type SalesLeadRow,
} from "@/lib/ai/respond";
import { scoreLead, type ScoreResult } from "@/lib/sales/scoring";

export const OBJECTION_BANK_VERSION = "ps-objection-bank-v1";

export const OBJECTION_TYPES = [
  "too_expensive",
  "think_it_over",
  "competitor_X",
  "no_budget",
  "no_need_now",
] as const;

export type ObjectionType = (typeof OBJECTION_TYPES)[number];

export interface ObjectionDefinition {
  type: ObjectionType;
  label: string;
  description: string;
  keywords: string[];
  enabled: boolean;
  fallbackReply: string;
}

export interface ObjectionDetection {
  objectionType: ObjectionType | null;
  source: "keyword" | "llm" | "none";
  definition: ObjectionDefinition | null;
  type: ObjectionType | null;
  confidence: number;
  matchedKeywords: string[];
  reason: string;
}

export interface ObjectionEvent {
  lead_id: string;
  objection_key: string | null;
  objection_type: ObjectionType | null;
  customer_message?: string;
  raw_text: string;
  response_play: string;
  source: string;
  metadata: Record<string, unknown>;
}

export interface ObjectionTurnResult {
  detection: ObjectionDetection;
  reply: string;
  nextAction: string;
  scored: ScoreResult;
  score: ScoreResult;
  intentPatch: ExtractedIntentPatch;
  conversation: ConversationMessage[];
  event: ObjectionEvent;
}

const DETECTION_ORDER: ObjectionType[] = [
  "no_budget",
  "competitor_X",
  "no_need_now",
  "think_it_over",
  "too_expensive",
];

export const DEFAULT_OBJECTION_BANK: ObjectionDefinition[] = [
  {
    type: "too_expensive",
    label: "価格が高い",
    description: "価格や費用対効果への懸念。",
    keywords: ["高い", "価格", "費用", "予算に合わ", "コスト"],
    enabled: true,
    fallbackReply:
      "ご懸念ありがとうございます。価格だけでなく、導入効果や社内での判断基準も含めて確認できればと思います。まず必要な条件をお聞かせいただけますでしょうか。",
  },
  {
    type: "think_it_over",
    label: "検討したい",
    description: "社内検討や時間を置くことを希望。",
    keywords: ["検討", "考え", "持ち帰", "社内で", "また連絡"],
    enabled: true,
    fallbackReply:
      "承知しました。社内でのご検討に必要な情報を整理してお送りします。あわせて、次回確認させていただく時期だけ決めておけますでしょうか。",
  },
  {
    type: "competitor_X",
    label: "競合あり",
    description: "他社サービスや既存ベンダーとの比較。",
    keywords: ["他社", "競合", "既存", "別の会社", "他のサービス"],
    enabled: true,
    fallbackReply:
      "承知しました。既存サービスとの比較になると思いますので、まず現在重視されている判断基準を確認させてください。",
  },
  {
    type: "no_budget",
    label: "予算なし",
    description: "現時点で予算が確保されていない。",
    keywords: ["予算がない", "予算なし", "予算が取れ", "予算がないため", "budget"],
    enabled: true,
    fallbackReply:
      "承知しました。現時点での予算状況を踏まえ、導入時期や社内計画を確認できればと思います。次に予算を検討される時期だけ教えていただけますでしょうか。",
  },
  {
    type: "no_need_now",
    label: "今は必要ない",
    description: "現時点では導入や相談の必要性が低い。",
    keywords: ["必要ない", "今は不要", "今じゃない", "時期ではない", "まだ早い"],
    enabled: true,
    fallbackReply:
      "承知しました。現時点では優先度が高くないとのことですね。今後必要になる可能性がある時期や条件だけ確認させていただけますでしょうか。",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseKeywordList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function isEnabledFlag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function mergeObjectionBank(
  custom: unknown,
): ObjectionDefinition[] {
  if (!Array.isArray(custom)) return DEFAULT_OBJECTION_BANK;

  const merged = new Map<ObjectionType, ObjectionDefinition>(
    DEFAULT_OBJECTION_BANK.map((item) => [item.type, item]),
  );

  for (const value of custom) {
    if (!isRecord(value)) continue;

    const type = value.type;
    if (typeof type !== "string" || !isObjectionType(type)) continue;

    const current = merged.get(type);
    if (!current) continue;

    const keywords = parseKeywordList(value.keywords);

    merged.set(type, {
      ...current,
      label:
        typeof value.label === "string" ? value.label : current.label,
      description:
        typeof value.description === "string"
          ? value.description
          : current.description,
      keywords: keywords.length > 0 ? keywords : current.keywords,
      enabled: isEnabledFlag(value.enabled, current.enabled),
      fallbackReply:
        typeof value.fallbackReply === "string"
          ? value.fallbackReply
          : current.fallbackReply,
    });
  }

  return Array.from(merged.values());
}

export function isObjectionType(value: string): value is ObjectionType {
  return (OBJECTION_TYPES as readonly string[]).includes(value);
}

function matchesKeywords(message: string, keywords: string[]): string[] {
  const normalized = message.toLowerCase();
  return keywords.filter((keyword) =>
    normalized.includes(keyword.toLowerCase()),
  );
}

function makeDetection(
  objectionType: ObjectionType | null,
  source: "keyword" | "llm" | "none",
  definition: ObjectionDefinition | null,
  confidence: number,
  matchedKeywords: string[],
  reason: string,
): ObjectionDetection {
  return {
    objectionType,
    source,
    definition,
    type: objectionType,
    confidence,
    matchedKeywords,
    reason,
  };
}

export function detectObjectionType(
  message: string,
  bank: ObjectionDefinition[] = DEFAULT_OBJECTION_BANK,
): ObjectionDetection {
  const text = message.trim();

  if (!text) {
    return makeDetection(
      null,
      "none",
      null,
      0,
      [],
      "empty message",
    );
  }

  for (const type of DETECTION_ORDER) {
    const definition = bank.find(
      (item) => item.type === type && item.enabled,
    );
    if (!definition) continue;

    const matchedKeywords = matchesKeywords(text, definition.keywords);

    if (matchedKeywords.length > 0) {
      return makeDetection(
        type,
        "keyword",
        definition,
        Math.min(0.55 + matchedKeywords.length * 0.15, 0.95),
        matchedKeywords,
        definition.description,
      );
    }
  }

  return makeDetection(
    null,
    "none",
    null,
    0,
    [],
    "no objection keyword matched",
  );
}

export function intentPatchFromObjection(
  objectionType: ObjectionType | null,
): ExtractedIntentPatch {
  switch (objectionType) {
    case "no_budget":
      return { intentScore: 35 };
    case "no_need_now":
      return { intentScore: 25 };
    case "competitor_X":
      return { intentScore: 45 };
    case "too_expensive":
      return { intentScore: 50 };
    case "think_it_over":
      return { intentScore: 55 };
    default:
      return {};
  }
}

function buildObjectionSystemPrompt(
  detection: ObjectionDetection,
): string {
  return [
    "You are PriceSense, a Japanese B2B sales appointment-setting assistant.",
    "Handle the customer's objection professionally and briefly.",
    "Do not invent company facts, product facts, pricing, or decision-maker information.",
    "Do not treat the current contact as the final decision-maker without evidence.",
    "Respect Japanese approval structures and internal review processes.",
    "The goal is one appropriate next action, not aggressive closing.",
    `Detected objection: ${detection.objectionType ?? "unknown"}`,
    `Reason: ${detection.reason}`,
  ].join("\n");
}

async function completeChat(
  systemPrompt: string,
  userMessage: string,
): Promise<string | null> {
  const config = getCompatibleAiConfig();

  if (!config?.apiKey) return null;

  try {
    const response = await fetch(
      `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      },
    );

    if (!response.ok) return null;

    const data: unknown = await response.json();

    if (!isRecord(data)) return null;

    const choices = data.choices;
    if (!Array.isArray(choices) || choices.length === 0) return null;

    const first = choices[0];
    if (!isRecord(first)) return null;

    const message = first.message;
    if (!isRecord(message)) return null;

    return typeof message.content === "string"
      ? message.content.trim()
      : null;
  } catch {
    return null;
  }
}

async function classifyObjectionWithLlm(
  message: string,
  detection: ObjectionDetection,
  bank: ObjectionDefinition[],
): Promise<ObjectionDetection> {
  if (detection.objectionType) return detection;

  const prompt = [
    "Classify the Japanese sales response into exactly one of:",
    OBJECTION_TYPES.join(", "),
    "or none.",
    'Return JSON only: {"type":"...","confidence":0.0,"reason":"..."}',
    `Message: ${message}`,
  ].join("\n");

  const result = await completeChat(
    buildObjectionSystemPrompt(detection),
    prompt,
  );

  if (!result) return detection;

  try {
    const parsed: unknown = JSON.parse(result);
    if (!isRecord(parsed)) return detection;

    const type = parsed.type;
    const confidence = parsed.confidence;

    if (
      typeof type !== "string" ||
      !isObjectionType(type) ||
      typeof confidence !== "number"
    ) {
      return detection;
    }

    const definition =
      bank.find((item) => item.type === type) ?? null;

    return makeDetection(
      type,
      "llm",
      definition,
      Math.max(0, Math.min(1, confidence)),
      [],
      typeof parsed.reason === "string"
        ? parsed.reason
        : "LLM classification",
    );
  } catch {
    return detection;
  }
}

export async function detectObjection(
  message: string,
  bank: ObjectionDefinition[] = DEFAULT_OBJECTION_BANK,
): Promise<ObjectionDetection> {
  const deterministic = detectObjectionType(message, bank);

  if (deterministic.objectionType) return deterministic;

  return classifyObjectionWithLlm(message, deterministic, bank);
}

export async function generateObjectionReply(options: {
  lead: SalesLeadRow;
  message?: string;
  detection?: ObjectionDetection;
  conversation?: ConversationMessage[];
}): Promise<string> {
  const message = options.message ?? "";
  const detection =
    options.detection ??
    (await detectObjection(message));

  const systemPrompt = buildObjectionSystemPrompt(detection);

  const aiReply = await completeChat(
    systemPrompt,
    [
      "Write the next Japanese B2B sales reply.",
      "Keep it concise.",
      "Acknowledge the objection.",
      "Do not pressure the customer.",
      "End with one clear next step.",
      options.conversation
        ? `Conversation: ${JSON.stringify(options.conversation)}`
        : "",
      `Customer message: ${message}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  if (aiReply) return aiReply;

  return (
    detection.definition?.fallbackReply ??
    "承知しました。状況を確認したうえで、次の適切な進め方をご相談させてください。"
  );
}

export async function runObjectionTurn(options: {
  lead: SalesLeadRow;
  message?: string;
  bank?: ObjectionDefinition[];
}): Promise<ObjectionTurnResult> {
  const bank = options.bank ?? DEFAULT_OBJECTION_BANK;
  const message = options.message ?? "";

  const detection = await detectObjection(message, bank);
  const intentPatch = intentPatchFromObjection(
    detection.objectionType,
  );

  const previousConversation = parseConversation(
    options.lead.conversation,
  );

  const conversation = appendConversationMessage(
    previousConversation,
    "user",
    message,
  );

  const baseScoreInput = scoreInputFromLeadConversation(
    options.lead,
    conversation,
  );

  const scoreInput = mergeScoreInput(
    baseScoreInput,
    intentPatch,
  );

  const scored = scoreLead(scoreInput);

  const reply = await generateObjectionReply({
    lead: options.lead,
    message: options.message,
    detection,
    conversation,
  });

  const nextAction =
    detection.objectionType === "no_budget"
      ? "予算時期を確認して再アプローチ時期を設定"
      : detection.objectionType === "no_need_now"
        ? "導入タイミングを確認してフォローアップ"
        : detection.objectionType === "competitor_X"
          ? "既存サービスと比較する判断基準を確認"
          : detection.objectionType === "think_it_over"
            ? "社内検討に必要な情報と次回確認日を設定"
            : detection.objectionType === "too_expensive"
              ? "費用対効果と導入条件を確認"
              : "担当者の反応を確認して次の営業アクションを設定";

  const event: ObjectionEvent = {
    lead_id: options.lead.id,
    objection_key: detection.objectionType,
    objection_type: detection.objectionType,
    customer_message: options.message,
    raw_text: message,
    response_play: nextAction,
    source: detection.source,
    metadata: {
      confidence: detection.confidence,
      matchedKeywords: detection.matchedKeywords,
      reason: detection.reason,
      modelVersion: scored.modelVersion,
      objectionBankVersion: OBJECTION_BANK_VERSION,
    },
  };

  return {
    detection,
    reply,
    nextAction,
    scored,
    score: scored,
    intentPatch,
    conversation,
    event,
  };
}



