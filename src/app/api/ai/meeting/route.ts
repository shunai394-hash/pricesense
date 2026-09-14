import { NextResponse } from "next/server";
import {
  scoreLeadAfterMeeting,
  summarizeMeeting,
  type MeetingSummary,
} from "@/lib/ai/meeting";
import { buildProposalDraft } from "@/lib/ai/proposal";
import { buildQuoteDraft } from "@/lib/ai/quote";
import {
  parseConversation,
  type SalesLeadRow,
} from "@/lib/ai/respond";
import type {
  ObjectionEventRow,
  SalesBrief,
} from "@/lib/ai/sales-brief";
import { parseOptionalLeadId } from "@/lib/sales/scoring";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const LEAD_COLUMNS =
  "id, category_name, user_rate, market_rate, diagnosis_level, target_rate, intent_signals, conversation, handed_off_at, handoff_channel, score, escalation_status, next_action, model_version";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseOptionalUuid(
  body: Record<string, unknown>,
  key: string
): string | null {
  const value = body[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new Error(`Invalid ${key}`);
  }
  return value;
}

function parseRawNotes(body: Record<string, unknown>): string {
  if (body.rawNotes === undefined || body.rawNotes === null) return "";
  if (typeof body.rawNotes !== "string") {
    throw new Error("Invalid rawNotes");
  }
  return body.rawNotes.trim().slice(0, 20_000);
}

function asBrief(value: unknown): SalesBrief | null {
  if (!value || typeof value !== "object") return null;
  return value as SalesBrief;
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

  let meetingId: string | null;
  let rawNotes: string;
  try {
    meetingId = parseOptionalUuid(body, "meetingId");
    rawNotes = parseRawNotes(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
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

    const { data: handoffRow, error: handoffError } = await supabase
      .from("sales_handoffs")
      .select("id, brief, meeting_status")
      .eq("lead_id", leadId)
      .maybeSingle();
    if (handoffError) {
      console.error("[ai/meeting] handoff load skipped:", handoffError.message);
    }

    const { data: objectionRows, error: objectionError } = await supabase
      .from("objection_events")
      .select(
        "objection_type, objection_key, customer_message, raw_text, response_play"
      )
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });
    if (objectionError) {
      console.error("[ai/meeting] objection_events load skipped:", objectionError.message);
    }

    let existingMeeting: { id: string } | null = null;
    if (meetingId) {
      const { data, error } = await supabase
        .from("sales_meetings")
        .select("id")
        .eq("id", meetingId)
        .eq("lead_id", leadId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        return NextResponse.json(
          { success: false, error: "Meeting not found" },
          { status: 404 }
        );
      }
      existingMeeting = data;
    }

    const resolvedMeetingId = existingMeeting?.id ?? crypto.randomUUID();
    const conversation = parseConversation(lead.conversation);
    const brief = asBrief(handoffRow?.brief);
    const objections = (objectionRows ?? []) as ObjectionEventRow[];

    const summary: MeetingSummary = await summarizeMeeting({
      lead,
      brief,
      conversation,
      objections,
      rawNotes,
    });
    const proposalDraft = buildProposalDraft({
      lead,
      meetingId: resolvedMeetingId,
      brief,
      summary,
    });
    const quoteDraft = buildQuoteDraft({
      lead,
      meetingId: resolvedMeetingId,
      summary,
      rawNotes,
    });
    const scored = scoreLeadAfterMeeting(lead, rawNotes);

    const now = new Date().toISOString();
    const meetingRow = {
      id: resolvedMeetingId,
      lead_id: leadId,
      handoff_id: handoffRow?.id ?? null,
      meeting_status: "completed",
      meeting_at: now,
      raw_notes: rawNotes || null,
      summary: summary.summary,
      customer_needs: summary.customerNeeds,
      objections: summary.objections,
      agreed_points: summary.agreedPoints,
      unresolved_points: summary.unresolvedPoints,
      next_action: summary.nextAction,
      updated_at: now,
    };

    const { error: meetingError } = await supabase
      .from("sales_meetings")
      .upsert(meetingRow, { onConflict: "id" });
    if (meetingError) throw new Error(meetingError.message);

    const proposalRow = {
      lead_id: leadId,
      meeting_id: resolvedMeetingId,
      title: proposalDraft.title,
      problem: proposalDraft.problem,
      proposed_solution: proposalDraft.proposedSolution,
      benefits: proposalDraft.benefits,
      implementation_plan: proposalDraft.implementationPlan,
      assumptions: proposalDraft.assumptions,
      risks: proposalDraft.risks,
      next_steps: proposalDraft.nextSteps,
      status: "draft",
      updated_at: now,
    };
    const { error: proposalError } = await supabase
      .from("proposal_drafts")
      .upsert(proposalRow, { onConflict: "meeting_id" });
    if (proposalError) throw new Error(proposalError.message);

    const quoteRow = {
      lead_id: leadId,
      meeting_id: resolvedMeetingId,
      items: quoteDraft.items,
      subtotal: quoteDraft.subtotal,
      discount: quoteDraft.discount,
      total: quoteDraft.total,
      currency: quoteDraft.currency,
      assumptions: quoteDraft.assumptions,
      valid_until: quoteDraft.validUntil,
      status: "draft",
      updated_at: now,
    };
    const { error: quoteError } = await supabase
      .from("quote_drafts")
      .upsert(quoteRow, { onConflict: "meeting_id" });
    if (quoteError) throw new Error(quoteError.message);

    const { error: leadUpdateError } = await supabase
      .from("leads")
      .update({
        score: scored.score,
        intent_signals: scored.intentSignals,
        escalation_status: scored.escalationStatus,
        next_action: scored.nextAction,
        model_version: scored.modelVersion,
        primary_objection: scored.primaryObjection,
      })
      .eq("id", leadId);
    if (leadUpdateError) throw new Error(leadUpdateError.message);

    if (handoffRow?.id && handoffRow.meeting_status !== "cancelled") {
      const { error: handoffUpdateError } = await supabase
        .from("sales_handoffs")
        .update({
          meeting_status: "completed",
          updated_at: now,
        })
        .eq("id", handoffRow.id);
      if (handoffUpdateError) {
        console.error(
          "[ai/meeting] handoff meeting_status update skipped:",
          handoffUpdateError.message
        );
      }
    }

    return NextResponse.json({
      success: true,
      meetingId: resolvedMeetingId,
      summary,
      proposalDraft,
      quoteDraft,
      nextAction: summary.nextAction,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process meeting";
    console.error("[ai/meeting] POST failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
