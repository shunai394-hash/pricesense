import { NextResponse } from "next/server";
import {
  loadFollowupState,
  persistFollowupEvent,
  persistFollowupState,
  runFollowupTurn,
  type FollowupLeadContext,
} from "@/lib/ai/followup";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

    const lead = data as FollowupLeadContext;
    const state = await loadFollowupState(leadId);
    const turn = await runFollowupTurn(lead, state);

    await persistFollowupState(turn.state);

    if (turn.sent && turn.event) {
      const leadPatch: Record<string, unknown> = {
        conversation: turn.conversation,
      };

      if (turn.scored.escalationStatus === "handed_off") {
        leadPatch.score = turn.scored.score;
        leadPatch.escalation_status = turn.scored.escalationStatus;
        leadPatch.next_action = turn.scored.nextAction;
        leadPatch.model_version = turn.scored.modelVersion;
        if (!lead.handed_off_at) {
          leadPatch.handed_off_at = new Date().toISOString();
        }
        if (!lead.handoff_channel) {
          leadPatch.handoff_channel = "ai_followup";
        }
      }

      const { error: updateError } = await supabase
        .from("leads")
        .update(leadPatch)
        .eq("id", leadId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      try {
        await persistFollowupEvent(turn.event);
      } catch (eventError) {
        const message =
          eventError instanceof Error
            ? eventError.message
            : "unknown event error";
        console.error("[ai/followup] event insert failed:", message);
      }
    } else if (turn.skipReason === "handed_off") {
      const handoffPatch: Record<string, unknown> = {
        score: turn.scored.score,
        escalation_status: turn.scored.escalationStatus,
        next_action: turn.scored.nextAction,
        model_version: turn.scored.modelVersion,
      };
      if (turn.scored.escalationStatus === "handed_off") {
        if (!lead.handed_off_at) {
          handoffPatch.handed_off_at = new Date().toISOString();
        }
        if (!lead.handoff_channel) {
          handoffPatch.handoff_channel = "ai_followup";
        }
      }
      const { error: handoffError } = await supabase
        .from("leads")
        .update(handoffPatch)
        .eq("id", leadId);
      if (handoffError) {
        console.error("[ai/followup] handoff persist skipped:", handoffError.message);
      }
    }

    return NextResponse.json({
      success: true,
      sent: turn.sent,
      followupCount: turn.state.followup_count,
      nextFollowupAt: turn.state.next_followup_at,
      reply: turn.reply,
      score: turn.scored.score,
      escalationStatus: turn.scored.escalationStatus,
      nextAction: turn.scored.nextAction,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process follow-up";
    console.error("[ai/followup] POST failed:", errorMessage, error);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
