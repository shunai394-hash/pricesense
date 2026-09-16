import {
  getCompatibleAiConfig,
  getDealFollowupDelayHours,
  type FollowupDelayHours,
} from "@/lib/server/env";
import {
  detectObjection,
  generateObjectionReply,
  type ObjectionDetection,
} from "@/lib/ai/objections";
import {
  appendConversationMessage,
  parseConversation,
  scoreInputFromLeadConversation,
  type ConversationMessage,
  type SalesLeadRow,
} from "@/lib/ai/respond";
import { scoreLead, type ScoreResult } from "@/lib/sales/scoring";

export const DEAL_STATUSES = [
  "proposal_ready",
  "proposal_sent",
  "awaiting_response",
  "negotiating",
  "won",
  "lost",
] as const;

export type DealStatus = (typeof DEAL_STATUSES)[number];

export type DealLostReason =
  | "price"
  | "competitor"
  | "timing"
  | "budget"
  | "no_need"
  | "internal_approval"
  | "unknown";

export type DealFollowupReason =
  | "proposal_sent"
  | "no_response"
  | "objection"
  | "negotiation"
  | "final_check"
  | "manual_stop";

export const DEAL_PROBABILITY: Record<DealStatus, number> = {
  proposal_ready: 40,
  proposal_sent: 50,
  awaiting_response: 50,
  negotiating: 70,
  won: 100,
  lost: 0,
};

export interface SalesDealState {
  id: string;
  lead_id: string;
  meeting_id: string | null;
  proposal_id: string | null;
  quote_id: string | null;
  status: DealStatus;
  probability: number;
  expected_value: number | null;
  currency: string | null;
  next_action: string;
  next_followup_at: string | null;
  lost_reason: DealLostReason | null;
  won_at: string | null;
  lost_at: string | null;
}

export interface DealFollowupEventDraft {
  deal_id: string;
  sequence_number: number;
  message: string;
  reason: DealFollowupReason;
  status: DealStatus;
  scheduled_at: string | null;
}

export interface DealFollowupTurnResult {
  deal: SalesDealState;
  reply: string;
  conversation: ConversationMessage[];
  detection: ObjectionDetection;
  event: DealFollowupEventDraft;
  scored: ScoreResult;
}

export function isDealStatus(value: unknown): value is DealStatus {
  return typeof value === "string" && (DEAL_STATUSES as readonly string[]).includes(value);
}

export function probabilityForStatus(status: DealStatus): number {
  return DEAL_PROBABILITY[status];
}

export function isWonIntent(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  if (/買いたいと思|前向きです/.test(text) && !/契約します|発注します|購入します|合意しました/.test(text)) {
    return false;
  }
  if (/契約します|発注します|購入します|合意しました/.test(text)) return true;
  if (/(契約|発注|購入|導入)(を)?お願いします/.test(text)) return true;
  if (/^(それでは|これで|それで)?お願いします[。．]?$/.test(text)) return true;
  if (/進めてください/.test(text)) return true;
  return false;
}

export function isLostIntent(message: string): boolean {
  const text = message.trim();
  if (!text || isWonIntent(text)) return false;
  if (/検討して(います|ます)|一度検討/.test(text) && !/見送り|契約しません|他社に決め|不要です/.test(text)) {
    return false;
  }
  return /今回は見送り|見送ります|契約しません|他社に決めました|他社に決定|不要です/.test(
    text
  );
}

export function lostReasonFromMessage(message: string): DealLostReason {
  const text = message.trim();
  if (/他社に決め|他社に決定/.test(text)) return "competitor";
  if (/予算/.test(text)) return "budget";
  if (/稟議|社内承認|上長/.test(text)) return "internal_approval";
  if (/時期|タイミング|今は/.test(text) && /見送り|不要/.test(text) === false) {
    return "timing";
  }
  if (/高|価格/.test(text)) return "price";
  if (/不要|見送り/.test(text)) return "no_need";
  return "unknown";
}

function isNegotiatingMessage(message: string, detection: ObjectionDetection): boolean {
  if (
    detection.objectionType === "too_expensive" ||
    detection.objectionType === "competitor_X" ||
    detection.objectionType === "no_budget"
  ) {
    return true;
  }
  return /値引|条件|契約条件|導入時期|比較|交渉/.test(message);
}

export function resolveDealStatus(input: {
  message: string | null;
  requestedStatus: DealStatus | null;
  detection: ObjectionDetection;
  previous: DealStatus | null;
}): DealStatus {
  const message = input.message?.trim() || "";
  if (message && isWonIntent(message)) return "won";
  if (message && isLostIntent(message)) return "lost";
  if (input.previous === "won") return "won";
  if (input.previous === "lost") return "lost";
  if (message && isNegotiatingMessage(message, input.detection)) {
    return "negotiating";
  }
  if (input.requestedStatus === "proposal_sent" && !message) {
    return "awaiting_response";
  }
  if (
    message &&
    /検討して(います|ます)|検討します|一度検討/.test(message)
  ) {
    return "awaiting_response";
  }
  if (input.requestedStatus) return input.requestedStatus;
  if (input.previous) return input.previous;
  return "proposal_ready";
}

export function nextActionForStatus(status: DealStatus): string {
  switch (status) {
    case "proposal_ready":
      return "提案ドラフトを確認し、送付可否を判断する（自動送付しない）";
    case "proposal_sent":
      return "提案到達を確認し、返信待ちのフォロー日時を置く";
    case "awaiting_response":
      return "返信を待ち、必要なら状況確認の追客メッセージを用意する";
    case "negotiating":
      return "条件・懸念を整理する。値引きや未提示価格は約束しない";
    case "won":
      return "成約としてクローズし、契約手続きを人手で進める。追客停止";
    case "lost":
      return "失注としてクローズし、追客を停止する";
  }
}

export function eventReasonForStatus(
  status: DealStatus,
  detection: ObjectionDetection,
  hasMessage: boolean
): DealFollowupReason {
  if (status === "won" || status === "lost") return "final_check";
  if (detection.objectionType) return "objection";
  if (status === "negotiating") return "negotiation";
  if (status === "proposal_sent") return "proposal_sent";
  if (!hasMessage) return "no_response";
  return "no_response";
}

export function computeDealNextFollowupAt(
  status: DealStatus,
  sequenceNumber: number,
  from: Date = new Date(),
  delays: FollowupDelayHours = getDealFollowupDelayHours()
): Date | null {
  if (status === "won" || status === "lost") return null;
  const hours =
    sequenceNumber <= 1
      ? delays.followup1Hours
      : sequenceNumber === 2
        ? delays.followup2Hours
        : delays.followup3Hours;
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

function expectedValueFromQuote(
  quoteTotal: number | null | undefined,
  quoteCurrency: string | null | undefined
): { expected_value: number | null; currency: string | null } {
  if (typeof quoteTotal !== "number" || !Number.isFinite(quoteTotal)) {
    return { expected_value: null, currency: null };
  }
  return {
    expected_value: quoteTotal,
    currency: quoteCurrency && quoteCurrency.trim() ? quoteCurrency : null,
  };
}

export function emptyDealState(input: {
  id: string;
  leadId: string;
  meetingId?: string | null;
  proposalId?: string | null;
  quoteId?: string | null;
  quoteTotal?: number | null;
  quoteCurrency?: string | null;
}): SalesDealState {
  const value = expectedValueFromQuote(input.quoteTotal, input.quoteCurrency);
  return {
    id: input.id,
    lead_id: input.leadId,
    meeting_id: input.meetingId ?? null,
    proposal_id: input.proposalId ?? null,
    quote_id: input.quoteId ?? null,
    status: "proposal_ready",
    probability: probabilityForStatus("proposal_ready"),
    expected_value: value.expected_value,
    currency: value.currency,
    next_action: nextActionForStatus("proposal_ready"),
    next_followup_at: null,
    lost_reason: null,
    won_at: null,
    lost_at: null,
  };
}

export function parseDealState(row: unknown, fallbackLeadId: string): SalesDealState | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  if (typeof value.id !== "string") return null;
  const status = isDealStatus(value.status) ? value.status : "proposal_ready";
  const expected =
    typeof value.expected_value === "number" && Number.isFinite(value.expected_value)
      ? value.expected_value
      : value.expected_value === null
        ? null
        : typeof value.expected_value === "string" &&
            value.expected_value.trim() &&
            Number.isFinite(Number(value.expected_value))
          ? Number(value.expected_value)
          : null;
  return {
    id: value.id,
    lead_id: typeof value.lead_id === "string" ? value.lead_id : fallbackLeadId,
    meeting_id: typeof value.meeting_id === "string" ? value.meeting_id : null,
    proposal_id: typeof value.proposal_id === "string" ? value.proposal_id : null,
    quote_id: typeof value.quote_id === "string" ? value.quote_id : null,
    status,
    probability:
      typeof value.probability === "number" ? value.probability : probabilityForStatus(status),
    expected_value: expected,
    currency: typeof value.currency === "string" ? value.currency : null,
    next_action:
      typeof value.next_action === "string"
        ? value.next_action
        : nextActionForStatus(status),
    next_followup_at:
      typeof value.next_followup_at === "string" ? value.next_followup_at : null,
    lost_reason: isLostReason(value.lost_reason) ? value.lost_reason : null,
    won_at: typeof value.won_at === "string" ? value.won_at : null,
    lost_at: typeof value.lost_at === "string" ? value.lost_at : null,
  };
}

function isLostReason(value: unknown): value is DealLostReason {
  return (
    value === "price" ||
    value === "competitor" ||
    value === "timing" ||
    value === "budget" ||
    value === "no_need" ||
    value === "internal_approval" ||
    value === "unknown"
  );
}

function buildDeterministicDealReply(
  status: DealStatus,
  detection: ObjectionDetection
): string {
  if (status === "won") {
    return "ご契約の意思、承知しました。こちらで成約として進めます。手続きの詳細は担当からご案内します。金額や条件をここで新たに提示することはありません。";
  }
  if (status === "lost") {
    return "今回は見送りとのこと、承知しました。無理に追うことはしません。また必要になったら、単価の件から再開できます。";
  }
  if (detection.definition) {
    return detection.definition.fallbackReply;
  }
  if (status === "negotiating") {
    return "ご指摘ありがとうございます。条件面は整理します。こちらから値引きや未確認の金額を提示することはしません。いま一番確認したい条件はどれですか？";
  }
  if (status === "awaiting_response" || status === "proposal_sent") {
    return "ご提案の件、ご検討いただけるとのこと承知しました。今は無理に進めなくて大丈夫です。気になる点があれば、それだけ教えてください。";
  }
  return "提案内容の確認が整い次第、次の確認事項だけ共有ください。未確認の条件は約束しません。";
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
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown AI error";
    console.error("[ai/deal-followup] compatible API failed:", message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateDealReply(input: {
  lead: SalesLeadRow;
  conversation: ConversationMessage[];
  status: DealStatus;
  detection: ObjectionDetection;
}): Promise<string> {
  const fallback = buildDeterministicDealReply(input.status, input.detection);
  if (
    input.detection.definition &&
    (input.status === "negotiating" || input.detection.objectionType)
  ) {
    return generateObjectionReply({
      lead: input.lead,
      conversation: input.conversation,
      detection: input.detection,
    });
  }

  const generated = await completeChat([
    {
      role: "system",
      content: [
        "あなたはPriceSenseのAI営業担当です。提案後の追客返信を短く書きます。",
        "しつこくしない。虚偽を言わない。勝手に値引きしない。勝手に価格を提示しない。",
        "顧客が言っていない条件を約束しない。メール送信もしない。",
        `現在のdeal statusは ${input.status} です。`,
      ].join("\n"),
    },
    ...input.conversation.map((item) => ({
      role: item.role,
      content: item.content,
    })),
  ]);
  return generated ?? fallback;
}

export async function runDealFollowupTurn(input: {
  lead: SalesLeadRow;
  existingDeal: SalesDealState | null;
  requestedStatus?: DealStatus | null;
  message?: string | null;
  meetingId?: string | null;
  proposalId?: string | null;
  quoteId?: string | null;
  quoteTotal?: number | null;
  quoteCurrency?: string | null;
  sequenceNumber?: number;
  now?: Date;
  delays?: FollowupDelayHours;
}): Promise<DealFollowupTurnResult> {
  const now = input.now ?? new Date();
  const delays = input.delays ?? getDealFollowupDelayHours();
  const message = input.message?.trim() || null;
  let conversation = parseConversation(input.lead.conversation);
  if (message) {
    conversation = appendConversationMessage(conversation, "user", message);
  }

  const detection = message
    ? await detectObjection(message)
    : { objectionType: null, source: "none" as const, definition: null, type: null, confidence: 0, matchedKeywords: [], reason: "no objection detected" };

  const previous = input.existingDeal?.status ?? null;
  const status = resolveDealStatus({
    message,
    requestedStatus: input.requestedStatus ?? null,
    detection,
    previous,
  });

  const dealId = input.existingDeal?.id ?? crypto.randomUUID();
  const sequenceNumber = input.sequenceNumber ?? 1;
  const expected = expectedValueFromQuote(input.quoteTotal, input.quoteCurrency);
  const expected_value =
    expected.expected_value !== null
      ? expected.expected_value
      : (input.existingDeal?.expected_value ?? null);
  const currency =
    expected.expected_value !== null
      ? expected.currency
      : expected_value !== null
        ? input.existingDeal?.currency ?? null
        : null;

  const nextFollowup = computeDealNextFollowupAt(
    status,
    sequenceNumber,
    now,
    delays
  );
  const won_at =
    status === "won" ? (input.existingDeal?.won_at ?? now.toISOString()) : null;
  const lost_at =
    status === "lost" ? (input.existingDeal?.lost_at ?? now.toISOString()) : null;
  const lost_reason =
    status === "lost"
      ? message
        ? lostReasonFromMessage(message)
        : input.existingDeal?.lost_reason ?? "unknown"
      : null;

  const deal: SalesDealState = {
    id: dealId,
    lead_id: input.lead.id,
    meeting_id: input.meetingId ?? input.existingDeal?.meeting_id ?? null,
    proposal_id: input.proposalId ?? input.existingDeal?.proposal_id ?? null,
    quote_id: input.quoteId ?? input.existingDeal?.quote_id ?? null,
    status,
    probability: probabilityForStatus(status),
    expected_value,
    currency,
    next_action: nextActionForStatus(status),
    next_followup_at: nextFollowup ? nextFollowup.toISOString() : null,
    lost_reason,
    won_at,
    lost_at,
  };

  const reply = await generateDealReply({
    lead: input.lead,
    conversation,
    status,
    detection,
  });
  conversation = appendConversationMessage(conversation, "assistant", reply);

  const scored = scoreLead(
    scoreInputFromLeadConversation(
      { ...input.lead, conversation },
      conversation
    )
  );

  return {
    deal,
    reply,
    conversation,
    detection,
    scored,
    event: {
      deal_id: dealId,
      sequence_number: sequenceNumber,
      message: reply,
      reason: eventReasonForStatus(status, detection, Boolean(message)),
      status,
      scheduled_at: deal.next_followup_at,
    },
  };
}
