import { NextResponse } from "next/server";
import { POST as postDealFollowup } from "@/app/api/ai/deal-followup/route";
import { normalizeExecutedBy } from "@/lib/ai/sales-action-history";
import {
  failedExecuteDraft,
  followupAlreadyRecorded,
  isUuid,
  planRetry,
  succeededExecuteDraft,
} from "@/lib/ai/sales-ops";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { publicErrorMessage } from "@/lib/server/public-error";
import {
  apiSalesActionEvent,
  findSalesActionEventById,
  findSalesActionEventByKey,
  recordSalesActionEvent,
} from "@/lib/server/sales-action-events";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function adminHeaders(request: Request): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(request.headers.get("authorization")
      ? { Authorization: request.headers.get("authorization")! }
      : {}),
    ...(request.headers.get("x-admin-token")
      ? { "x-admin-token": request.headers.get("x-admin-token")! }
      : {}),
  };
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

  if (!isRecord(body) || !isUuid(body.eventId)) {
    return NextResponse.json(
      { success: false, error: "Invalid eventId" },
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

  try {
    const original = await findSalesActionEventById(body.eventId);
    if (!original) {
      return NextResponse.json(
        { success: false, error: "Action event not found" },
        { status: 404 }
      );
    }

    const planned = planRetry({ original, executedBy });
    if (!planned.ok) {
      return NextResponse.json(
        { success: false, error: planned.error },
        { status: 400 }
      );
    }

    const existingRetry = await findSalesActionEventByKey(
      original.leadId,
      planned.draft.idempotencyKey ?? ""
    );
    if (existingRetry) {
      if (existingRetry.status === "failed") {
        return NextResponse.json(
          {
            success: false,
            error: existingRetry.error ?? "Retry previously failed",
            retryable: true,
            original: apiSalesActionEvent(original),
            history: apiSalesActionEvent(existingRetry),
          },
          { status: 409 }
        );
      }
      return NextResponse.json({
        success: true,
        duplicate: true,
        retried: true,
        original: apiSalesActionEvent(original),
        history: apiSalesActionEvent({
          ...existingRetry,
          result: "duplicate",
          status: existingRetry.status === "cancelled" ? "cancelled" : "skipped",
        }),
      });
    }

    let latestSequence: number | null = null;
    if (original.operation === "followup_created" && original.dealId) {
      const supabase = getSupabaseAdmin();
      const { data: lastEvent, error } = await supabase
        .from("deal_followup_events")
        .select("sequence_number")
        .eq("deal_id", original.dealId)
        .order("sequence_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (typeof lastEvent?.sequence_number === "number") {
        latestSequence = lastEvent.sequence_number;
      }
    }

    const sequenceNumber =
      typeof original.metadata.sequenceNumber === "number"
        ? original.metadata.sequenceNumber
        : null;
    const skipFollowup = followupAlreadyRecorded({
      operation: original.operation,
      sequenceNumber,
      latestSequence,
    });

    if (original.operation === "followup_created" && !skipFollowup) {
      const followupResponse = await postDealFollowup(
        new Request("http://localhost/api/ai/deal-followup", {
          method: "POST",
          headers: adminHeaders(request),
          body: JSON.stringify({ leadId: original.leadId }),
        })
      );
      const followup = (await followupResponse.json()) as Record<string, unknown>;
      if (!followupResponse.ok || followup.success !== true) {
        const followupError =
          typeof followup.error === "string"
            ? followup.error
            : "Failed to create follow-up";
        const failed = await recordSalesActionEvent(
          failedExecuteDraft(
            planned.draft,
            publicErrorMessage(new Error(followupError), followupError)
          )
        );
        return NextResponse.json(
          {
            success: false,
            error: publicErrorMessage(
              new Error(followupError),
              "Failed to create follow-up"
            ),
            retryable: true,
            original: apiSalesActionEvent(original),
            history: apiSalesActionEvent(failed.event),
          },
          { status: followupResponse.status >= 400 ? followupResponse.status : 500 }
        );
      }
    }

    const history = await recordSalesActionEvent(
      succeededExecuteDraft({
        ...planned.draft,
        metadata: {
          ...planned.draft.metadata,
          retrySkippedFollowup: skipFollowup,
          externalDelivery: "none",
        },
      })
    );

    return NextResponse.json({
      success: true,
      duplicate: history.duplicate,
      retried: true,
      original: apiSalesActionEvent(original),
      history: apiSalesActionEvent(history.event),
    });
  } catch (error) {
    const errorMessage = publicErrorMessage(error, "Failed to retry sales action");
    console.error("[ai/sales-action-retry] POST failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
