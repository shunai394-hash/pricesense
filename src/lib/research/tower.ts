import { getSupabaseAdmin } from "@/lib/server/supabase";
import { getWorkspaceRuntimeStatus } from "@/lib/server/integrations";
import { RESEARCH_REGION_LABEL, type ResearchRegion } from "@/lib/research/regions";

export async function loadControlTower() {
  const supabase = getSupabaseAdmin();

  const [
    correspondentsRes,
    runsRes,
    discoveriesRes,
    duplicatesRes,
    unverifiedRes,
    errorsRes,
    reviewRes,
    pricesenseRes,
    newfindRes,
    signalRes,
  ] = await Promise.all([
    supabase
      .from("research_correspondents")
      .select(
        "id, slug, name, role, correspondent_type, region_code, country_code, status, current_focus, last_run_at, last_error, cadence_minutes, search_query"
      )
      .order("name"),
    supabase
      .from("research_runs")
      .select(
        "id, correspondent_id, status, started_at, finished_at, items_fetched, discoveries_created, duplicates_skipped, error_count, used_ai, error_message, current_focus"
      )
      .order("started_at", { ascending: false })
      .limit(20),
    supabase.from("research_discoveries").select("id", { count: "exact", head: true }),
    supabase
      .from("research_discoveries")
      .select("id", { count: "exact", head: true })
      .not("duplicate_of", "is", null),
    supabase
      .from("research_discoveries")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "unverified"),
    supabase
      .from("research_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("research_discoveries")
      .select("id", { count: "exact", head: true })
      .eq("needs_human_review", true),
    supabase
      .from("research_discoveries")
      .select("id", { count: "exact", head: true })
      .eq("pricesense_status", "promoted"),
    supabase
      .from("research_discoveries")
      .select("id", { count: "exact", head: true })
      .eq("newfind_status", "promoted"),
    supabase
      .from("research_signals")
      .select("id, title, signal_type, verification_status, created_at, country, region_code")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const correspondents = correspondentsRes.data ?? [];
  const runtime = getWorkspaceRuntimeStatus();

  return {
    correspondents: correspondents.map((item) => ({
      ...item,
      regionLabel:
        RESEARCH_REGION_LABEL[item.region_code as ResearchRegion] ??
        item.region_code,
    })),
    counts: {
      active: correspondents.filter((item) => item.status === "active").length,
      paused: correspondents.filter((item) => item.status === "paused").length,
      error: correspondents.filter((item) => item.status === "error").length,
      discoveries: discoveriesRes.count ?? 0,
      duplicates: duplicatesRes.count ?? 0,
      unverified: unverifiedRes.count ?? 0,
      runErrors: errorsRes.count ?? 0,
      needsHuman: reviewRes.count ?? 0,
      sentToPriceSense: pricesenseRes.count ?? 0,
      availableToNewfind: newfindRes.count ?? 0,
    },
    recentRuns: runsRes.data ?? [],
    importantSignals: signalRes.data ?? [],
    integrations: runtime.integrations,
    ai: runtime.ai,
    emptyReason:
      correspondents.length === 0
        ? "特派員がまだ登録されていません。"
        : null,
  };
}

export async function loadKnowledgeGraph() {
  const supabase = getSupabaseAdmin();
  const [organizations, brands, products, people, places, relationships] =
    await Promise.all([
      supabase
        .from("research_organizations")
        .select("id, name, domain, country, region_code, website_url, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("research_brands")
        .select("id, name, organization_id, country, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("research_products")
        .select("id, name, brand_id, organization_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("research_people")
        .select("id, full_name, job_title, organization_id, country, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("research_places")
        .select("id, name, country, region_code, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("research_relationships")
        .select(
          "id, from_type, from_id, to_type, to_id, relation, is_hypothesis, confidence, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(80),
    ]);

  return {
    organizations: organizations.data ?? [],
    brands: brands.data ?? [],
    products: products.data ?? [],
    people: people.data ?? [],
    places: places.data ?? [],
    relationships: relationships.data ?? [],
    empty:
      (organizations.data?.length ?? 0) +
        (brands.data?.length ?? 0) +
        (products.data?.length ?? 0) +
        (relationships.data?.length ?? 0) ===
      0,
  };
}
