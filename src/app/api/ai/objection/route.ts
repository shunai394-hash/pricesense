import { NextResponse } from "next/server";
import {
  mergeObjectionBank,
  runObjectionTurn,
  type ObjectionDefinition,
} from "@/lib/ai/objections";
import type { SalesLeadRow } from "@/lib/ai/respond";
import { parseOptionalLeadId } from "@/lib/sales/scoring";
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
  "id, category_name, user_rate, market_rate, diagnosis_level, target_rate, intent_signals, conversation, handed_off_at, handoff_channel";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRequiredMessage(body: Record<string, unknown>): string {
  if (typeof body.message !== "string") {
    throw new Error("Invalid message");
  }
  const trimmed = body.message.trim();
  if (!trimmed) {
    throw new Error("Invalid message");
  }
  return trimmed.slice(0, 4000);
}

async function loadObjectionBank(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<ObjectionDefinition[]> {
  const { data, error } = await supabase
    .from("objection_bank")
    .select(
      "objection_key, objection_type, keywords, detection_rules, response_strategy, recommended_response, enabled, is_active, model_version"
    );

  if (error) {
    console.error("[ai/objection] bank load failed:", error.message);
    return mergeObjectionBank([]);
  }

  return mergeObjectionBank(data ?? []);
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

  let message: string;

  try {
    message = parseRequiredMessage(body);
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
    const bank = await loadObjectionBank(supabase);
    const turn = await runObjectionTurn(lead, message, bank);

    const patch: Record<string, unknown> = {
      conversation: turn.conversation,
      intent_signals: turn.scored.intentSignals,
      score: turn.scored.score,
      escalation_status: turn.scored.escalationStatus,
      next_action: turn.scored.nextAction,
      model_version: turn.scored.modelVersion,
      primary_objection: turn.scored.primaryObjection,
    };

    if (turn.scored.escalationStatus === "handed_off") {
      if (!lead.handed_off_at) {
        patch.handed_off_at = new Date().toISOString();
      }
      if (!lead.handoff_channel) {
        patch.handoff_channel = "ai_objection";
      }
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", leadId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await syncFollowupAfterLeadTurn({
      leadId,
      customerReplied: true,
      escalationStatus: turn.scored.escalationStatus,
    });

    const { error: eventError } = await supabase.from("objection_events").insert({
      lead_id: turn.event.lead_id,
      objection_key: turn.event.objection_key,
      objection_type: turn.event.objection_type,
      customer_message: turn.event.customer_message,
      raw_text: turn.event.raw_text,
      response_play: turn.event.response_play,
      source: turn.event.source,
      metadata: turn.event.metadata,
    });

    if (eventError) {
      console.error("[ai/objection] event insert failed:", eventError.message);
    }

    return NextResponse.json({
      success: true,
      objectionType: turn.detection.objectionType,
      reply: turn.reply,
      score: turn.scored.score,
      escalationStatus: turn.scored.escalationStatus,
      nextAction: turn.scored.nextAction,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to handle objection";
    console.error("[ai/objection] POST failed:", errorMessage, error);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
