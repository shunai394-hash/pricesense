import { NextResponse } from "next/server";
import {
  applyDealStatusChange,
  classifySalesAction,
  dealRowFromState,
  isDealStatus,
  parseDealLostReason,
  parseExistingDeal,
} from "@/lib/ai/sales-actions";
import {
  buildIdempotencyKey,
  isDealSnapshotUnchanged,
  normalizeExecutedBy,
  parseOptionalIdempotencyKey,
  type SalesActionOperation,
} from "@/lib/ai/sales-action-history";
import { parseOptionalLeadId } from "@/lib/sales/scoring";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import {
  apiSalesActionEvent,
  findLatestSalesActionEvent,
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

  if (!isDealStatus(body.status)) {
    return NextResponse.json(
      { success: false, error: "Invalid status" },
      { status: 400 }
    );
  }

  const lostReasonParsed = parseDealLostReason(body.lostReason);
  if (lostReasonParsed === "invalid") {
    return NextResponse.json(
      { success: false, error: "Invalid lostReason" },
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

    // Won means the customer has actually agreed to buy, which in this
    // pipeline only happens after a real meeting produced a proposal and a
    // quote. Require those upstream records to exist before allowing the
    // transition, so a Deal can't be marked Won (and the funnel/KPIs
    // reported as such) with no meeting, proposal, or quote behind it.
    if (body.status === "won") {
      const meetingId = existing?.meeting_id ?? null;
      const proposalId = existing?.proposal_id ?? null;
      const quoteId = existing?.quote_id ?? null;

      const [meetingCheck, proposalCheck, quoteCheck] = await Promise.all([
        meetingId
          ? Promise.resolve({ count: 1 })
          : supabase
              .from("sales_meetings")
              .select("id", { count: "exact", head: true })
              .eq("lead_id", leadId),
        proposalId
          ? Promise.resolve({ count: 1 })
          : supabase
              .from("proposal_drafts")
              .select("id", { count: "exact", head: true })
              .eq("lead_id", leadId),
        quoteId
          ? Promise.resolve({ count: 1 })
          : supabase
              .from("quote_drafts")
              .select("id", { count: "exact", head: true })
              .eq("lead_id", leadId),
      ]);

      const missing: string[] = [];
      if (!(meetingCheck.count && meetingCheck.count > 0)) missing.push("meeting");
      if (!(proposalCheck.count && proposalCheck.count > 0)) missing.push("proposal");
      if (!(quoteCheck.count && quoteCheck.count > 0)) missing.push("quote");

      if (missing.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot mark deal as won: missing ${missing.join(", ")} for this lead.`,
            missing,
          },
          { status: 409 }
        );
      }
    }
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

    const next = applyDealStatusChange({
      existing,
      leadId,
      status: body.status,
      lostReason: body.status === "lost" ? (lostReasonParsed ?? "unknown") : null,
    });
    const unchanged = isDealSnapshotUnchanged({
      previousStatus: existing?.status ?? null,
      nextStatus: next.status,
      previousLostReason: existing?.lost_reason ?? null,
      nextLostReason: next.lost_reason,
      previousFollowupAt: existing?.next_followup_at ?? null,
      nextFollowupAt: next.next_followup_at,
    });

    const now = new Date();
    const nowIso = now.toISOString();
    const operation = next.status as SalesActionOperation;

    if (!unchanged) {
      const row = dealRowFromState(next, nowIso);
      if (existing) {
        const { error: updateError } = await supabase
          .from("sales_deals")
          .update({
            status: row.status,
            probability: row.probability,
            next_action: row.next_action,
            next_followup_at: row.next_followup_at,
            lost_reason: row.lost_reason,
            won_at: row.won_at,
            lost_at: row.lost_at,
            updated_at: row.updated_at,
          })
          .eq("id", existing.id);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await supabase
          .from("sales_deals")
          .insert(row);
        if (insertError) throw new Error(insertError.message);
      }
    } else {
      const existingHistory = await findLatestSalesActionEvent(leadId, operation);
      if (existingHistory) {
        return NextResponse.json({
          success: true,
          dealId: next.id,
          status: next.status,
          probability: next.probability,
          nextAction: next.next_action,
          nextFollowupAt: next.next_followup_at,
          lostReason: next.lost_reason,
          wonAt: next.won_at,
          lostAt: next.lost_at,
          duplicate: true,
          history: apiSalesActionEvent({ ...existingHistory, result: "duplicate" }),
        });
      }
    }

    const history = await recordSalesActionEvent({
      leadId,
      dealId: next.id,
      actionType: currentAction?.actionType ?? null,
      priority: currentAction?.priority ?? null,
      operation,
      actionContent: currentAction?.nextAction ?? next.next_action,
      previousStatus: existing?.status ?? null,
      nextStatus: next.status,
      result: "executed",
      status: "succeeded",
      executedBy,
      actorKind: "human",
      externalDelivery: "none",
      approvalRequired: false,
      executedAt: nowIso,
      reason:
        next.status === "lost"
          ? (next.lost_reason ?? "unknown")
          : currentAction?.reason ?? null,
      metadata: {
        lostReason: next.lost_reason,
        probability: next.probability,
      },
      idempotencyKey:
        providedKey ??
        buildIdempotencyKey({
          operation,
          previousStatus: existing?.status ?? null,
          nextStatus: next.status,
          lostReason: next.lost_reason,
        }),
    });

    return NextResponse.json({
      success: true,
      dealId: next.id,
      status: next.status,
      probability: next.probability,
      nextAction: next.next_action,
      nextFollowupAt: next.next_followup_at,
      lostReason: next.lost_reason,
      wonAt: next.won_at,
      lostAt: next.lost_at,
      duplicate: unchanged || history.duplicate,
      history: apiSalesActionEvent(history.event),
    });
  } catch (error) {
    const errorMessage = publicErrorMessage(error, "Failed to update deal status");
    console.error("[ai/deal-status] POST failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
