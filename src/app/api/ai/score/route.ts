import { NextResponse } from "next/server";
import {
  parseConversation,
  scoreInputFromLeadConversation,
  type SalesLeadRow,
} from "@/lib/ai/respond";
import {
  parseLeadScoreInput,
  parseOptionalLeadId,
  scoreLead,
  type ScoreResult,
} from "@/lib/sales/scoring";
import { isAdminRequest } from "@/lib/server/admin";
import { isSupabaseConfigured } from "@/lib/server/env";
import { persistLeadIntentSignals, syncLeadsIntoSalesOs } from "@/lib/server/sales-os";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

const LEAD_COLUMNS =
  "id, email, category_name, user_rate, market_rate, diagnosis_level, target_rate, intent_signals, conversation, handed_off_at, handoff_channel, score, escalation_status, next_action, model_version, company_name, industry, employee_count, job_title, department, seniority, decision_maker, decision_maker_distance, existing_relationship, reply_received, meeting_requested, meeting_scheduled, primary_objection, prospect_id";

function scoreResponse(result: ScoreResult) {
  return {
    ok: true as const,
    success: true as const,
    score: result.score,
    intentSignals: result.intentSignals,
    primaryObjection: result.primaryObjection,
    escalationStatus: result.escalationStatus,
    nextAction: result.nextAction,
    modelVersion: result.modelVersion,
    reason: result.reason,
  };
}

async function persistLeadScore(
  leadId: string,
  result: ScoreResult
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: selectError } = await supabase
    .from("leads")
    .select("id, handed_off_at, prospect_id")
    .eq("id", leadId)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (!existing) {
    return;
  }

  const patch: Record<string, unknown> = {
    score: result.score,
    intent_signals: result.intentSignals,
    primary_objection: result.primaryObjection,
    escalation_status:
      existing.handed_off_at ? "handed_off" : result.escalationStatus,
    next_action: result.nextAction,
    model_version: result.modelVersion,
  };

  const { error: updateError } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", leadId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  try {
    await syncLeadsIntoSalesOs();
    if (existing.prospect_id) {
      const { data: prospect } = await supabase
        .from("prospects")
        .select("id, company_id")
        .eq("id", existing.prospect_id)
        .maybeSingle();
      if (prospect?.company_id) {
        await persistLeadIntentSignals({
          lead: {
            id: leadId,
            score: result.score,
            next_action: result.nextAction,
            intent_signals: result.intentSignals,
          },
          companyId: prospect.company_id,
          prospectId: prospect.id,
        });
      }
    }
  } catch (syncError) {
    console.error(
      "[ai/score] sales os sync skipped:",
      syncError instanceof Error ? syncError.message : syncError
    );
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  let result: ScoreResult;
  let leadId: string | null = null;

  try {
    leadId = parseOptionalLeadId(body);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid leadId",
      },
      { status: 400 }
    );
  }

  try {
    if (leadId && isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("leads")
        .select(LEAD_COLUMNS)
        .eq("id", leadId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
      }
      const lead = data as SalesLeadRow;
      const conversation = parseConversation(lead.conversation);
      result = scoreLead(scoreInputFromLeadConversation(lead, conversation));
    } else {
      result = scoreLead(parseLeadScoreInput(body));
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  if (leadId && isSupabaseConfigured()) {
    try {
      await persistLeadScore(leadId, result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown persist error";
      console.error("[ai/score] lead persist skipped:", message, error);
    }
  }

  return NextResponse.json(scoreResponse(result));
}
