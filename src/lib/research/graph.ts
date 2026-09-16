import { getSupabaseAdmin } from "@/lib/server/supabase";
import { entityCanonicalKey } from "@/lib/research/urls";

type EntityTable =
  | "research_organizations"
  | "research_people"
  | "research_brands"
  | "research_products"
  | "research_places";

async function upsertByKey(
  table: EntityTable,
  canonicalKey: string,
  insert: Record<string, unknown>
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from(table)
    .select("id")
    .eq("canonical_key", canonicalKey)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from(table)
    .insert({ ...insert, canonical_key: canonicalKey })
    .select("id")
    .single();
  if (error) {
    const { data: again } = await supabase
      .from(table)
      .select("id")
      .eq("canonical_key", canonicalKey)
      .maybeSingle();
    return again?.id ? (again.id as string) : null;
  }
  return data?.id ?? null;
}

export async function upsertOrganization(input: {
  name: string;
  domain?: string | null;
  country?: string | null;
  regionCode?: string | null;
  industry?: string | null;
  websiteUrl?: string | null;
  sourceId?: string | null;
}): Promise<string | null> {
  const name = input.name.trim();
  if (!name) return null;
  const domain = input.domain?.trim().toLowerCase() || null;
  return upsertByKey("research_organizations", entityCanonicalKey("org", name, domain), {
    name,
    domain,
    country: input.country ?? null,
    region_code: input.regionCode ?? null,
    industry: input.industry ?? null,
    website_url: input.websiteUrl ?? null,
    source_id: input.sourceId ?? null,
  });
}

export async function upsertBrand(input: {
  name: string;
  organizationId?: string | null;
  country?: string | null;
  sourceId?: string | null;
}): Promise<string | null> {
  const name = input.name.trim();
  if (!name) return null;
  return upsertByKey("research_brands", entityCanonicalKey("brand", name, input.country), {
    name,
    organization_id: input.organizationId ?? null,
    country: input.country ?? null,
    source_id: input.sourceId ?? null,
  });
}

export async function upsertProduct(input: {
  name: string;
  brandId?: string | null;
  organizationId?: string | null;
  sourceId?: string | null;
}): Promise<string | null> {
  const name = input.name.trim();
  if (!name) return null;
  return upsertByKey("research_products", entityCanonicalKey("product", name), {
    name,
    brand_id: input.brandId ?? null,
    organization_id: input.organizationId ?? null,
    source_id: input.sourceId ?? null,
  });
}

export async function upsertPlace(input: {
  name: string;
  country?: string | null;
  regionCode?: string | null;
  sourceId?: string | null;
}): Promise<string | null> {
  const name = input.name.trim();
  if (!name) return null;
  return upsertByKey("research_places", entityCanonicalKey("place", name, input.country), {
    name,
    country: input.country ?? null,
    region_code: input.regionCode ?? null,
    source_id: input.sourceId ?? null,
  });
}

export async function upsertPerson(input: {
  fullName: string;
  jobTitle?: string | null;
  organizationId?: string | null;
  country?: string | null;
  sourceId?: string | null;
}): Promise<string | null> {
  const fullName = input.fullName.trim();
  if (!fullName) return null;
  return upsertByKey(
    "research_people",
    entityCanonicalKey("person", fullName, input.organizationId),
    {
      full_name: fullName,
      job_title: input.jobTitle ?? null,
      organization_id: input.organizationId ?? null,
      country: input.country ?? null,
      source_id: input.sourceId ?? null,
    }
  );
}

export async function rememberAlias(input: {
  entityType: string;
  entityId: string;
  aliasKey: string;
  aliasValue: string;
  sourceId?: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("research_entity_aliases").upsert(
    {
      entity_type: input.entityType,
      entity_id: input.entityId,
      alias_key: input.aliasKey,
      alias_value: input.aliasValue.trim().toLowerCase(),
      source_id: input.sourceId ?? null,
    },
    { onConflict: "entity_type,alias_key,alias_value", ignoreDuplicates: true }
  );
}

export async function addRelationship(input: {
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  relation: string;
  sourceId?: string | null;
  discoveryId?: string | null;
  isHypothesis?: boolean;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("research_relationships").upsert(
    {
      from_type: input.fromType,
      from_id: input.fromId,
      to_type: input.toType,
      to_id: input.toId,
      relation: input.relation,
      source_id: input.sourceId ?? null,
      discovery_id: input.discoveryId ?? null,
      confidence: input.isHypothesis ? "hypothesis" : "unverified",
      is_hypothesis: Boolean(input.isHypothesis),
    },
    { onConflict: "from_type,from_id,to_type,to_id,relation", ignoreDuplicates: true }
  );
}
