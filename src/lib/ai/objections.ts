import { getCompatibleAiConfig } from "@/lib/server/env";
import type { ExtractedIntentPatch } from "@/lib/ai/respond";
import {
  appendConversationMessage,
  generateSalesReply,
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
  objectionType: ObjectionType;
  keywords: string[];
  responseStrategy: string;
  responsePlay: string;
  fallbackReply: string;
  enabled: boolean;
  modelVersion: string;
}

export interface ObjectionDetection {
  objectionType: ObjectionType | null;
  source: "deterministic" | "llm" | "none";
  definition: ObjectionDefinition | null;
}

export interface ObjectionTurnResult {
  conversation: ConversationMessage[];
  scored: ScoreResult;
  reply: string;
  detection: ObjectionDetection;
  event: {
    lead_id: string;
    objection_key: string | null;
    objection_type: string | null;
    customer_message: string;
    raw_text: string;
    response_play: string | null;
    source: string;
    metadata: Record<string, unknown>;
  };
}

const DETECTION_ORDER: ObjectionType[] = [
  "no_budget",
  "no_need_now",
  "too_expensive",
  "competitor_X",
  "think_it_over",
];

export const DEFAULT_OBJECTION_BANK: ObjectionDefinition[] = [
  {
    objectionType: "too_expensive",
    keywords: ["高い", "高すぎ", "ちょっと高い", "高いです", "高いので"],
    responseStrategy:
      "価格だけを押し切らず、費用対効果・期待できる成果・導入条件を確認する。",
    responsePlay: "confirm_roi_and_conditions",
    fallbackReply:
      "価格だけで判断を急がせるつもりはありません。費用対効果を揃えるために、今回いちばん回収したい成果と、導入の前提条件（期間・対象範囲）を教えてください。",
    enabled: true,
    modelVersion: OBJECTION_BANK_VERSION,
  },
  {
    objectionType: "think_it_over",
    keywords: ["検討します", "一度検討", "考えてみ", "検討させて", "検討したい"],
    responseStrategy: "無理にクロージングせず、判断に必要な情報を確認する。",
    responsePlay: "clarify_decision_info",
    fallbackReply:
      "ご検討いただけるとのこと、承知しました。今すぐ決めていただく必要はありません。判断に足りない情報は、比較材料・効果の見方・進め方のどれに近いですか？",
    enabled: true,
    modelVersion: OBJECTION_BANK_VERSION,
  },
  {
    objectionType: "competitor_X",
    keywords: ["他社", "競合"],
    responseStrategy: "競合批判は禁止。比較条件・選定基準を確認する。",
    responsePlay: "ask_selection_criteria",
    fallbackReply:
      "他社もご覧になっているのですね。他社批判はしません。選定で重視されている条件は、価格・精度・使いやすさ・サポートのどれが中心ですか？",
    enabled: true,
    modelVersion: OBJECTION_BANK_VERSION,
  },
  {
    objectionType: "no_budget",
    keywords: [
      "予算がない",
      "予算はありません",
      "予算がありません",
      "予算ない",
      "今は予算",
    ],
    responseStrategy:
      "予算の有無だけで終了させず、時期・予算確保予定・最低条件を確認する。",
    responsePlay: "ask_timing_and_minimum",
    fallbackReply:
      "現時点で予算がない旨、承知しました。ここで終了ではなく、次に予算を見直す時期と、最低限必要な条件だけ確認させてください。次の見直し時期はいつ頃ですか？",
    enabled: true,
    modelVersion: OBJECTION_BANK_VERSION,
  },
  {
    objectionType: "no_need_now",
    keywords: [
      "必要ありません",
      "必要ない",
      "今は必要",
      "今はいいです",
      "今は大丈夫",
    ],
    responseStrategy:
      "必要性を押し付けず、現在の課題・将来的なタイミングを確認する。",
    responsePlay: "ask_current_pain_and_future_timing",
    fallbackReply:
      "今は不要とのこと、承知しました。必要性を押し付けるつもりはありません。いま困っている点と、将来検討しやすくなるタイミングがあれば教えてください。",
    enabled: true,
    modelVersion: OBJECTION_BANK_VERSION,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseKeywordList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function isEnabledFlag(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

export function mergeObjectionBank(
  rows: unknown[] | null | undefined
): ObjectionDefinition[] {
  const byType = new Map(
    DEFAULT_OBJECTION_BANK.map((item) => [item.objectionType, item])
  );

  for (const row of rows ?? []) {
    if (!isRecord(row)) continue;
    const typeValue =
      (typeof row.objection_type === "string" && row.objection_type) ||
      (typeof row.objection_key === "string" && row.objection_key) ||
      "";
    if (!isObjectionType(typeValue)) continue;

    const current = byType.get(typeValue);
    if (!current) continue;

    const enabled = isEnabledFlag(
      row.enabled,
      isEnabledFlag(row.is_active, current.enabled)
    );
    const extraKeywords = parseKeywordList(row.keywords);
    const responseStrategy =
      typeof row.response_strategy === "string" && row.response_strategy.trim()
        ? row.response_strategy.trim()
        : current.responseStrategy;

    byType.set(typeValue, {
      ...current,
      enabled,
      keywords: [...new Set([...current.keywords, ...extraKeywords])],
      responseStrategy,
    });
  }

  return DETECTION_ORDER.map((type) => byType.get(type)).filter(
    (item): item is ObjectionDefinition => Boolean(item)
  );
}

export function isObjectionType(value: string): value is ObjectionType {
  return (OBJECTION_TYPES as readonly string[]).includes(value);
}

function matchesKeywords(message: string, keywords: string[]): boolean {
  return keywords.some((keyword) => keyword.length > 0 && message.includes(keyword));
}

export function detectObjectionType(
  message: string,
  bank: ObjectionDefinition[] = DEFAULT_OBJECTION_BANK
): ObjectionType | null {
  const text = message.trim();
  if (!text) return null;

  for (const type of DETECTION_ORDER) {
    const definition = bank.find((item) => item.objectionType === type);
    if (!definition || !definition.enabled) continue;
    if (type === "no_need_now" && /予算/.test(text)) continue;
    if (matchesKeywords(text, definition.keywords)) return type;
  }

  return null;
}

export function intentPatchFromObjection(
  objectionType: ObjectionType | null
): ExtractedIntentPatch {
  switch (objectionType) {
    case "no_budget":
      return { budget: "none" };
    case "no_need_now":
      return { decisionTimelineDays: 180 };
    case "competitor_X":
      return { competitor: ["他社"] };
    default:
      return {};
  }
}

function applyObjectionIntent(
  scoreInput: ReturnType<typeof scoreInputFromLeadConversation>,
  objectionType: ObjectionType | null
): ReturnType<typeof scoreInputFromLeadConversation> {
  const patch = intentPatchFromObjection(objectionType);
  if (objectionType === "competitor_X" && scoreInput.competitor.length > 0) {
    return scoreInput;
  }
  return mergeScoreInput(scoreInput, patch);
}

function buildObjectionSystemPrompt(
  definition: ObjectionDefinition,
  lead: SalesLeadRow
): string {
  const category = lead.category_name ? `職種: ${lead.category_name}` : "";
  return [
    "あなたはPriceSenseのAI営業担当です。顧客の反論に対応します。",
    "丁寧で簡潔な日本語。質問は1つだけ。",
    "メール送信・電話・訪問は行わず、約束もしないでください。",
    "競合他社の批判は禁止です。",
    category,
    `objection_type: ${definition.objectionType}`,
    `対応方針: ${definition.responseStrategy}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function completeChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string | null> {
  const config = getCompatibleAiConfig();
  if (!config) return null;

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
        temperature: 0.3,
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("[ai/objection] compatible API HTTP", response.status);
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown AI error";
    console.error("[ai/objection] compatible API failed:", message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function classifyObjectionWithLlm(
  message: string
): Promise<ObjectionType | null> {
  const generated = await completeChat([
    {
      role: "system",
      content:
        '顧客の反論を次のいずれか1つに分類し、JSONだけ返してください: {"objectionType":"too_expensive"|"think_it_over"|"competitor_X"|"no_budget"|"no_need_now"|null}',
    },
    { role: "user", content: message },
  ]);
  if (!generated) return null;

  try {
    const jsonStart = generated.indexOf("{");
    const jsonEnd = generated.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd <= jsonStart) return null;
    const parsed = JSON.parse(generated.slice(jsonStart, jsonEnd + 1)) as {
      objectionType?: unknown;
    };
    if (parsed.objectionType === null) return null;
    if (
      typeof parsed.objectionType === "string" &&
      isObjectionType(parsed.objectionType)
    ) {
      return parsed.objectionType;
    }
  } catch {
    return null;
  }

  return null;
}

export async function detectObjection(
  message: string,
  bank: ObjectionDefinition[] = DEFAULT_OBJECTION_BANK
): Promise<ObjectionDetection> {
  const deterministic = detectObjectionType(message, bank);
  if (deterministic) {
    return {
      objectionType: deterministic,
      source: "deterministic",
      definition:
        bank.find((item) => item.objectionType === deterministic) ?? null,
    };
  }

  const llmType = await classifyObjectionWithLlm(message);
  if (llmType) {
    const definition = bank.find(
      (item) => item.objectionType === llmType && item.enabled
    );
    if (definition) {
      return { objectionType: llmType, source: "llm", definition };
    }
  }

  return { objectionType: null, source: "none", definition: null };
}

export async function generateObjectionReply(options: {
  lead: SalesLeadRow;
  conversation: ConversationMessage[];
  detection: ObjectionDetection;
}): Promise<string> {
  const { lead, conversation, detection } = options;
  if (!detection.definition) {
    const scoreInput = scoreInputFromLeadConversation(lead, conversation);
    return generateSalesReply({ lead, conversation, scoreInput });
  }

  const fallback = detection.definition.fallbackReply;
  const chatMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    {
      role: "system",
      content: buildObjectionSystemPrompt(detection.definition, lead),
    },
  ];

  for (const item of conversation) {
    chatMessages.push({ role: item.role, content: item.content });
  }

  const generated = await completeChat(chatMessages);
  return generated ?? fallback;
}

export async function runObjectionTurn(
  lead: SalesLeadRow,
  message: string,
  bank: ObjectionDefinition[] = DEFAULT_OBJECTION_BANK
): Promise<ObjectionTurnResult> {
  let conversation = parseConversation(lead.conversation);
  conversation = appendConversationMessage(conversation, "user", message);

  const detection = await detectObjection(message, bank);
  const scoreInput = applyObjectionIntent(
    scoreInputFromLeadConversation(lead, conversation),
    detection.objectionType
  );
  const scored = scoreLead(scoreInput);
  const reply = await generateObjectionReply({
    lead,
    conversation,
    detection,
  });
  conversation = appendConversationMessage(conversation, "assistant", reply);

  return {
    conversation,
    scored,
    reply,
    detection,
    event: {
      lead_id: lead.id,
      objection_key: detection.objectionType,
      objection_type: detection.objectionType,
      customer_message: message,
      raw_text: message,
      response_play: detection.definition?.responsePlay ?? null,
      source: "ai_objection",
      metadata: {
        detection: detection.source,
        bankVersion: OBJECTION_BANK_VERSION,
      },
    },
  };
}
