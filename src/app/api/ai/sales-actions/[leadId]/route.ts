import { NextResponse } from "next/server";
import { apiSalesBrief, type SalesBrief } from "@/lib/ai/sales-brief";
import { parseConversation } from "@/lib/ai/respond";
import {
  classifySalesAction,
  effectiveNextFollowupAt,
  lastActivityAt,
  lastConversationAt,
} from "@/lib/ai/sales-actions";
import { apiSalesActionEvent } from "@/lib/ai/sales-action-history";
import { parseOptionalLeadId } from "@/lib/sales/scoring";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { listSalesActionEventsForLead } from "@/lib/server/sales-action-events";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseBrief(value: unknown): ReturnType<typeof apiSalesBrief> | null {
  if (!value || typeof value !== "object") return null;
  const brief = value as SalesBrief;
  return apiSalesBrief(brief);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ leadId: string }> }
) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  const params = await context.params;
  const leadId = parseOptionalLeadId({ leadId: params.leadId });
  if (!leadId) {
    return NextResponse.json(
      { success: false, error: "Invalid leadId" },
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

  try {
    const supabase = getSupabaseAdmin();
    const { data: leadRow, error: leadError } = await supabase
      .from("leads")
      .select(
        "id, email, category_name, lead_source, category_id, user_rate, market_rate, diagnosis_level, target_rate, score, escalation_status, next_action, conversation, handed_off_at, handoff_channel, created_at, intent_signals, primary_objection, model_version"
      )
      .eq("id", leadId)
      .maybeSingle();
    if (leadError) throw new Error(leadError.message);
    if (!leadRow) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    const [
      objectionsResult,
      handoffResult,
      meetingsResult,
      proposalsResult,
      quotesResult,
      dealResult,
      leadFollowupResult,
      leadFollowupEventsResult,
    ] = await Promise.all([
      supabase
        .from("objection_events")
        .select(
          "id, objection_type, objection_key, customer_message, raw_text, response_play, created_at"
        )
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true }),
      supabase
        .from("sales_handoffs")
        .select("id, status, score, brief, handoff_reason, handed_off_at, meeting_status, created_at")
        .eq("lead_id", leadId)
        .maybeSingle(),
      supabase
        .from("sales_meetings")
        .select(
          "id, meeting_status, meeting_at, summary, customer_needs, objections, agreed_points, unresolved_points, next_action, created_at"
        )
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
      supabase
        .from("proposal_drafts")
        .select(
          "id, meeting_id, title, problem, proposed_solution, benefits, implementation_plan, assumptions, risks, next_steps, status, created_at"
        )
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
      supabase
        .from("quote_drafts")
        .select(
          "id, meeting_id, items, subtotal, discount, total, currency, assumptions, valid_until, status, created_at"
        )
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
      supabase
        .from("sales_deals")
        .select(
          "id, meeting_id, proposal_id, quote_id, status, probability, expected_value, currency, next_action, next_followup_at, lost_reason, won_at, lost_at, created_at, updated_at"
        )
        .eq("lead_id", leadId)
        .maybeSingle(),
      supabase
        .from("lead_followups")
        .select(
          "followup_status, followup_count, next_followup_at, last_contacted_at, stopped_at, stop_reason"
        )
        .eq("lead_id", leadId)
        .maybeSingle(),
      supabase
        .from("followup_events")
        .select("id, sequence_number, message, status, scheduled_at, created_at, stop_reason")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true }),
    ]);

    const loadErrors = [
      objectionsResult.error,
      handoffResult.error,
      meetingsResult.error,
      proposalsResult.error,
      quotesResult.error,
      dealResult.error,
      leadFollowupResult.error,
      leadFollowupEventsResult.error,
    ].filter(Boolean);
    if (loadErrors.length > 0) {
      console.error(
        "[ai/sales-actions] detail load skipped:",
        loadErrors.map((item) => item?.message).join("; ")
      );
    }

    const deal = dealResult.data;
    let dealEvents: Array<{
      id: string;
      sequence_number: number | null;
      message: string | null;
      reason: string | null;
      status: string | null;
      scheduled_at: string | null;
      created_at: string;
    }> = [];
    if (deal?.id) {
      const { data, error } = await supabase
        .from("deal_followup_events")
        .select("id, sequence_number, message, reason, status, scheduled_at, created_at")
        .eq("deal_id", deal.id)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("[ai/sales-actions] deal followup load skipped:", error.message);
      } else {
        dealEvents = data ?? [];
      }
    }

    const conversation = parseConversation(leadRow.conversation);
    const meeting = meetingsResult.data?.[0] ?? null;
    const proposal = proposalsResult.data?.[0] ?? null;
    const quote = quotesResult.data?.[0] ?? null;
    const followup = leadFollowupResult.data;
    const leadFollowupStopped =
      followup?.followup_status === "stopped" ||
      followup?.followup_status === "closed" ||
      Boolean(followup?.stop_reason);

    const nextFollowupAt = effectiveNextFollowupAt({
      hasDeal: Boolean(deal),
      dealNextFollowupAt: deal?.next_followup_at ?? null,
      leadNextFollowupAt: followup?.next_followup_at ?? null,
      leadFollowupStopped,
    });

    const action = classifySalesAction(
      {
        leadId,
        dealId: deal?.id ?? null,
        score: typeof leadRow.score === "number" ? leadRow.score : null,
        leadStatus: leadRow.escalation_status ?? null,
        dealStatus: deal?.status ?? null,
        nextAction: deal?.next_action || leadRow.next_action || meeting?.next_action || null,
        nextFollowupAt,
        lastActivityAt: lastActivityAt([
          lastConversationAt(conversation),
          deal?.updated_at,
          meeting?.created_at,
          leadRow.handed_off_at,
          leadRow.created_at,
        ]),
        email: leadRow.email ?? null,
        categoryName: leadRow.category_name ?? null,
        leadSource: leadRow.lead_source ?? null,
      },
      new Date()
    );

    const followupHistory = [
      ...(leadFollowupEventsResult.data ?? []).map((event) => ({
        id: event.id,
        source: "lead" as const,
        sequenceNumber: event.sequence_number ?? null,
        message: event.message ?? null,
        reason: event.stop_reason ?? null,
        status: event.status ?? null,
        scheduledAt: event.scheduled_at ?? null,
        createdAt: event.created_at,
      })),
      ...dealEvents.map((event) => ({
        id: event.id,
        source: "deal" as const,
        sequenceNumber: event.sequence_number ?? null,
        message: event.message ?? null,
        reason: event.reason ?? null,
        status: event.status ?? null,
        scheduledAt: event.scheduled_at ?? null,
        createdAt: event.created_at,
      })),
    ].sort((a, b) => {
      const left = Date.parse(a.createdAt);
      const right = Date.parse(b.createdAt);
      if (Number.isNaN(left) || Number.isNaN(right)) {
        return a.createdAt.localeCompare(b.createdAt);
      }
      return left - right;
    });

    let actionHistory: ReturnType<typeof apiSalesActionEvent>[] = [];
    try {
      const events = await listSalesActionEventsForLead(leadId);
      actionHistory = events.map(apiSalesActionEvent);
    } catch (historyError) {
      console.error(
        "[ai/sales-actions] action history load skipped:",
        historyError instanceof Error ? historyError.message : historyError
      );
    }

    return NextResponse.json({
      success: true,
      action,
      lead: {
        id: leadRow.id,
        email: leadRow.email ?? null,
        categoryName: leadRow.category_name ?? null,
        categoryId: leadRow.category_id ?? null,
        leadSource: leadRow.lead_source ?? null,
        userRate: leadRow.user_rate ?? null,
        marketRate: leadRow.market_rate ?? null,
        diagnosisLevel: leadRow.diagnosis_level ?? null,
        targetRate: leadRow.target_rate ?? null,
        handedOffAt: leadRow.handed_off_at ?? null,
        handoffChannel: leadRow.handoff_channel ?? null,
        createdAt: leadRow.created_at,
        primaryObjection: leadRow.primary_objection ?? null,
        modelVersion: leadRow.model_version ?? null,
      },
      score: {
        score: typeof leadRow.score === "number" ? leadRow.score : null,
        escalationStatus: leadRow.escalation_status ?? null,
        nextAction: leadRow.next_action ?? null,
        intentSignals: leadRow.intent_signals ?? null,
      },
      conversation,
      objections: (objectionsResult.data ?? []).map((event) => ({
        id: event.id,
        objectionType: event.objection_type ?? event.objection_key ?? null,
        customerMessage: event.customer_message ?? event.raw_text ?? null,
        responsePlay: event.response_play ?? null,
        createdAt: event.created_at,
      })),
      salesBrief: parseBrief(handoffResult.data?.brief),
      meeting: meeting
        ? {
            id: meeting.id,
            meetingStatus: meeting.meeting_status ?? null,
            meetingAt: meeting.meeting_at ?? null,
            summary: meeting.summary ?? null,
            customerNeeds: asStringArray(meeting.customer_needs),
            objections: asStringArray(meeting.objections),
            agreedPoints: asStringArray(meeting.agreed_points),
            unresolvedPoints: asStringArray(meeting.unresolved_points),
            nextAction: meeting.next_action ?? null,
            createdAt: meeting.created_at,
          }
        : null,
      proposal: proposal
        ? {
            id: proposal.id,
            title: proposal.title ?? null,
            problem: proposal.problem ?? null,
            proposedSolution: proposal.proposed_solution ?? null,
            benefits: asStringArray(proposal.benefits),
            implementationPlan: asStringArray(proposal.implementation_plan),
            assumptions: asStringArray(proposal.assumptions),
            risks: asStringArray(proposal.risks),
            nextSteps: asStringArray(proposal.next_steps),
            status: proposal.status ?? null,
            createdAt: proposal.created_at,
          }
        : null,
      quote: quote
        ? {
            id: quote.id,
            items: Array.isArray(quote.items) ? quote.items : [],
            subtotal: asNullableNumber(quote.subtotal),
            discount: asNullableNumber(quote.discount),
            total: asNullableNumber(quote.total),
            currency: asNullableString(quote.currency),
            assumptions: asStringArray(quote.assumptions),
            validUntil: quote.valid_until ?? null,
            status: quote.status ?? null,
            createdAt: quote.created_at,
          }
        : null,
      deal: deal
        ? {
            id: deal.id,
            status: deal.status ?? null,
            probability: typeof deal.probability === "number" ? deal.probability : null,
            expectedValue: asNullableNumber(deal.expected_value),
            currency: asNullableString(deal.currency),
            nextAction: deal.next_action ?? null,
            nextFollowupAt: deal.next_followup_at ?? null,
            lostReason: deal.lost_reason ?? null,
            wonAt: deal.won_at ?? null,
            lostAt: deal.lost_at ?? null,
          }
        : null,
      followupHistory,
      actionHistory,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load sales lead";
    console.error("[ai/sales-actions] detail GET failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
