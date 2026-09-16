import { generateCompanyResearch } from "@/lib/ai/sales-research";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  createManualCompany,
  ensureProspect,
  loadCompanyResearchContext,
} from "@/lib/server/sales-os";

export async function promoteDiscoveryToPriceSense(discoveryId: string): Promise<{
  discoveryId: string;
  companyId: string;
  prospectId: string;
  intentSignalId: string | null;
  researchResultId: string | null;
  usedAi: boolean;
}> {
  const supabase = getSupabaseAdmin();
  const { data: discovery, error } = await supabase
    .from("research_discoveries")
    .select(
      `
      id,
      title,
      fact_text,
      interpretation,
      hypothesis,
      unknown,
      verification_status,
      country,
      region_code,
      pricesense_status,
      organization_id,
      brand_id,
      source_id,
      research_organizations ( id, name, domain, website_url, country ),
      research_brands ( id, name ),
      research_sources ( id, url, source_name, published_at, title )
    `
    )
    .eq("id", discoveryId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!discovery) throw new Error("Discovery not found");

  const organization = Array.isArray(discovery.research_organizations)
    ? discovery.research_organizations[0]
    : discovery.research_organizations;
  const source = Array.isArray(discovery.research_sources)
    ? discovery.research_sources[0]
    : discovery.research_sources;
  const brand = Array.isArray(discovery.research_brands)
    ? discovery.research_brands[0]
    : discovery.research_brands;

  const orgRecord =
    organization && typeof organization === "object"
      ? (organization as {
          name?: string | null;
          domain?: string | null;
          website_url?: string | null;
          country?: string | null;
        })
      : null;
  const sourceRecord =
    source && typeof source === "object"
      ? (source as {
          url?: string | null;
          source_name?: string | null;
          published_at?: string | null;
          title?: string | null;
        })
      : null;
  const brandRecord =
    brand && typeof brand === "object"
      ? (brand as { name?: string | null })
      : null;

  const companyName =
    orgRecord?.name?.trim() ||
    brandRecord?.name?.trim() ||
    null;
  if (!companyName) {
    throw new Error(
      "企業名が未確認のためPriceSenseへ送れません。人間が確認してください。"
    );
  }

  const company = await createManualCompany({
    name: companyName,
    domain: orgRecord?.domain ?? null,
    location: orgRecord?.country ?? discovery.country ?? null,
    websiteUrl: orgRecord?.website_url ?? null,
  });

  const prospect = await ensureProspect({ companyId: company.id });

  const fact = discovery.fact_text as string;
  const sourceUrl = sourceRecord?.url ?? null;
  const { data: signal } = await supabase
    .from("intent_signals")
    .insert({
      company_id: company.id,
      prospect_id: prospect.id,
      signal_type: "research_discovery",
      signal_strength: null,
      title: discovery.title,
      description: [
        `Fact: ${fact}`,
        discovery.hypothesis
          ? `Hypothesis: ${discovery.hypothesis}`
          : null,
        discovery.unknown ? `Unknown: ${discovery.unknown}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      source: sourceRecord?.source_name ?? "research_correspondent",
      source_url: sourceUrl,
      metadata: {
        discovery_id: discovery.id,
        verification_status: discovery.verification_status,
        hypothesis: discovery.hypothesis,
        fact,
        auto_email: false,
      },
    })
    .select("id")
    .single();

  let researchResultId: string | null = null;
  let usedAi = false;
  const context = await loadCompanyResearchContext(company.id);
  if (context) {
    const draft = await generateCompanyResearch(context);
    usedAi = draft.usedAi;
    const { data: research } = await supabase
      .from("research_results")
      .insert({
        company_id: company.id,
        prospect_id: prospect.id,
        research_type: "correspondent_promotion",
        summary: draft.summary,
        findings: {
          ...draft,
          discovery: {
            id: discovery.id,
            fact,
            interpretation: discovery.interpretation,
            hypothesis: discovery.hypothesis,
            unknown: discovery.unknown,
            sourceUrl,
          },
        },
        score: draft.score,
        model: draft.model,
      })
      .select("id")
      .single();
    researchResultId = research?.id ?? null;
  }

  await supabase.from("research_promotions").insert({
    discovery_id: discovery.id,
    consumer: "pricesense",
    company_id: company.id,
    prospect_id: prospect.id,
    intent_signal_id: signal?.id ?? null,
    research_result_id: researchResultId,
    status: "created",
    notes: "営業メールは自動送信していません",
  });

  await supabase
    .from("research_discoveries")
    .update({
      pricesense_status: "promoted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", discovery.id);

  await supabase
    .from("prospects")
    .update({
      next_action:
        "特派員発見の事実を確認し、必要なら営業アプローチ案を人間が承認する",
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", prospect.id);

  return {
    discoveryId: discovery.id,
    companyId: company.id,
    prospectId: prospect.id,
    intentSignalId: signal?.id ?? null,
    researchResultId,
    usedAi,
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
