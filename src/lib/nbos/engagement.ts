import { getSupabaseAdmin } from "@/lib/server/supabase";
import { parseConversation } from "@/lib/ai/respond";
import type { AccountStatus } from "@/lib/nbos/types";

export interface EngagementEvidence {
  status: AccountStatus;
  reasons: string[];
  hasLead: boolean;
  hasSentOutreach: boolean;
  hasInbound: boolean;
  hasMeeting: boolean;
  hasOpenDeal: boolean;
  hasWonDeal: boolean;
  hasLostDeal: boolean;
  hasFollowup: boolean;
  existingCustomer: boolean;
}

export async function evaluateAccountEngagement(
  companyId: string
): Promise<EngagementEvidence> {
  const supabase = getSupabaseAdmin();
  const reasons: string[] = [];

  const [{ data: prospects }, { data: contacts }] = await Promise.all([
      supabase
        .from("prospects")
        .select("id, lead_id, status, pursue_decision")
        .eq("company_id", companyId),
      supabase.from("contacts").select("id, email").eq("company_id", companyId),
    ]);

  const prospectIds = (prospects ?? []).map((row) => row.id);
  const leadIds = (prospects ?? [])
    .map((row) => row.lead_id)
    .filter((value): value is string => typeof value === "string");

  let hasSentOutreach = false;
  let hasInbound = false;
  let hasMeeting = false;
  let hasOpenDeal = false;
  let hasWonDeal = false;
  let hasLostDeal = false;
  let hasFollowup = false;
  let conversationContact = false;

  if (prospectIds.length > 0) {
    const [{ data: outreach }, { data: inbox }] = await Promise.all([
      supabase
        .from("outreach_messages")
        .select("id, sent_at, status")
        .in("prospect_id", prospectIds),
      supabase
        .from("inbox_messages")
        .select("id, direction")
        .in("prospect_id", prospectIds),
    ]);
    hasSentOutreach = (outreach ?? []).some(
      (row) => Boolean(row.sent_at) || row.status === "sent"
    );
    hasInbound = (inbox ?? []).some((row) => row.direction === "inbound");
    if (hasSentOutreach) reasons.push("過去のOutreach送信がある");
    if (hasInbound) reasons.push("受信Inboxがある");
  }

  if (leadIds.length > 0) {
    const [
      { data: meetings },
      { data: deals },
      { data: followups },
      { data: leads },
    ] = await Promise.all([
      supabase
        .from("sales_meetings")
        .select("id, meeting_status")
        .in("lead_id", leadIds),
      supabase.from("sales_deals").select("id, status").in("lead_id", leadIds),
      supabase
        .from("lead_followups")
        .select("lead_id, followup_status")
        .in("lead_id", leadIds),
      supabase
        .from("leads")
        .select("id, conversation, existing_relationship")
        .in("id", leadIds),
    ]);

    hasMeeting = (meetings ?? []).some(
      (row) =>
        row.meeting_status === "scheduled" || row.meeting_status === "completed"
    );
    hasWonDeal = (deals ?? []).some((row) => row.status === "won");
    hasLostDeal = (deals ?? []).some((row) => row.status === "lost");
    hasOpenDeal = (deals ?? []).some(
      (row) => row.status !== "won" && row.status !== "lost"
    );
    hasFollowup = (followups ?? []).some(
      (row) =>
        row.followup_status === "scheduled" || row.followup_status === "idle"
    );

    for (const lead of leads ?? []) {
      const messages = parseConversation(lead.conversation);
      if (messages.some((item) => item.role === "user")) conversationContact = true;
      if (lead.existing_relationship === true) {
        reasons.push("既存関係フラグがある");
      }
    }

    if (hasMeeting) reasons.push("Meetingがある");
    if (hasOpenDeal) reasons.push("進行中Dealがある");
    if (hasWonDeal) reasons.push("既存顧客（Won Deal）");
    if (hasLostDeal) reasons.push("過去に失注Dealがある");
    if (hasFollowup) reasons.push("Follow-up履歴がある");
    if (conversationContact) reasons.push("Lead会話の返信がある");
  }

  const disqualified = (prospects ?? []).some(
    (row) =>
      row.pursue_decision === "disqualify" || row.status === "disqualified"
  );

  let status: AccountStatus = "NEW_ACCOUNT";
  if (hasWonDeal) {
    status = "CUSTOMER";
  } else if (disqualified) {
    status = "DISQUALIFIED";
  } else if (hasOpenDeal) {
    status = "OPPORTUNITY";
  } else if (hasMeeting) {
    status = "MEETING";
  } else if (hasInbound || conversationContact || hasFollowup) {
    status = "ENGAGED";
  } else if (hasSentOutreach) {
    status = "CONTACTED";
  } else if (
    (prospects ?? []).length > 0 ||
    (contacts ?? []).some((row) => row.email) ||
    leadIds.length > 0
  ) {
    status = "UNCONTACTED";
  }

  if (status === "NEW_ACCOUNT") {
    reasons.push("CRM上の接触履歴はない（下書きOutreachは接触に数えない）");
  }

  return {
    status,
    reasons,
    hasLead: leadIds.length > 0,
    hasSentOutreach,
    hasInbound,
    hasMeeting,
    hasOpenDeal,
    hasWonDeal,
    hasLostDeal,
    hasFollowup,
    existingCustomer: hasWonDeal,
  };
}

export async function persistAccountStatus(
  companyId: string,
  status: AccountStatus
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("companies")
    .update({
      account_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);
}

export function shouldBlockNewLead(evidence: EngagementEvidence): {
  blocked: boolean;
  reason: string | null;
} {
  if (evidence.existingCustomer) {
    return {
      blocked: true,
      reason: "既存顧客のため新規Lead化できません。既存AccountへSignalを追加します。",
    };
  }
  if (evidence.hasOpenDeal) {
    return {
      blocked: true,
      reason: "進行中Dealがあるため新規Leadを作りません。既存案件へResearchを追加します。",
    };
  }
  if (evidence.status === "DISQUALIFIED") {
    return {
      blocked: true,
      reason: "Disqualifiedのため新規Lead化しません。",
    };
  }
  return { blocked: false, reason: null };
}

export function isUncontacted(evidence: EngagementEvidence): boolean {
  return (
    evidence.status === "NEW_ACCOUNT" || evidence.status === "UNCONTACTED"
  );
}
