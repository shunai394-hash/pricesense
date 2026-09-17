import { ingestDiscoveryIntoNewBusiness } from "@/lib/nbos/pipeline";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function promoteDiscoveryToPriceSense(discoveryId: string): Promise<{
  discoveryId: string;
  companyId: string | null;
  prospectId: string | null;
  intentSignalId: string | null;
  researchResultId: string | null;
  usedAi: boolean;
  decision: string;
  accountStatus: string;
  blockedNewLead: boolean;
  autoEmail: false;
}> {
  const ingested = await ingestDiscoveryIntoNewBusiness(discoveryId);
  return {
    discoveryId: ingested.discoveryId,
    companyId: ingested.companyId,
    prospectId: ingested.prospectId,
    intentSignalId: null,
    researchResultId: null,
    usedAi: true,
    decision: ingested.decision,
    accountStatus: ingested.accountStatus,
    blockedNewLead: ingested.blockedNewLead,
    autoEmail: false,
  };
}

export async function markDiscoveryForNewfind(discoveryId: string): Promise<{
  discoveryId: string;
  consumer: "newfind";
  status: string;
}> {
  const supabase = getSupabaseAdmin();
  const { data: discovery, error } = await supabase
    .from("research_discoveries")
    .select("id, newfind_status, consumer_targets")
    .eq("id", discoveryId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!discovery) throw new Error("Discovery not found");

  await supabase.from("research_promotions").insert({
    discovery_id: discovery.id,
    consumer: "newfind",
    status: "queued",
    notes: "NEWFIND本体へは未接続。共通Research層から受け取れる状態にした",
  });

  await supabase
    .from("research_discoveries")
    .update({
      newfind_status: "promoted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", discovery.id);

  return { discoveryId: discovery.id, consumer: "newfind", status: "queued" };
}
