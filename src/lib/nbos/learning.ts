import { getSupabaseAdmin } from "@/lib/server/supabase";
import { appendNegativeIcp } from "@/lib/nbos/offering";
import {
  isLearningLabel,
  type LearningLabel,
} from "@/lib/nbos/types";

export async function recordSalesLearning(input: {
  label: LearningLabel;
  note?: string | null;
  offeringId?: string | null;
  companyId?: string | null;
  prospectId?: string | null;
  leadId?: string | null;
  discoveryId?: string | null;
}): Promise<{ id: string; appliedToIcp: boolean }> {
  if (!isLearningLabel(input.label)) {
    throw new Error("Unknown learning label");
  }
  const supabase = getSupabaseAdmin();
  let appliedToIcp = false;
  const negativeLabels: LearningLabel[] = [
    "WRONG_COMPANY",
    "WRONG_DEPARTMENT",
    "WRONG_PERSONA",
    "BAD_TIMING",
    "WRONG_NEED",
    "COMPETITOR",
    "ALREADY_CUSTOMER",
  ];

  if (input.offeringId && negativeLabels.includes(input.label)) {
    const condition = [input.label, input.note?.trim()].filter(Boolean).join(": ");
    await appendNegativeIcp(input.offeringId, condition.slice(0, 180));
    appliedToIcp = true;
  }

  if (input.label === "ALREADY_CUSTOMER" && input.companyId) {
    await supabase
      .from("companies")
      .update({
        account_status: "CUSTOMER",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.companyId);
  }

  if (
    (input.label === "WRONG_COMPANY" || input.label === "WRONG_NEED") &&
    input.prospectId
  ) {
    await supabase
      .from("prospects")
      .update({
        pursue_decision: "disqualify",
        status: "disqualified",
        ready_to_contact: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.prospectId);
  }

  const { data, error } = await supabase
    .from("sales_learning_feedback")
    .insert({
      offering_id: input.offeringId ?? null,
      company_id: input.companyId ?? null,
      prospect_id: input.prospectId ?? null,
      lead_id: input.leadId ?? null,
      discovery_id: input.discoveryId ?? null,
      label: input.label,
      note: input.note ?? null,
      applied_to_icp: appliedToIcp,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, appliedToIcp };
}

export async function loadLearningSummary(offeringId?: string | null) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("sales_learning_feedback")
    .select("id, label, note, applied_to_icp, created_at, company_id")
    .order("created_at", { ascending: false })
    .limit(40);
  if (offeringId) query = query.eq("offering_id", offeringId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.label] = (counts[row.label] ?? 0) + 1;
  }
  return { items: data ?? [], counts };
}
