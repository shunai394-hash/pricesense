import { NextResponse } from "next/server";
import {
  loadFollowupState,
  persistFollowupState,
  stopFollowupState,
} from "@/lib/ai/followup";
import {
  buildIdempotencyKey,
  normalizeExecutedBy,
  parseOptionalIdempotencyKey,
} from "@/lib/ai/sales-action-history";
import { applyDealStop, classifySalesAction, parseExistingDeal } from "@/lib/ai/sales-actions";
import { parseOptionalLeadId } from "@/lib/sales/scoring";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import {
  apiSalesActionEvent,
  recordSalesActionEvent,
} from "@/lib/server/sales-action-events";
import { publicErrorMessage } from "@/lib/server/public-error";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

const DEAL_SELECT =
  "id, lead_id, meeting_id, proposal_id, quote_id, status, probability, expected_value, currency, next_action, next_followup_at, lost_reason, won_at, lost_at";

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return unauthorized();
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

  if (
    body.reason !== undefined &&
    body.reason !== null &&
    body.reason !== "" &&
    body.reason !== "manual_stop"
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid reason" },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    const configError = getSupabaseConfigError() ?? "Lead API is not configured";
    return NextResponse.json(
      { success: false, error: configError },
      { status: 503 }
    );
  }

  const executedBy = normalizeExecutedBy(
    body.executedBy ?? request.headers.get("x-executed-by")
  );
  const providedKey = parseOptionalIdempotencyKey(body.idempotencyKey);

  try {
    const supabase = getSupabaseAdmin();
    const { data: leadRow, error: leadError } = await supabase
      .from("leads")
      .select("id, score, escalation_status, next_action")
      .eq("id", leadId)
      .maybeSingle();
    if (leadError) throw new Error(leadError.message);
    if (!leadRow) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    const { data: dealRow, error: dealSelectError } = await supabase
      .from("sales_deals")
      .select(DEAL_SELECT)
      .eq("lead_id", leadId)
      .maybeSingle();
    if (dealSelectError) throw new Error(dealSelectError.message);

    const existing = parseExistingDeal(dealRow, leadId);
    let dealId: string | null = existing?.id ?? null;
    const previousStatus = existing?.status ?? null;
    const alreadyStopped = existing ? existing.next_followup_at === null : false;

    const currentAction = classifySalesAction({
      leadId,
      dealId,
      score: typeof leadRow.score === "number" ? leadRow.score : null,
      leadStatus: leadRow.escalation_status ?? null,
      dealStatus: existing?.status ?? null,
      nextAction: existing?.next_action || leadRow.next_action || null,
      nextFollowupAt: existing?.next_followup_at ?? null,
      lastActivityAt: null,
    });

    if (existing && !alreadyStopped) {
      const stopped = applyDealStop(existing);
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("sales_deals")
        .update({
          next_followup_at: stopped.next_followup_at,
          updated_at: now,
        })
        .eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);

      const { data: lastEvent } = await supabase
        .from("deal_followup_events")
        .select("sequence_number")
        .eq("deal_id", existing.id)
        .order("sequence_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const sequenceNumber =
        typeof lastEvent?.sequence_number === "number"
          ? lastEvent.sequence_number + 1
          : 1;
      const { error: eventError } = await supabase
        .from("deal_followup_events")
        .insert({
          deal_id: existing.id,
          sequence_number: sequenceNumber,
          message: "manual_stop",
          reason: "manual_stop",
          status: existing.status,
          scheduled_at: null,
        });
      if (eventError) {
        console.error("[ai/deal-stop] event insert skipped:", eventError.message);
      }

      dealId = stopped.id;
    }

    const followupState = await loadFollowupState(leadId);
    const alreadyLeadStopped =
      followupState.followup_status === "stopped" ||
      followupState.followup_status === "closed" ||
      followupState.stop_reason === "manual_stop";
    if (!alreadyLeadStopped) {
      await persistFollowupState(stopFollowupState(followupState, "manual_stop"));
    }

    const history = await recordSalesActionEvent({
      leadId,
      dealId,
      actionType: currentAction?.actionType ?? null,
      priority: currentAction?.priority ?? null,
      operation: "manual_stop",
      actionContent: currentAction?.nextAction ?? existing?.next_action ?? null,
      previousStatus,
      nextStatus: previousStatus,
      result: "executed",
      status: "succeeded",
      executedBy,
      actorKind: "human",
      externalDelivery: "none",
      approvalRequired: false,
      reason: "manual_stop",
      metadata: {
        previousFollowupAt: existing?.next_followup_at ?? null,
      },
      idempotencyKey:
        providedKey ??
        buildIdempotencyKey({
          operation: "manual_stop",
        }),
    });

    return NextResponse.json({
      success: true,
      leadId,
      dealId,
      status: previousStatus,
      nextFollowupAt: null,
      reason: "manual_stop",
      duplicate: history.duplicate,
      history: apiSalesActionEvent(history.event),
    });
  } catch (error) {
    const errorMessage = publicErrorMessage(error, "Failed to stop deal follow-up");
    console.error("[ai/deal-stop] POST failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
