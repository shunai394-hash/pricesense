import { NextResponse } from "next/server";
import {
  apiSalesBrief,
  evaluateHandoff,
  mergeSalesHandoff,
  type ObjectionEventRow,
} from "@/lib/ai/sales-brief";
import { syncFollowupAfterLeadTurn } from "@/lib/ai/followup";
import type { SalesLeadRow } from "@/lib/ai/respond";
import { parseOptionalLeadId } from "@/lib/sales/scoring";
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

    const lead = data as SalesLeadRow;
    const { data: objectionRows, error: objectionError } = await supabase
      .from("objection_events")
      .select(
        "objection_type, objection_key, customer_message, raw_text, response_play"
      )
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    if (objectionError) {
      console.error("[ai/handoff] objection_events load skipped:", objectionError.message);
    }

    const evaluation = await evaluateHandoff({
      lead,
      objections: (objectionRows ?? []) as ObjectionEventRow[],
    });

    if (!evaluation.handoff || !evaluation.record || !evaluation.brief) {
      return NextResponse.json({
        success: true,
        handoff: false,
        leadId,
        score: evaluation.scored.score,
        escalationStatus: evaluation.scored.escalationStatus,
        nextAction: evaluation.scored.nextAction,
        salesBrief: null,
      });
    }

    const { data: existing, error: existingError } = await supabase
      .from("sales_handoffs")
      .select("id, status, meeting_status")
      .eq("lead_id", leadId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    const merge = mergeSalesHandoff(
      existing as { id: string; status: string; meeting_status: string } | null,
      evaluation.record
    );
    const handoffRow = {
      lead_id: leadId,
      status: merge.status,
      score: evaluation.record.score,
      brief: evaluation.brief,
      handoff_reason: evaluation.record.handoff_reason,
      handed_off_at: evaluation.record.handed_off_at,
      meeting_status: merge.meetingStatus,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("sales_handoffs")
      .upsert(handoffRow, { onConflict: "lead_id" });

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    const leadPatch: Record<string, unknown> = {
      score: evaluation.scored.score,
      intent_signals: evaluation.scored.intentSignals,
      escalation_status: evaluation.scored.escalationStatus,
      next_action: evaluation.scored.nextAction,
      model_version: evaluation.scored.modelVersion,
      primary_objection: evaluation.scored.primaryObjection,
    };
    if (!lead.handed_off_at) {
      leadPatch.handed_off_at = evaluation.record.handed_off_at;
    }
    if (!lead.handoff_channel) {
      leadPatch.handoff_channel = "ai_handoff";
    }

    const { error: leadError } = await supabase
      .from("leads")
      .update(leadPatch)
      .eq("id", leadId);

    if (leadError) {
      throw new Error(leadError.message);
    }

    await syncFollowupAfterLeadTurn({
      leadId,
      customerReplied: false,
      escalationStatus: "handed_off",
    });

    return NextResponse.json({
      success: true,
      handoff: true,
      leadId,
      score: evaluation.scored.score,
      escalationStatus: evaluation.scored.escalationStatus,
      nextAction: evaluation.scored.nextAction,
      salesBrief: apiSalesBrief(evaluation.brief),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process handoff";
    console.error("[ai/handoff] POST failed:", errorMessage, error);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
