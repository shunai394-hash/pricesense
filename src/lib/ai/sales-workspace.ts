import { parseConversation } from "@/lib/ai/respond";
import {
  lastConversationAt,
  type SalesAction,
} from "@/lib/ai/sales-actions";
import {
  categorizeFollowup,
  leadTemperature,
  type FollowupBucket,
} from "@/lib/sales/workspace-ui";
import type { LeadTemperature } from "@/lib/ai/revops";

export interface WorkspaceLeadRow {
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

export interface WorkspaceDealRow {
  id: string;
  lead_id: string;
  meeting_id?: string | null;
  proposal_id?: string | null;
  quote_id?: string | null;
  status: string | null;
  probability?: number | null;
  expected_value?: number | string | null;
  currency?: string | null;
  next_action: string | null;
  next_followup_at: string | null;
  lost_reason?: string | null;
  updated_at: string | null;
  created_at: string | null;
}

export interface WorkspaceFollowupRow {
  lead_id: string;
  followup_status: string | null;
  followup_count?: number | null;
  next_followup_at: string | null;
  last_contacted_at?: string | null;
  stopped_at?: string | null;
  stop_reason: string | null;
  created_at?: string | null;
}

export interface WorkspaceMeetingRow {
  id: string;
  lead_id: string;
  meeting_status: string | null;
  meeting_at: string | null;
  summary: string | null;
  customer_needs: unknown;
  objections: unknown;
  agreed_points: unknown;
  unresolved_points: unknown;
  next_action: string | null;
  created_at: string;
}

export interface WorkspaceProposalRow {
  id: string;
  lead_id: string;
  meeting_id?: string | null;
  title: string | null;
  problem: string | null;
  proposed_solution: string | null;
  benefits: unknown;
  implementation_plan: unknown;
  assumptions: unknown;
  risks: unknown;
  next_steps: unknown;
  status: string | null;
  created_at: string;
}

export interface WorkspaceLeadItem {
  leadId: string;
  email: string | null;
  categoryName: string | null;
  leadSource: string | null;
  score: number | null;
  temperature: LeadTemperature;
  escalationStatus: string | null;
  nextAction: string | null;
  createdAt: string;
  lastConversationAt: string | null;
  dealStatus: string | null;
  dealId: string | null;
}

export interface WorkspaceDealItem {
  id: string;
  leadId: string;
  email: string | null;
  categoryName: string | null;
  status: string | null;
  probability: number | null;
  expectedValue: number | null;
  currency: string | null;
  nextAction: string | null;
  nextFollowupAt: string | null;
  createdAt: string | null;
  lostReason: string | null;
}

export interface WorkspaceMeetingItem {
  id: string;
  leadId: string;
  email: string | null;
  categoryName: string | null;
  meetingAt: string | null;
  meetingStatus: string | null;
  summary: string | null;
  customerNeeds: string[];
  objections: string[];
  agreedPoints: string[];
  unresolvedPoints: string[];
  nextAction: string | null;
  createdAt: string;
}

export interface WorkspaceProposalItem {
  id: string;
  leadId: string;
  email: string | null;
  categoryName: string | null;
  title: string | null;
  problem: string | null;
  proposedSolution: string | null;
  benefits: string[];
  implementationPlan: string[];
  assumptions: string[];
  risks: string[];
  nextSteps: string[];
  status: string | null;
  createdAt: string;
}

export interface WorkspaceFollowupItem {
  leadId: string;
  email: string | null;
  categoryName: string | null;
  source: "lead" | "deal";
  dealId: string | null;
  status: string | null;
  nextFollowupAt: string | null;
  stopReason: string | null;
  followupCount: number | null;
  lastContactedAt: string | null;
  bucket: FollowupBucket;
  who: string;
  what: string;
  when: string | null;
  why: string;
  stage: string;
}

export interface SalesWorkspaceCatalog {
  leads: WorkspaceLeadItem[];
  deals: WorkspaceDealItem[];
  meetings: WorkspaceMeetingItem[];
  proposals: WorkspaceProposalItem[];
  followups: WorkspaceFollowupItem[];
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

export function buildSalesWorkspaceCatalog(input: {
  leads: WorkspaceLeadRow[];
  deals: WorkspaceDealRow[];
  followups: WorkspaceFollowupRow[];
  meetings: WorkspaceMeetingRow[];
  proposals: WorkspaceProposalRow[];
  actions?: SalesAction[];
  now?: Date;
}): SalesWorkspaceCatalog {
  const now = input.now ?? new Date();
  const dealByLead = new Map<string, WorkspaceDealRow>();
  for (const deal of input.deals) {
    if (!deal.lead_id || dealByLead.has(deal.lead_id)) continue;
    dealByLead.set(deal.lead_id, deal);
  }

  const followupByLead = new Map<string, WorkspaceFollowupRow>();
  for (const row of input.followups) {
    if (!row.lead_id || followupByLead.has(row.lead_id)) continue;
    followupByLead.set(row.lead_id, row);
  }

  const leadById = new Map(input.leads.map((lead) => [lead.id, lead]));
  const actionByLead = new Map(
    (input.actions ?? []).map((action) => [action.leadId, action])
  );

  const leads: WorkspaceLeadItem[] = input.leads.map((lead) => {
    const deal = dealByLead.get(lead.id);
    const action = actionByLead.get(lead.id);
    const conversation = parseConversation(lead.conversation);
    return {
      leadId: lead.id,
      email: lead.email ?? null,
      categoryName: lead.category_name ?? null,
      leadSource: lead.lead_source ?? null,
      score: typeof lead.score === "number" ? lead.score : null,
      temperature: leadTemperature({
        score: typeof lead.score === "number" ? lead.score : null,
        escalationStatus: lead.escalation_status ?? null,
      }),
      escalationStatus: lead.escalation_status ?? null,
      nextAction: action?.nextAction || deal?.next_action || lead.next_action || null,
      createdAt: lead.created_at,
      lastConversationAt: lastConversationAt(conversation),
      dealStatus: deal?.status ?? null,
      dealId: deal?.id ?? null,
    };
  });

  const deals: WorkspaceDealItem[] = input.deals.map((deal) => {
    const lead = leadById.get(deal.lead_id);
    return {
      id: deal.id,
      leadId: deal.lead_id,
      email: lead?.email ?? null,
      categoryName: lead?.category_name ?? null,
      status: deal.status ?? null,
      probability:
        typeof deal.probability === "number" && Number.isFinite(deal.probability)
          ? deal.probability
          : null,
      expectedValue: asNullableNumber(deal.expected_value),
      currency: deal.currency ?? null,
      nextAction: deal.next_action ?? null,
      nextFollowupAt: deal.next_followup_at ?? null,
      createdAt: deal.created_at ?? null,
      lostReason: deal.lost_reason ?? null,
    };
  });

  const meetings: WorkspaceMeetingItem[] = input.meetings.map((meeting) => {
    const lead = leadById.get(meeting.lead_id);
    return {
      id: meeting.id,
      leadId: meeting.lead_id,
      email: lead?.email ?? null,
      categoryName: lead?.category_name ?? null,
      meetingAt: meeting.meeting_at ?? null,
      meetingStatus: meeting.meeting_status ?? null,
      summary: meeting.summary ?? null,
      customerNeeds: asStringArray(meeting.customer_needs),
      objections: asStringArray(meeting.objections),
      agreedPoints: asStringArray(meeting.agreed_points),
      unresolvedPoints: asStringArray(meeting.unresolved_points),
      nextAction: meeting.next_action ?? null,
      createdAt: meeting.created_at,
    };
  });

  const proposals: WorkspaceProposalItem[] = input.proposals.map((proposal) => {
    const lead = leadById.get(proposal.lead_id);
    return {
      id: proposal.id,
      leadId: proposal.lead_id,
      email: lead?.email ?? null,
      categoryName: lead?.category_name ?? null,
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
    };
  });

  const followups: WorkspaceFollowupItem[] = [];
  for (const lead of input.leads) {
    const deal = dealByLead.get(lead.id);
    const followup = followupByLead.get(lead.id);
    const hasDeal = Boolean(deal);
    const nextFollowupAt = hasDeal
      ? deal?.next_followup_at ?? null
      : followup?.followup_status === "stopped" ||
          followup?.followup_status === "closed" ||
          Boolean(followup?.stop_reason)
        ? null
        : followup?.next_followup_at ?? null;

    const status = hasDeal
      ? deal?.status ?? null
      : followup?.followup_status ?? null;
    const stopReason = followup?.stop_reason ?? null;
    const bucket = categorizeFollowup({
      nextFollowupAt,
      followupStatus: followup?.followup_status ?? null,
      stopReason,
      dealStatus: deal?.status ?? null,
      now,
    });

    const include =
      Boolean(nextFollowupAt) ||
      bucket === "stopped" ||
      bucket === "done" ||
      Boolean(followup) ||
      Boolean(deal);
    if (!include) continue;

    followups.push({
      leadId: lead.id,
      email: lead.email ?? null,
      categoryName: lead.category_name ?? null,
      source: hasDeal ? "deal" : "lead",
      dealId: deal?.id ?? null,
      status,
      nextFollowupAt,
      stopReason,
      followupCount:
        typeof followup?.followup_count === "number"
          ? followup.followup_count
          : null,
      lastContactedAt: followup?.last_contacted_at ?? null,
      bucket,
      who: lead.email || lead.category_name || lead.id,
      what:
        deal?.next_action ||
        lead.next_action ||
        "次の確認事項を整理する",
      when: nextFollowupAt,
      why:
        stopReason ||
        (deal?.lost_reason ?? null) ||
        (hasDeal ? "Dealの次確認" : "Leadの未完了フォロー"),
      stage: hasDeal
        ? `Deal / ${deal?.status ?? "open"}`
        : lead.escalation_status || lead.next_action || "Lead",
    });
  }

  return { leads, deals, meetings, proposals, followups };
}
