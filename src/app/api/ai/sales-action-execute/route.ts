import { NextResponse } from "next/server";
import { POST as postDealFollowup } from "@/app/api/ai/deal-followup/route";
import {
  buildIdempotencyKey,
  normalizeExecutedBy,
  parseOptionalIdempotencyKey,
  type SalesActionEventDraft,
} from "@/lib/ai/sales-action-history";
import { classifySalesAction, parseExistingDeal } from "@/lib/ai/sales-actions";
import {
  existingExecuteOutcome,
  failedExecuteDraft,
  succeededExecuteDraft,
} from "@/lib/ai/sales-ops";
import { parseOptionalLeadId } from "@/lib/sales/scoring";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { publicErrorMessage } from "@/lib/server/public-error";
import {
  apiSalesActionEvent,
  findSalesActionEventByKey,
  recordSalesActionEvent,
} from "@/lib/server/sales-action-events";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const requestedOperation = body.operation ?? "action_executed";
  if (
    requestedOperation !== "followup_created" &&
    requestedOperation !== "action_executed"
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid operation" },
      { status: 400 }
    );
  }
  const operation: "followup_created" | "action_executed" =
    requestedOperation === "followup_created"
      ? "followup_created"
      : "action_executed";

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

    const currentAction = classifySalesAction({
      leadId,
      dealId: existing?.id ?? null,
      score: typeof leadRow.score === "number" ? leadRow.score : null,
      leadStatus: leadRow.escalation_status ?? null,
      dealStatus: existing?.status ?? null,
      nextAction: existing?.next_action || leadRow.next_action || null,
      nextFollowupAt: existing?.next_followup_at ?? null,
      lastActivityAt: null,
    });

    let sequenceNumber = 1;
    if (existing && operation === "followup_created") {
      const { data: lastEvent } = await supabase
        .from("deal_followup_events")
        .select("sequence_number")
        .eq("deal_id", existing.id)
        .order("sequence_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (typeof lastEvent?.sequence_number === "number") {
        sequenceNumber = lastEvent.sequence_number + 1;
      }
    }

    const idempotencyKey =
      providedKey ??
      buildIdempotencyKey({
        operation,
        previousStatus: existing?.status ?? null,
        nextStatus: existing?.status ?? null,
        actionType: currentAction?.actionType ?? null,
        priority: currentAction?.priority ?? null,
        sequenceNumber,
      });

    const existingHistory = await findSalesActionEventByKey(leadId, idempotencyKey);
    if (existingHistory) {
      const outcome = existingExecuteOutcome(existingHistory);
      if (outcome.kind === "failed_retryable") {
        return NextResponse.json(
          {
            success: false,
            error: existingHistory.error ?? "Action previously failed",
            retryable: true,
            leadId,
            dealId: existing?.id ?? null,
            history: apiSalesActionEvent(existingHistory),
          },
          { status: 409 }
        );
      }
      return NextResponse.json({
        success: true,
        leadId,
        dealId: existing?.id ?? null,
        duplicate: true,
        history: apiSalesActionEvent({
          ...existingHistory,
          result: "duplicate",
          status:
            existingHistory.status === "cancelled"
              ? "cancelled"
              : "skipped",
        }),
      });
    }

    const historyDraft: SalesActionEventDraft = {
      leadId,
      dealId: existing?.id ?? null,
      actionType: currentAction?.actionType ?? null,
      priority: currentAction?.priority ?? null,
      operation,
      actionContent: currentAction?.nextAction ?? existing?.next_action ?? null,
      previousStatus: existing?.status ?? null,
      nextStatus: existing?.status ?? null,
      executedBy,
      actorKind: "human",
      externalDelivery: "none",
      approvalRequired: false,
      reason: currentAction?.reason ?? null,
      metadata: { sequenceNumber },
      idempotencyKey,
    };

    let followup: Record<string, unknown> | null = null;
    if (operation === "followup_created") {
      const followupResponse = await postDealFollowup(
        new Request("http://localhost/api/ai/deal-followup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(request.headers.get("authorization")
              ? { Authorization: request.headers.get("authorization")! }
              : {}),
            ...(request.headers.get("x-admin-token")
              ? { "x-admin-token": request.headers.get("x-admin-token")! }
              : {}),
          },
          body: JSON.stringify({ leadId }),
        })
      );
      followup = (await followupResponse.json()) as Record<string, unknown>;
      if (!followupResponse.ok || followup.success !== true) {
        const followupError =
          typeof followup.error === "string"
            ? followup.error
            : "Failed to create follow-up";
        const failed = await recordSalesActionEvent(
          failedExecuteDraft(historyDraft, publicErrorMessage(new Error(followupError), followupError))
        );
        return NextResponse.json(
          {
            success: false,
            error: publicErrorMessage(
              new Error(followupError),
              "Failed to create follow-up"
            ),
            retryable: true,
            leadId,
            dealId: existing?.id ?? null,
            history: apiSalesActionEvent(failed.event),
          },
          { status: followupResponse.status >= 400 ? followupResponse.status : 500 }
        );
      }
    }

    const history = await recordSalesActionEvent(
      succeededExecuteDraft({
        ...historyDraft,
        dealId:
          typeof followup?.dealId === "string"
            ? followup.dealId
            : (existing?.id ?? null),
        nextStatus:
          typeof followup?.status === "string"
            ? followup.status
            : (existing?.status ?? null),
      })
    );

    return NextResponse.json({
      success: true,
      leadId,
      dealId:
        typeof followup?.dealId === "string"
          ? followup.dealId
          : (existing?.id ?? null),
      duplicate: history.duplicate,
      history: apiSalesActionEvent(history.event),
      reply: typeof followup?.reply === "string" ? followup.reply : undefined,
      nextAction:
        typeof followup?.nextAction === "string"
          ? followup.nextAction
          : currentAction?.nextAction,
      nextFollowupAt:
        typeof followup?.nextFollowupAt === "string" ||
        followup?.nextFollowupAt === null
          ? followup.nextFollowupAt
          : existing?.next_followup_at ?? null,
      status:
        typeof followup?.status === "string" ? followup.status : existing?.status,
    });
  } catch (error) {
    const errorMessage = publicErrorMessage(error, "Failed to execute sales action");
    console.error("[ai/sales-action-execute] POST failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}


