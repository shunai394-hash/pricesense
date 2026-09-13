import { getCompatibleAiConfig } from "@/lib/server/env";
import type {
  BudgetStatus,
  IntentSignals,
  LeadScoreInput,
  PainSpecificity,
} from "@/lib/sales/scoring";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

/** Subset of public.leads columns used as sales context. */
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
}

export interface ExtractedIntentPatch {
  budget?: BudgetStatus;
  decisionMaker?: boolean;
  decisionTimelineDays?: number;
  painSpecificity?: PainSpecificity;
  competitor?: string[];
}

export interface SalesReplyContext {
  lead: SalesLeadRow;
  conversation: ConversationMessage[];
  scoreInput: LeadScoreInput;
}

const BUDGET_VALUES = new Set<BudgetStatus>([
  "confirmed",
  "unknown",
  "small",
  "none",
]);

const PAIN_VALUES = new Set<PainSpecificity>(["high", "medium", "low"]);

const DIAGNOSIS_LABELS: Record<string, string> = {
  significantly_low: "市場より大幅に低い",
  below_market: "市場より低い",
  at_market: "市場並み",
  above_market: "市場より高い",
  premium: "プレミアム帯",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatYen(value: number): string {
  return `${new Intl.NumberFormat("ja-JP").format(value)}円`;
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
  return [
    ...conversation,
    {
      role,
      content,
      createdAt: new Date().toISOString(),
    },
  ].slice(-40);
}

function parseBudget(value: unknown): BudgetStatus | null {
  return typeof value === "string" && BUDGET_VALUES.has(value as BudgetStatus)
    ? (value as BudgetStatus)
    : null;
}

function parsePain(value: unknown): PainSpecificity | null {
  return typeof value === "string" && PAIN_VALUES.has(value as PainSpecificity)
    ? (value as PainSpecificity)
    : null;
}

function parseCompetitorList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const names = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
  return names.map((item) => item.trim());
}

export function parseStoredScoreInput(
  value: unknown,
  lead: SalesLeadRow
): LeadScoreInput {
  const fallback = defaultScoreInputFromLead(lead);
  if (!isRecord(value)) return fallback;

  const budget = parseBudget(value.budget) ?? fallback.budget;
  const decisionMaker =
    typeof value.decisionMaker === "boolean"
      ? value.decisionMaker
      : fallback.decisionMaker;
  const decisionTimelineDays =
    typeof value.decisionTimelineDays === "number" &&
    Number.isFinite(value.decisionTimelineDays)
      ? value.decisionTimelineDays
      : fallback.decisionTimelineDays;
  const painSpecificity =
    parsePain(value.painSpecificity) ??
    parsePain(value.pain) ??
    fallback.painSpecificity;
  const competitor = parseCompetitorList(value.competitor) ?? fallback.competitor;
  const priceAdvantage =
    typeof value.priceAdvantage === "number" &&
    Number.isFinite(value.priceAdvantage)
      ? value.priceAdvantage
      : fallback.priceAdvantage;

  return {
    budget,
    decisionMaker,
    decisionTimelineDays,
    painSpecificity,
    competitor,
    priceAdvantage,
  };
}

export function defaultScoreInputFromLead(lead: SalesLeadRow): LeadScoreInput {
  const userRate = lead.user_rate;
  const marketRate = lead.market_rate;
  const priceAdvantage =
    typeof userRate === "number" && typeof marketRate === "number"
      ? Math.max(0, marketRate - userRate)
      : 0;

  let painSpecificity: PainSpecificity = "low";
  if (lead.diagnosis_level === "significantly_low") {
    painSpecificity = "high";
  } else if (lead.diagnosis_level === "below_market") {
    painSpecificity = "medium";
  }

  return {
    budget: "unknown",
    decisionMaker: false,
    decisionTimelineDays: 90,
    painSpecificity,
    competitor: [],
    priceAdvantage,
  };
}

export function mergeScoreInput(
  base: LeadScoreInput,
  patch: ExtractedIntentPatch
): LeadScoreInput {
  return {
    budget: patch.budget ?? base.budget,
    decisionMaker: patch.decisionMaker ?? base.decisionMaker,
    decisionTimelineDays:
      patch.decisionTimelineDays ?? base.decisionTimelineDays,
    painSpecificity: patch.painSpecificity ?? base.painSpecificity,
    competitor: patch.competitor ?? base.competitor,
    priceAdvantage: base.priceAdvantage,
  };
}

function userText(conversation: ConversationMessage[]): string {
  return conversation
    .filter((item) => item.role === "user")
    .map((item) => item.content)
    .join("\n");
}

function extractBudget(text: string): BudgetStatus | undefined {
  if (
    /予算[をはが]?(確保|承認|決裁済)|確保済|予算あり|予算はあり|予算は確保|予算を確保/.test(
      text
    )
  ) {
    return "confirmed";
  }
  if (/予算[がは]?(ない|無し|なし)|予算ゼロ|今は予算がない/.test(text)) {
    return "none";
  }
  if (/予算[がは]?(少ない|厳しい|小さい)|あまり予算/.test(text)) {
    return "small";
  }
  if (/予算.?(未定|わからない|これから検討|まだ検討)/.test(text)) {
    return "unknown";
  }
  return undefined;
}

function extractDecisionMaker(text: string): boolean | undefined {
  if (
    /私が決裁|自分が決裁|決裁者です|決裁者は私|決裁者は自分|決裁は私|決裁権がある|自分で決められる|私(が|は)決め/.test(
      text
    )
  ) {
    return true;
  }
  if (
    /決裁者ではない|私では決められない|上長|上司(の)?確認|社長確認|稟議|確認が必要/.test(
      text
    )
  ) {
    return false;
  }
  return undefined;
}

function extractTimelineDays(text: string): number | undefined {
  const week = text.match(/(\d+)\s*週間/);
  if (week) return Number(week[1]) * 7;

  const month = text.match(/(\d+)\s*(か|ヶ|カ)?月/);
  if (month) return Number(month[1]) * 30;

  const day = text.match(/(\d+)\s*日/);
  if (day) return Number(day[1]);

  if (/今週|すぐに|至急|なるべく早く/.test(text)) return 7;
  if (/今月/.test(text)) return 30;
  if (/来月/.test(text)) return 45;
  if (/今四半期/.test(text)) return 60;
  if (/来期|来年/.test(text)) return 180;
  return undefined;
}

function extractPain(text: string): PainSpecificity | undefined {
  if (
    /大幅に低い|市場より.{0,12}低|機会損失|案件が取れない|単価が安すぎ|困って(いる|ます)|価格が.{0,10}高|高いのが気|少し高い/.test(
      text
    )
  ) {
    return "high";
  }
  if (/上げたい|改善したい|不満|低いと思う|もっと欲しい/.test(text)) {
    return "medium";
  }
  return undefined;
}

function extractCompetitors(text: string): string[] | undefined {
  if (/競合.{0,6}(ない|なし)|他社.{0,6}(ない|なし)|比較していない/.test(text)) {
    return [];
  }

  const names: string[] = [];
  const patterns = [
    /競合(?:他社)?(?:は|が|:|：)\s*([^。\n]+)/g,
    /他社(?:は|が|:|：)\s*([^。\n]+)/g,
    /([A-Za-z0-9ぁ-んァ-ン一-龥]{1,20}社)も?(?:比較|検討|見て)/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = match[1] ?? "";
      for (const part of raw.split(/[、,と\/]/)) {
        const name = part.replace(/[ですますね]+$/g, "").trim();
        if (
          name.length >= 2 &&
          name.length <= 40 &&
          !/ない|なし|特に|^他社$/.test(name)
        ) {
          names.push(name);
        }
      }
    }
  }

  return names.length > 0 ? [...new Set(names)].slice(0, 10) : undefined;
}

/**
 * Pulls budget / decisionMaker / timeline / pain / competitor from conversation.
 * `pain` is mapped onto existing LeadScoreInput.painSpecificity.
 */
export function extractIntentPatch(
  conversation: ConversationMessage[]
): ExtractedIntentPatch {
  const text = userText(conversation);
  if (!text) return {};

  const patch: ExtractedIntentPatch = {};
  const budget = extractBudget(text);
  const decisionMaker = extractDecisionMaker(text);
  const decisionTimelineDays = extractTimelineDays(text);
  const painSpecificity = extractPain(text);
  const competitor = extractCompetitors(text);

  if (budget) patch.budget = budget;
  if (decisionMaker !== undefined) patch.decisionMaker = decisionMaker;
  if (decisionTimelineDays !== undefined) {
    patch.decisionTimelineDays = decisionTimelineDays;
  }
  if (painSpecificity) patch.painSpecificity = painSpecificity;
  if (competitor) patch.competitor = competitor;

  return patch;
}

function diagnosisSummary(lead: SalesLeadRow): string {
  const parts: string[] = [];
  if (lead.category_name) parts.push(`${lead.category_name}の診断`);
  if (typeof lead.user_rate === "number") {
    parts.push(`現在単価 ${formatYen(lead.user_rate)}`);
  }
  if (typeof lead.market_rate === "number") {
    parts.push(`市場目安 ${formatYen(lead.market_rate)}`);
  }
  if (lead.diagnosis_level && DIAGNOSIS_LABELS[lead.diagnosis_level]) {
    parts.push(`判定は「${DIAGNOSIS_LABELS[lead.diagnosis_level]}」`);
  }
  return parts.join("、");
}

function nextHearingQuestion(input: LeadScoreInput): string {
  if (input.budget === "unknown") {
    return "今回の単価改善について、ご予算の目安はすでに確保されていますか？（確保済み / これから検討 / 現時点ではない）";
  }
  if (!input.decisionMaker) {
    return "この件はご自身で決裁できますか？それとも上長・パートナーへの確認が必要ですか？";
  }
  if (input.decisionTimelineDays > 30) {
    return "検討の期限はどのくらいですか？目安で構いません（例: 2週間以内 / 今月中 / 未定）。";
  }
  if (input.painSpecificity === "low") {
    return "いま一番困っている点は何ですか？単価・稼働・案件の質など、具体的に教えてください。";
  }
  if (input.competitor.length === 0) {
    return "他に比較しているサービスや相談先はありますか？なければ「特にない」で大丈夫です。";
  }
  return "現状を踏まえると、次は具体的な改善案のすり合わせに進めそうです。ご希望の進め方はありますか？";
}

export function buildDeterministicReply(context: SalesReplyContext): string {
  const summary = diagnosisSummary(context.lead);
  const question = nextHearingQuestion(context.scoreInput);
  const lastUser = [...context.conversation]
    .reverse()
    .find((item) => item.role === "user");

  if (!lastUser) {
    const intro = summary
      ? `PriceSenseの営業担当です。${summary}を拝見しました。単価改善に向けて、最短の次アクションをご案内します。`
      : "PriceSenseの営業担当です。単価改善に向けて、最短の次アクションをご案内します。";
    return `${intro}\n\n${question}`;
  }

  return `ご共有ありがとうございます。内容を踏まえて優先度を整理しました。\n\n${question}`;
}

function buildSystemPrompt(context: SalesReplyContext): string {
  const summary = diagnosisSummary(context.lead);
  const signals = context.scoreInput;

  return [
    "あなたはPriceSenseのAI営業担当です。フリーランスの単価改善を支援します。",
    "丁寧で簡潔な日本語で返信し、1回につき質問は1つだけにしてください。",
    "メール送信・電話・訪問は行わず、それらを約束しないでください。",
    "APIキーや内部実装には触れないでください。",
    summary ? `診断コンテキスト: ${summary}` : "",
    `既知のintent: budget=${signals.budget}, decisionMaker=${signals.decisionMaker}, decisionTimelineDays=${signals.decisionTimelineDays}, painSpecificity=${signals.painSpecificity}, competitor=${signals.competitor.join(",") || "なし"}`,
    "未知の情報から順にヒアリングしてください（予算→決裁者→期限→課題→競合）。",
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
        temperature: 0.4,
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("[ai/respond] compatible API HTTP", response.status);
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
    console.error("[ai/respond] compatible API failed:", message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateSalesReply(
  context: SalesReplyContext
): Promise<string> {
  const fallback = buildDeterministicReply(context);

  const chatMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: buildSystemPrompt(context) }];

  if (context.conversation.length === 0) {
    chatMessages.push({
      role: "user",
      content: "初回連絡です。自己紹介と最初のヒアリング質問をください。",
    });
  } else {
    for (const item of context.conversation) {
      chatMessages.push({ role: item.role, content: item.content });
    }
  }

  const generated = await completeChat(chatMessages);
  return generated ?? fallback;
}

export function scoreInputFromLeadConversation(
  lead: SalesLeadRow,
  conversation: ConversationMessage[]
): LeadScoreInput {
  const base = parseStoredScoreInput(lead.intent_signals, lead);
  return mergeScoreInput(base, extractIntentPatch(conversation));
}

export type { IntentSignals };
