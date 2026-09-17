import { getSupabaseAdmin } from "@/lib/server/supabase";
import type { OutreachReadiness } from "@/lib/nbos/types";

export async function computeOutreachReadiness(prospectId: string): Promise<OutreachReadiness> {
  const supabase = getSupabaseAdmin();
  const { data: prospect, error } = await supabase
    .from("prospects")
    .select(
      "id, company_id, contact_id, target_department, target_role, contactability, outreach_approved_at, lead_id"
    )
    .eq("id", prospectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!prospect) {
    return {
      researchReady: false,
      contactReady: false,
      whyNowReady: false,
      messageReady: false,
      approvalReady: false,
      readyToContact: false,
    };
  }

  const [{ count: researchCount }, { count: whyNowCount }, { count: messageCount }] =
    await Promise.all([
      supabase
        .from("research_results")
        .select("id", { count: "exact", head: true })
        .eq("company_id", prospect.company_id),
      supabase
        .from("why_now_briefs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", prospect.company_id),
      supabase
        .from("outreach_messages")
        .select("id", { count: "exact", head: true })
        .eq("prospect_id", prospectId)
        .eq("status", "draft"),
    ]);

  const researchReady = (researchCount ?? 0) > 0;
  const whyNowReady = (whyNowCount ?? 0) > 0;
  const messageReady = (messageCount ?? 0) > 0;
  const contactReady =
    Boolean(prospect.contact_id) ||
    Boolean(prospect.target_department) ||
    Boolean(prospect.target_role) ||
    (prospect.contactability && prospect.contactability !== "unknown");
  const approvalReady =
    researchReady && contactReady && whyNowReady && messageReady;
  const readyToContact = approvalReady && !prospect.outreach_approved_at;

  const patch = {
    research_ready: researchReady,
    contact_ready: contactReady,
    why_now_ready: whyNowReady,
    message_ready: messageReady,
    approval_ready: approvalReady,
    ready_to_contact: readyToContact,
    updated_at: new Date().toISOString(),
  };
  await supabase.from("prospects").update(patch).eq("id", prospectId);

  return {
    researchReady,
    contactReady,
    whyNowReady,
    messageReady,
    approvalReady,
    readyToContact,
  };
}
