import { NextResponse } from "next/server";
import { parseConversation } from "@/lib/ai/respond";
import {
  buildSalesActions,
  countSalesActions,
  effectiveNextFollowupAt,
  lastActivityAt,
  lastConversationAt,
  type SalesActionSource,
} from "@/lib/ai/sales-actions";
import {
  countSalesActivity,
  utcDayBounds,
  type SalesActivityCounts,
} from "@/lib/ai/sales-action-history";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { listSalesActionEventsInRange } from "@/lib/server/sales-action-events";

export const runtime = "nodejs";

const PAGE_SIZE = 1000;

const LEAD_COLUMNS =
  "id, email, category_name, lead_source, score, escalation_status, next_action, conversation, created_at, handed_off_at";
const DEAL_COLUMNS =
  "id, lead_id, status, next_action, next_followup_at, updated_at, created_at";
const FOLLOWUP_COLUMNS =
  "lead_id, next_followup_at, followup_status, stop_reason";

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const supabase = getSupabaseAdmin();
  const rows: T[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

interface LeadRow {
  id: string;
  email: string | null;
  category_name: string | null;
  lead_source: string | null;
  score: number | null;
  escalation_status: string | null;
  next_action: string | null;
  conversation: unknown;
  created_at: string;
  handed_off_at: string | null;
}

interface DealRow {
  id: string;
  lead_id: string;
  status: string | null;
  next_action: string | null;
  next_followup_at: string | null;
  updated_at: string | null;
  created_at: string | null;
}

interface FollowupRow {
  lead_id: string;
  next_followup_at: string | null;
  followup_status: string | null;
  stop_reason: string | null;
}

function isLeadFollowupStopped(row: FollowupRow | undefined): boolean {
  if (!row) return false;
  return (
    row.followup_status === "stopped" ||
    row.followup_status === "closed" ||
    Boolean(row.stop_reason)
  );
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  if (!isSupabaseConfigured()) {
    const configError = getSupabaseConfigError() ?? "Lead API is not configured";
    return NextResponse.json(
      { success: false, error: configError },
      { status: 503 }
    );
  }

  try {
    const [leads, deals, followups] = await Promise.all([
      fetchAllRows<LeadRow>("leads", LEAD_COLUMNS),
      fetchAllRows<DealRow>("sales_deals", DEAL_COLUMNS),
      fetchAllRows<FollowupRow>("lead_followups", FOLLOWUP_COLUMNS),
    ]);

    const dealByLead = new Map<string, DealRow>();
    for (const deal of deals) {
      if (!deal.lead_id || dealByLead.has(deal.lead_id)) continue;
      dealByLead.set(deal.lead_id, deal);
    }

    const followupByLead = new Map<string, FollowupRow>();
    for (const row of followups) {
      if (!row.lead_id || followupByLead.has(row.lead_id)) continue;
      followupByLead.set(row.lead_id, row);
    }

    const sources: SalesActionSource[] = leads.map((lead) => {
      const deal = dealByLead.get(lead.id);
      const followup = followupByLead.get(lead.id);
      const conversation = parseConversation(lead.conversation);
      const nextFollowupAt = effectiveNextFollowupAt({
        hasDeal: Boolean(deal),
        dealNextFollowupAt: deal?.next_followup_at ?? null,
        leadNextFollowupAt: followup?.next_followup_at ?? null,
        leadFollowupStopped: isLeadFollowupStopped(followup),
      });

      return {
        leadId: lead.id,
        dealId: deal?.id ?? null,
        score: typeof lead.score === "number" ? lead.score : null,
        leadStatus: lead.escalation_status ?? null,
        dealStatus: deal?.status ?? null,
        nextAction: deal?.next_action || lead.next_action || null,
        nextFollowupAt,
        lastActivityAt: lastActivityAt([
          lastConversationAt(conversation),
          deal?.updated_at,
          deal?.created_at,
          lead.handed_off_at,
          lead.created_at,
        ]),
        email: lead.email ?? null,
        categoryName: lead.category_name ?? null,
        leadSource: lead.lead_source ?? null,
      };
    });

    const now = new Date();
    const actions = buildSalesActions(sources, now);
    const counts = countSalesActions(actions);
    let activity: SalesActivityCounts = {
      pending: counts.total,
      executedToday: 0,
      stoppedToday: 0,
      wonToday: 0,
      lostToday: 0,
    };
    try {
      const bounds = utcDayBounds(now);
      const todayEvents = await listSalesActionEventsInRange(bounds);
      activity = countSalesActivity({
        pending: counts.total,
        events: todayEvents,
        now,
      });
    } catch (historyError) {
      console.error(
        "[ai/sales-actions] activity load skipped:",
        historyError instanceof Error ? historyError.message : historyError
      );
    }

    return NextResponse.json({
      success: true,
      actions,
      counts,
      activity,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load sales actions";
    console.error("[ai/sales-actions] GET failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
