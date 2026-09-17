import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  normalizeCompanyName,
  normalizeDomain,
} from "@/lib/sales/company-identity";

export async function findOrCreateAccount(input: {
  name: string;
  domain?: string | null;
  websiteUrl?: string | null;
  industry?: string | null;
  location?: string | null;
  country?: string | null;
  employeeCount?: number | null;
  registrationId?: string | null;
  source?: string;
  sourceId?: string | null;
}): Promise<{ id: string; created: boolean }> {
  const supabase = getSupabaseAdmin();
  const name = input.name.trim();
  const normalizedName = normalizeCompanyName(name);
  const normalizedDomain =
    normalizeDomain(input.domain) ?? normalizeDomain(input.websiteUrl);
  const registration = input.registrationId?.trim().toUpperCase() || null;
  const country = input.country?.trim() || input.location?.trim() || null;

  if (normalizedDomain) {
    const { data } = await supabase
      .from("companies")
      .select("id")
      .eq("normalized_domain", normalizedDomain)
      .maybeSingle();
    if (data?.id) {
      await touchAccount(data.id, input);
      return { id: data.id, created: false };
    }
    const { data: byDomain } = await supabase
      .from("companies")
      .select("id")
      .eq("domain", normalizedDomain)
      .maybeSingle();
    if (byDomain?.id) {
      await touchAccount(byDomain.id, input);
      return { id: byDomain.id, created: false };
    }
  }

  if (registration) {
    const { data } = await supabase
      .from("companies")
      .select("id")
      .eq("registration_id", registration)
      .maybeSingle();
    if (data?.id) {
      await touchAccount(data.id, input);
      return { id: data.id, created: false };
    }
  }

  if (normalizedName) {
    const query = supabase
      .from("companies")
      .select("id, country, location")
      .eq("normalized_name", normalizedName)
      .limit(5);
    const { data: named } = await query;
    const match = (named ?? []).find((row) => {
      if (!country) return true;
      const existing = `${row.country ?? ""} ${row.location ?? ""}`.toLowerCase();
      return !existing.trim() || existing.includes(country.toLowerCase());
    });
    if (match?.id) {
      await touchAccount(match.id, input);
      return { id: match.id, created: false };
    }
  }

  const identityKey = normalizedDomain
    ? `domain:${normalizedDomain}`
    : `name:${normalizedName ?? name.toLowerCase()}`;

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name,
      domain: normalizedDomain,
      normalized_name: normalizedName,
      normalized_domain: normalizedDomain,
      industry: input.industry ?? null,
      location: input.location ?? country,
      country,
      employee_count: input.employeeCount ?? null,
      website_url: input.websiteUrl ?? null,
      registration_id: registration,
      source: input.source ?? "nbos",
      source_id: input.sourceId ?? identityKey,
      account_status: "NEW_ACCOUNT",
      data: { identity_key: identityKey },
    })
    .select("id")
    .single();

  if (error) {
    if (normalizedDomain) {
      const { data: again } = await supabase
        .from("companies")
        .select("id")
        .eq("normalized_domain", normalizedDomain)
        .maybeSingle();
      if (again?.id) return { id: again.id, created: false };
    }
    throw new Error(error.message);
  }

  return { id: data.id, created: true };
}

async function touchAccount(
  companyId: string,
  input: {
    industry?: string | null;
    location?: string | null;
    country?: string | null;
    employeeCount?: number | null;
    websiteUrl?: string | null;
    domain?: string | null;
    registrationId?: string | null;
  }
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: current } = await supabase
    .from("companies")
    .select(
      "industry, location, country, employee_count, website_url, domain, normalized_domain, normalized_name, name, registration_id"
    )
    .eq("id", companyId)
    .maybeSingle();
  if (!current) return;

  const normalizedDomain =
    current.normalized_domain ??
    normalizeDomain(input.domain) ??
    normalizeDomain(current.domain);
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    normalized_name: current.normalized_name ?? normalizeCompanyName(current.name),
    normalized_domain: normalizedDomain,
  };
  if (!current.industry && input.industry) patch.industry = input.industry;
  if (!current.location && (input.location || input.country)) {
    patch.location = input.location ?? input.country;
  }
  if (!current.country && input.country) patch.country = input.country;
  if (current.employee_count == null && input.employeeCount != null) {
    patch.employee_count = input.employeeCount;
  }
  if (!current.website_url && input.websiteUrl) patch.website_url = input.websiteUrl;
  if (!current.domain && normalizedDomain) patch.domain = normalizedDomain;
  if (!current.registration_id && input.registrationId) {
    patch.registration_id = input.registrationId.trim().toUpperCase();
  }
  await supabase.from("companies").update(patch).eq("id", companyId);
}
