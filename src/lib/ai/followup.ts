import {
  getCompatibleAiConfig,
  getFollowupDelayHours,
  type FollowupDelayHours,
} from "@/lib/server/env";
import {
  appendConversationMessage,
  parseConversation,
  scoreInputFromLeadConversation,
  type ConversationMessage,
  type SalesLeadRow,
} from "@/lib/ai/respond";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { scoreLead, type ScoreResult } from "@/lib/sales/scoring";

export const MAX_FOLLOWUPS = 3;

export type FollowupStopReason =
  | "customer_replied"
  | "handed_off"
  | "closed"
  | "max_followups"
  | "manual_stop";

export type FollowupStatus = "idle" | "scheduled" | "stopped" | "closed";

export type FollowupLeadContext = SalesLeadRow & {
  score?: number | null;
  escalation_status?: string | null;
  next_action?: string | null;
};

export interface LeadFollowupState {
  lead_id: string;
  followup_status: FollowupStatus;
  followup_count: number;
  next_followup_at: string | null;
  last_contacted_at: string | null;
  stopped_at: string | null;
  stop_reason: FollowupStopReason | null;
  max_followups: number;
}

export interface FollowupEventDraft {
  lead_id: string;
  sequence_number: number;
  message: string;
  status: "generated";
  scheduled_at: string | null;
  sent_at: string;
  stop_reason: null;
}

export interface FollowupTurnResult {
  sent: boolean;
  reply: string | null;
  conversation: ConversationMessage[];
  state: LeadFollowupState;
  scored: ScoreResult;
  event: FollowupEventDraft | null;
  skipReason: string | null;
}

export function emptyFollowupState(leadId: string): LeadFollowupState {
  return {
    lead_id: leadId,
    followup_status: "idle",
    followup_count: 0,
    next_followup_at: null,
    last_contacted_at: null,
    stopped_at: null,
    stop_reason: null,
    max_followups: MAX_FOLLOWUPS,
  };
}

export function parseFollowupState(
  leadId: string,
  row: unknown
): LeadFollowupState {
  const base = emptyFollowupState(leadId);
  if (!row || typeof row !== "object") return base;

  const value = row as Record<string, unknown>;
  const status = value.followup_status;
  const stopReason = value.stop_reason;
  const count =
    typeof value.followup_count === "number" && value.followup_count >= 0
      ? Math.floor(value.followup_count)
      : 0;
  const max =
    typeof value.max_followups === "number" && value.max_followups > 0
      ? Math.floor(value.max_followups)
      : MAX_FOLLOWUPS;

  return {
    lead_id: leadId,
    followup_status: isFollowupStatus(status) ? status : base.followup_status,
    followup_count: count,
    next_followup_at:
      typeof value.next_followup_at === "string" ? value.next_followup_at : null,
    last_contacted_at:
      typeof value.last_contacted_at === "string"
        ? value.last_contacted_at
        : null,
    stopped_at: typeof value.stopped_at === "string" ? value.stopped_at : null,
    stop_reason: isStopReason(stopReason) ? stopReason : null,
    max_followups: max,
  };
}

function isFollowupStatus(value: unknown): value is FollowupStatus {
  return (
    value === "idle" ||
    value === "scheduled" ||
    value === "stopped" ||
    value === "closed"
  );
}

function isStopReason(value: unknown): value is FollowupStopReason {
  return (
    value === "customer_replied" ||
    value === "handed_off" ||
    value === "closed" ||
    value === "max_followups" ||
    value === "manual_stop"
  );
}

export function addHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function computeInitialFollowupAt(
  from: Date = new Date(),
  delays: FollowupDelayHours = getFollowupDelayHours()
): Date {
  return addHours(from, delays.followup1Hours);
}

/** After sending follow-up N, when the next one is due. Null after #3. */
export function computeNextFollowupAt(
  countAfterSend: number,
  from: Date = new Date(),
  delays: FollowupDelayHours = getFollowupDelayHours()
): Date | null {
  if (countAfterSend >= MAX_FOLLOWUPS) return null;
  if (countAfterSend === 1) return addHours(from, delays.followup2Hours);
  if (countAfterSend === 2) return addHours(from, delays.followup3Hours);
  return addHours(from, delays.followup1Hours);
}

export function stopFollowupState(
  state: LeadFollowupState,
  reason: FollowupStopReason,
  at: Date = new Date()
): LeadFollowupState {
  if (state.stop_reason === "handed_off" && reason !== "handed_off") {
    return {
      ...state,
      followup_status: "stopped",
      next_followup_at: null,
    };
  }

  return {
    ...state,
    followup_status: reason === "closed" ? "closed" : "stopped",
    next_followup_at: null,
    stopped_at: state.stopped_at ?? at.toISOString(),
    stop_reason: reason,
  };
}

export function shouldSendFollowup(
  state: LeadFollowupState,
  options: {
    escalationStatus?: string | null;
    now?: Date;
  } = {}
): { ok: boolean; reason: string | null } {
  const now = options.now ?? new Date();

  if (
    options.escalationStatus === "handed_off" ||
    state.stop_reason === "handed_off"
  ) {
    return { ok: false, reason: "handed_off" };
  }

  if (state.followup_status === "stopped") {
    return { ok: false, reason: state.stop_reason ?? "stopped" };
  }

  if (state.followup_status === "closed") {
    return { ok: false, reason: "closed" };
  }

  if (state.followup_count >= state.max_followups) {
    return { ok: false, reason: "max_followups" };
  }

  if (state.next_followup_at) {
    const due = Date.parse(state.next_followup_at);
    if (Number.isFinite(due) && due > now.getTime()) {
      return { ok: false, reason: "not_due" };
    }
  }

  return { ok: true, reason: null };
}

export function buildDeterministicFollowupMessage(
  sequenceNumber: 1 | 2 | 3
): string {
  if (sequenceNumber === 1) {
    return "先日ご案内した単価診断の件、その後いかがでしょうか。ご多用中でしたら今は無理に進めなくて大丈夫です。気になる点だけあれば教えてください。";
  }
  if (sequenceNumber === 2) {
    return "ご検討中でしたら、いま一番引っかかっている点（導入タイミング・課題感・社内確認など）だけ共有いただけますか。今は不要でしたら、その旨だけでも構いません。";
  }
  return "こちらがご連絡の最終確認です。今は優先度が高くなければ、一旦ここでクローズします。必要になったら、いつでも単価の件から再開できます。";
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
      console.error("[ai/followup] compatible API HTTP", response.status);
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
    console.error("[ai/followup] compatible API failed:", message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateFollowupMessage(options: {
  sequenceNumber: 1 | 2 | 3;
  lead: FollowupLeadContext;
  conversation: ConversationMessage[];
}): Promise<string> {
  const fallback = buildDeterministicFollowupMessage(options.sequenceNumber);
  const generated = await completeChat([
    {
      role: "system",
      content: [
        "あなたはPriceSenseのAI営業担当です。返信がない見込み客へ、短く丁寧なフォローアップを書きます。",
        "しつこく売り込まない。メール送信・電話は約束しない。質問は1つまで。",
        `これはFollow-up #${options.sequenceNumber} / ${MAX_FOLLOWUPS} です。`,
        options.sequenceNumber === 1
          ? "軽い確認にする。"
          : options.sequenceNumber === 2
            ? "導入課題や検討状況を聞く。"
            : "最終確認とし、今不要なら再相談できる旨を伝える。",
      ].join("\n"),
    },
    ...options.conversation.map((item) => ({
      role: item.role,
      content: item.content,
    })),
  ]);

  return generated ?? fallback;
}

export async function runFollowupTurn(
  lead: FollowupLeadContext,
  state: LeadFollowupState,
  options: {
    now?: Date;
    delays?: FollowupDelayHours;
  } = {}
): Promise<FollowupTurnResult> {
  const now = options.now ?? new Date();
  const delays = options.delays ?? getFollowupDelayHours();
  const conversation = parseConversation(lead.conversation);
  const scoreInput = scoreInputFromLeadConversation(lead, conversation);
  const scored = scoreLead(scoreInput);
  const last = conversation.at(-1);

  if (
    scored.escalationStatus === "handed_off" ||
    lead.escalation_status === "handed_off"
  ) {
    return {
      sent: false,
      reply: null,
      conversation,
      state: stopFollowupState(state, "handed_off", now),
      scored,
      event: null,
      skipReason: "handed_off",
    };
  }

  if (last?.role === "user") {
    return {
      sent: false,
      reply: null,
      conversation,
      state: stopFollowupState(state, "customer_replied", now),
      scored,
      event: null,
      skipReason: "customer_replied",
    };
  }

  const eligibility = shouldSendFollowup(state, {
    escalationStatus: lead.escalation_status,
    now,
  });

  if (!eligibility.ok) {
    const stopped =
      eligibility.reason === "max_followups" &&
      state.followup_status !== "stopped"
        ? stopFollowupState(state, "max_followups", now)
        : eligibility.reason === "handed_off"
          ? stopFollowupState(state, "handed_off", now)
          : eligibility.reason === "closed"
            ? stopFollowupState(state, "closed", now)
            : state;

    return {
      sent: false,
      reply: null,
      conversation,
      state: stopped,
      scored,
      event: null,
      skipReason: eligibility.reason,
    };
  }

  const sequenceNumber = (state.followup_count + 1) as 1 | 2 | 3;
  const reply = await generateFollowupMessage({
    sequenceNumber,
    lead,
    conversation,
  });
  const nextConversation = appendConversationMessage(
    conversation,
    "assistant",
    reply
  );
  const countAfterSend = state.followup_count + 1;
  const nextAt = computeNextFollowupAt(countAfterSend, now, delays);
  const reachedMax = countAfterSend >= state.max_followups;

  const nextState: LeadFollowupState = reachedMax
    ? {
        ...stopFollowupState(state, "max_followups", now),
        followup_count: countAfterSend,
        last_contacted_at: now.toISOString(),
      }
    : {
        ...state,
        followup_status: "scheduled",
        followup_count: countAfterSend,
        last_contacted_at: now.toISOString(),
        next_followup_at: nextAt ? nextAt.toISOString() : null,
        stop_reason: null,
        stopped_at: null,
      };

  return {
    sent: true,
    reply,
    conversation: nextConversation,
    state: nextState,
    scored,
    event: {
      lead_id: lead.id,
      sequence_number: sequenceNumber,
      message: reply,
      status: "generated",
      scheduled_at: state.next_followup_at,
      sent_at: now.toISOString(),
      stop_reason: null,
    },
    skipReason: null,
  };
}

function followupRow(state: LeadFollowupState) {
  return {
    lead_id: state.lead_id,
    followup_status: state.followup_status,
    followup_count: state.followup_count,
    next_followup_at: state.next_followup_at,
    last_contacted_at: state.last_contacted_at,
    stopped_at: state.stopped_at,
    stop_reason: state.stop_reason,
    max_followups: state.max_followups,
    updated_at: new Date().toISOString(),
  };
}

export async function persistFollowupState(
  state: LeadFollowupState
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("lead_followups").upsert(followupRow(state), {
    onConflict: "lead_id",
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function persistFollowupEvent(
  event: FollowupEventDraft
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("followup_events").insert({
    lead_id: event.lead_id,
    sequence_number: event.sequence_number,
    message: event.message,
    status: event.status,
    scheduled_at: event.scheduled_at,
    sent_at: event.sent_at,
    stop_reason: event.stop_reason,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function loadFollowupState(
  leadId: string
): Promise<LeadFollowupState> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_followups")
    .select(
      "lead_id, followup_status, followup_count, next_followup_at, last_contacted_at, stopped_at, stop_reason, max_followups"
    )
    .eq("lead_id", leadId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return parseFollowupState(leadId, data);
}

/**
 * Day-2 / Day-3 hook. Failures are logged and must not break those APIs.
 */
export async function syncFollowupAfterLeadTurn(input: {
  leadId: string;
  customerReplied: boolean;
  escalationStatus: string;
}): Promise<void> {
  try {
    const now = new Date();
    let state = await loadFollowupState(input.leadId);

    if (input.escalationStatus === "handed_off") {
      await persistFollowupState(stopFollowupState(state, "handed_off", now));
      return;
    }

    if (input.customerReplied) {
      await persistFollowupState(
        stopFollowupState(state, "customer_replied", now)
      );
      return;
    }

    if (
      state.followup_status === "stopped" ||
      state.followup_status === "closed" ||
      state.stop_reason === "handed_off"
    ) {
      return;
    }

    if (state.followup_count > 0 && state.followup_status === "scheduled") {
      return;
    }

    state = {
      ...state,
      followup_status: "scheduled",
      last_contacted_at: now.toISOString(),
      next_followup_at: computeInitialFollowupAt(now).toISOString(),
      stop_reason: null,
      stopped_at: null,
    };
    await persistFollowupState(state);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown followup sync error";
    console.error("[ai/followup] sync skipped:", message);
  }
}
