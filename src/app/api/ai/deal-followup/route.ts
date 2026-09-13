import { NextResponse } from "next/server";
import {
  isDealStatus,
  parseDealState,
  runDealFollowupTurn,
  type DealStatus,
} from "@/lib/ai/deal";
import type { SalesLeadRow } from "@/lib/ai/respond";
import { parseOptionalLeadId } from "@/lib/sales/scoring";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { isAdminRequest } from "@/lib/server/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const LEAD_COLUMNS =
  "id, category_name, user_rate, market_rate, diagnosis_level, target_rate, intent_signals, conversation, handed_off_at, handoff_channel, score, escalation_status, next_action, model_version";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseOptionalMessage(body: Record<string, unknown>): string | null {
  if (body.message === undefined || body.message === null || body.message === "") {
    return null;
  }
  if (typeof body.message !== "string") {
    throw new Error("Invalid message");
  }
  const trimmed = body.message.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 4000) : null;
}

function parseOptionalStatus(body: Record<string, unknown>): DealStatus | null {
  if (body.status === undefined || body.status === null || body.status === "") {
    return null;
  }
  if (!isDealStatus(body.status)) {
    throw new Error("Invalid status");
  }
  return body.status;
}

function parseQuoteTotal(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    const configError = getSupabaseConfigError() ?? "Lead API is not configured";
    return NextResponse.json(
      { success: false, error: configError },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const leadId = parseOptionalLeadId(body);
  if (!leadId) {
    return NextResponse.json(
      { success: false, error: "Invalid leadId" },
      { status: 400 }
    );
  }

  let message: string | null;
  let requestedStatus: DealStatus | null;
  try {
    message = parseOptionalMessage(body);
    requestedStatus = parseOptionalStatus(body);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: leadRow, error: leadError } = await supabase
      .from("leads")
      .select(LEAD_COLUMNS)
      .eq("id", leadId)
      .maybeSingle();
    if (leadError) throw new Error(leadError.message);
    if (!leadRow) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }
    const lead = leadRow as SalesLeadRow;

    const { data: meetingRow } = await supabase
      .from("sales_meetings")
      .select("id")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: proposalRow } = await supabase
      .from("proposal_drafts")
      .select("id")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: quoteRow } = await supabase
      .from("quote_drafts")
      .select("id, total, currency")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: dealRow, error: dealSelectError } = await supabase
      .from("sales_deals")
      .select(
        "id, lead_id, meeting_id, proposal_id, quote_id, status, probability, expected_value, currency, next_action, next_followup_at, lost_reason, won_at, lost_at"
      )
      .eq("lead_id", leadId)
      .maybeSingle();
    if (dealSelectError) throw new Error(dealSelectError.message);

    const existingDeal = parseDealState(dealRow, leadId);
    let sequenceNumber = 1;
    if (existingDeal) {
      const { data: lastEvent } = await supabase
        .from("deal_followup_events")
        .select("sequence_number")
        .eq("deal_id", existingDeal.id)
        .order("sequence_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (typeof lastEvent?.sequence_number === "number") {
        sequenceNumber = lastEvent.sequence_number + 1;
      }
    }

    const turn = await runDealFollowupTurn({
      lead,
      existingDeal,
      requestedStatus,
      message,
      meetingId: meetingRow?.id ?? null,
      proposalId: proposalRow?.id ?? null,
      quoteId: quoteRow?.id ?? null,
      quoteTotal: parseQuoteTotal(quoteRow?.total),
      quoteCurrency:
        typeof quoteRow?.currency === "string" ? quoteRow.currency : null,
      sequenceNumber,
    });

    const now = new Date().toISOString();
    const dealInsert = {
      id: turn.deal.id,
      lead_id: turn.deal.lead_id,
      meeting_id: turn.deal.meeting_id,
      proposal_id: turn.deal.proposal_id,
      quote_id: turn.deal.quote_id,
      status: turn.deal.status,
      probability: turn.deal.probability,
      expected_value: turn.deal.expected_value,
      currency: turn.deal.currency,
      next_action: turn.deal.next_action,
      next_followup_at: turn.deal.next_followup_at,
      lost_reason: turn.deal.lost_reason,
      won_at: turn.deal.won_at,
      lost_at: turn.deal.lost_at,
      updated_at: now,
    };

    let dealUpsertError: { message: string } | null = null;
    if (existingDeal) {
      const updated = await supabase
        .from("sales_deals")
        .update({
          meeting_id: dealInsert.meeting_id,
          proposal_id: dealInsert.proposal_id,
          quote_id: dealInsert.quote_id,
          status: dealInsert.status,
          probability: dealInsert.probability,
          expected_value: dealInsert.expected_value,
          currency: dealInsert.currency,
          next_action: dealInsert.next_action,
          next_followup_at: dealInsert.next_followup_at,
          lost_reason: dealInsert.lost_reason,
          won_at: dealInsert.won_at,
          lost_at: dealInsert.lost_at,
          updated_at: dealInsert.updated_at,
        })
        .eq("id", existingDeal.id);
      dealUpsertError = updated.error;
    } else {
      const inserted = await supabase.from("sales_deals").insert(dealInsert);
      dealUpsertError = inserted.error;
    }
    if (dealUpsertError) throw new Error(dealUpsertError.message);

    const { error: eventError } = await supabase.from("deal_followup_events").insert({
      deal_id: turn.event.deal_id,
      sequence_number: turn.event.sequence_number,
      message: turn.event.message,
      reason: turn.event.reason,
      status: turn.event.status,
      scheduled_at: turn.event.scheduled_at,
    });
    if (eventError) {
      console.error("[ai/deal-followup] event insert skipped:", eventError.message);
    }

    const { error: leadUpdateError } = await supabase
      .from("leads")
      .update({
        conversation: turn.conversation,
        score: turn.scored.score,
        intent_signals: turn.scored.intentSignals,
        escalation_status: turn.scored.escalationStatus,
        next_action: turn.scored.nextAction,
        model_version: turn.scored.modelVersion,
        primary_objection: turn.scored.primaryObjection,
      })
      .eq("id", leadId);
    if (leadUpdateError) throw new Error(leadUpdateError.message);

    return NextResponse.json({
      success: true,
      dealId: turn.deal.id,
      status: turn.deal.status,
      probability: turn.deal.probability,
      reply: turn.reply,
      nextAction: turn.deal.next_action,
      nextFollowupAt: turn.deal.next_followup_at,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process deal follow-up";
    console.error("[ai/deal-followup] POST failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}



