import { NextResponse } from "next/server";
import {
  appendConversationMessage,
  generateSalesReply,
  parseConversation,
  scoreInputFromLeadConversation,
  type SalesLeadRow,
} from "@/lib/ai/respond";
import { parseOptionalLeadId, scoreLead } from "@/lib/sales/scoring";
import { syncFollowupAfterLeadTurn } from "@/lib/ai/followup";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const LEAD_COLUMNS =
  "id, email, category_name, user_rate, market_rate, diagnosis_level, target_rate, intent_signals, conversation, handed_off_at, handoff_channel, company_name, industry, employee_count, job_title, department, seniority, decision_maker, decision_maker_distance, existing_relationship, reply_received, meeting_requested, meeting_scheduled, primary_objection";

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

  try {
    message = parseOptionalMessage(body);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Invalid message";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error: selectError } = await supabase
      .from("leads")
      .select(LEAD_COLUMNS)
      .eq("id", leadId)
      .maybeSingle();

    if (selectError) {
      throw new Error(selectError.message);
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    const lead = data as SalesLeadRow;
    let conversation = parseConversation(lead.conversation);

    if (message) {
      conversation = appendConversationMessage(conversation, "user", message);
    }

    const scoreInput = scoreInputFromLeadConversation(lead, conversation);
    const scored = scoreLead(scoreInput);
    const reply = await generateSalesReply({
      lead,
      conversation,
      scoreInput,
    });

    conversation = appendConversationMessage(conversation, "assistant", reply);

    const patch: Record<string, unknown> = {
      conversation,
      intent_signals: scored.intentSignals,
      score: scored.score,
      escalation_status: lead.handed_off_at ? "handed_off" : scored.escalationStatus,
      next_action: scored.nextAction,
      model_version: scored.modelVersion,
      primary_objection: scored.primaryObjection,
    };

    const { error: updateError } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", leadId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await syncFollowupAfterLeadTurn({
      leadId,
      customerReplied: Boolean(message),
      escalationStatus: scored.escalationStatus,
    });

    return NextResponse.json({
      success: true,
      reply,
      score: scored.score,
      escalationStatus: scored.escalationStatus,
      nextAction: scored.nextAction,
      intentSignals: scored.intentSignals,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate reply";
    console.error("[ai/respond] POST failed:", errorMessage, error);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
