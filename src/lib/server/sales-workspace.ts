import { parseConversation } from "@/lib/ai/respond";
import {
  buildSalesActions,
  countSalesActions,
  effectiveNextFollowupAt,
  lastActivityAt,
  lastConversationAt,
  type SalesAction,
  type SalesActionCounts,
  type SalesActionSource,
} from "@/lib/ai/sales-actions";
import {
  countSalesActivity,
  utcDayBounds,
  type SalesActivityCounts,
} from "@/lib/ai/sales-action-history";
import {
  buildSalesWorkspaceCatalog,
  type SalesWorkspaceCatalog,
  type WorkspaceDealRow,
  type WorkspaceFollowupRow,
  type WorkspaceLeadRow,
  type WorkspaceMeetingRow,
  type WorkspaceProposalRow,
} from "@/lib/ai/sales-workspace";
import { listSalesActionEventsInRange } from "@/lib/server/sales-action-events";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const PAGE_SIZE = 1000;

const LEAD_COLUMNS =
  "id, email, category_name, lead_source, score, escalation_status, next_action, conversation, created_at, handed_off_at";
const DEAL_COLUMNS =
  "id, lead_id, meeting_id, proposal_id, quote_id, status, probability, expected_value, currency, next_action, next_followup_at, lost_reason, updated_at, created_at";
const FOLLOWUP_COLUMNS =
  "lead_id, followup_status, followup_count, next_followup_at, last_contacted_at, stopped_at, stop_reason, created_at";
const MEETING_COLUMNS =
  "id, lead_id, meeting_status, meeting_at, summary, customer_needs, objections, agreed_points, unresolved_points, next_action, created_at";
const PROPOSAL_COLUMNS =
  "id, lead_id, meeting_id, title, problem, proposed_solution, benefits, implementation_plan, assumptions, risks, next_steps, status, created_at";

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

function isLeadFollowupStopped(row: WorkspaceFollowupRow | undefined): boolean {
  if (!row) return false;
  return (
    row.followup_status === "stopped" ||
    row.followup_status === "closed" ||
    Boolean(row.stop_reason)
  );
}

export interface SalesWorkspaceSnapshot {
  actions: SalesAction[];
  counts: SalesActionCounts;
  activity: SalesActivityCounts;
  workspace: SalesWorkspaceCatalog | null;
}

export async function loadSalesWorkspaceSnapshot(options: {
  includeWorkspace?: boolean;
  now?: Date;
}): Promise<SalesWorkspaceSnapshot> {
  const now = options.now ?? new Date();
  const [leads, deals, followups] = await Promise.all([
    fetchAllRows<WorkspaceLeadRow>("leads", LEAD_COLUMNS),
    fetchAllRows<WorkspaceDealRow>("sales_deals", DEAL_COLUMNS),
    fetchAllRows<WorkspaceFollowupRow>("lead_followups", FOLLOWUP_COLUMNS),
  ]);

  const dealByLead = new Map<string, WorkspaceDealRow>();
  for (const deal of deals) {
    if (!deal.lead_id || dealByLead.has(deal.lead_id)) continue;
    dealByLead.set(deal.lead_id, deal);
  }

  const followupByLead = new Map<string, WorkspaceFollowupRow>();
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

  const actions = buildSalesActions(sources, now);
  const counts = countSalesActions(actions);
  let activity: SalesActivityCounts = {
    pending: counts.total,
    executedToday: 0,
    stoppedToday: 0,
    wonToday: 0,
    lostToday: 0,
    failedToday: 0,
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

  let workspace: SalesWorkspaceCatalog | null = null;
  if (options.includeWorkspace) {
    const [meetings, proposals] = await Promise.all([
      fetchAllRows<WorkspaceMeetingRow>("sales_meetings", MEETING_COLUMNS),
      fetchAllRows<WorkspaceProposalRow>("proposal_drafts", PROPOSAL_COLUMNS),
    ]);
    workspace = buildSalesWorkspaceCatalog({
      leads,
      deals,
      followups,
      meetings,
      proposals,
      actions,
      now,
    });
  }

  return { actions, counts, activity, workspace };
}

export async function lookupDealLeadId(
  dealId: string
): Promise<{ dealId: string; leadId: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sales_deals")
    .select("id, lead_id")
    .eq("id", dealId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id || !data.lead_id) return null;
  return { dealId: data.id, leadId: data.lead_id };
}

export interface SalesOsProspectRow {
  id: string;
  company_id: string;
  contact_id: string | null;
  status: string;
  score: number | null;
  fit_score: number | null;
  intent_score: number | null;
  priority: string | null;
  owner: string | null;
  source: string | null;
  last_activity_at: string | null;
  next_action: string | null;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
  company: {
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
    location: string | null;
    employee_count: number | null;
    revenue_range: string | null;
    website_url: string | null;
  } | null;
  contact: {
    id: string;
    full_name: string | null;
    job_title: string | null;
    department: string | null;
    seniority: string | null;
    email: string | null;
    phone: string | null;
    linkedin_url: string | null;
  } | null;
}

export async function loadSalesOsProspects(): Promise<SalesOsProspectRow[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("prospects")
    .select(`
      id,
      company_id,
      contact_id,
      status,
      score,
      fit_score,
      intent_score,
      priority,
      owner,
      source,
      last_activity_at,
      next_action,
      next_action_at,
      created_at,
      updated_at,
      companies (
        id,
        name,
        domain,
        industry,
        location,
        employee_count,
        revenue_range,
        website_url
      ),
      contacts (
        id,
        full_name,
        job_title,
        department,
        seniority,
        email,
        phone,
        linkedin_url
      )
    `)
    .order("score", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`prospects: ${error.message}`);
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id),
      company_id: String(item.company_id),
      contact_id: item.contact_id ? String(item.contact_id) : null,
      status: String(item.status ?? "new"),
      score: typeof item.score === "number" ? item.score : null,
      fit_score: typeof item.fit_score === "number" ? item.fit_score : null,
      intent_score:
        typeof item.intent_score === "number" ? item.intent_score : null,
      priority: typeof item.priority === "string" ? item.priority : null,
      owner: typeof item.owner === "string" ? item.owner : null,
      source: typeof item.source === "string" ? item.source : null,
      last_activity_at:
        typeof item.last_activity_at === "string"
          ? item.last_activity_at
          : null,
      next_action:
        typeof item.next_action === "string" ? item.next_action : null,
      next_action_at:
        typeof item.next_action_at === "string" ? item.next_action_at : null,
      created_at: String(item.created_at),
      updated_at: String(item.updated_at),
      company: (item.companies as SalesOsProspectRow["company"]) ?? null,
      contact: (item.contacts as SalesOsProspectRow["contact"]) ?? null,
    };
  });
}
