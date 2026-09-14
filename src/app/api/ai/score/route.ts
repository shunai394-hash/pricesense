import { NextResponse } from "next/server";
import {
  parseLeadScoreInput,
  parseOptionalLeadId,
  scoreLead,
  type ScoreResult,
} from "@/lib/sales/scoring";
import { isAdminRequest } from "@/lib/server/admin";
import { isSupabaseConfigured } from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

function scoreResponse(result: ScoreResult) {
  return {
    ok: true as const,
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
    .select("id, handed_off_at, handoff_channel")
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
    escalation_status: result.escalationStatus,
    next_action: result.nextAction,
    model_version: result.modelVersion,
  };

  if (result.escalationStatus === "handed_off") {
    if (!existing.handed_off_at) {
      patch.handed_off_at = new Date().toISOString();
    }
    if (!existing.handoff_channel) {
      patch.handoff_channel = "ai_score";
    }
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", leadId);

  if (updateError) {
    throw new Error(updateError.message);
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

  try {
    result = scoreLead(parseLeadScoreInput(body));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const leadId = parseOptionalLeadId(body);

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
