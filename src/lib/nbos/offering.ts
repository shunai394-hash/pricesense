import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  emptyIcp,
  type IcpProfile,
  type Offering,
} from "@/lib/nbos/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseIcp(value: unknown): IcpProfile {
  const base = emptyIcp();
  if (!isRecord(value)) return base;
  const firm = isRecord(value.firmographic) ? value.firmographic : {};
  const business = isRecord(value.business_model) ? value.business_model : {};
  const problem = isRecord(value.problem) ? value.problem : {};
  const technology = isRecord(value.technology) ? value.technology : {};
  const geography = isRecord(value.geography) ? value.geography : {};
  const organization = isRecord(value.organization) ? value.organization : {};
  const negative = isRecord(value.negative) ? value.negative : {};
  return {
    firmographic: {
      industries: stringArray(firm.industries),
      employee_min: typeof firm.employee_min === "number" ? firm.employee_min : null,
      employee_max: typeof firm.employee_max === "number" ? firm.employee_max : null,
      notes: typeof firm.notes === "string" ? firm.notes : "",
    },
    business_model: {
      include: stringArray(business.include),
      exclude: stringArray(business.exclude),
      notes: typeof business.notes === "string" ? business.notes : "",
    },
    problem: {
      triggers: stringArray(problem.triggers),
      notes: typeof problem.notes === "string" ? problem.notes : "",
    },
    technology: {
      include: stringArray(technology.include),
      exclude: stringArray(technology.exclude),
      notes: typeof technology.notes === "string" ? technology.notes : "",
    },
    geography: {
      regions: stringArray(geography.regions),
      countries: stringArray(geography.countries),
      notes: typeof geography.notes === "string" ? geography.notes : "",
    },
    organization: {
      departments: stringArray(organization.departments),
      roles: stringArray(organization.roles),
      notes: typeof organization.notes === "string" ? organization.notes : "",
    },
    negative: {
      industries: stringArray(negative.industries),
      conditions: stringArray(negative.conditions),
      notes: typeof negative.notes === "string" ? negative.notes : "",
    },
  };
}

function parseSize(value: unknown): Offering["target_company_size"] {
  if (!isRecord(value)) return {};
  return {
    labels: stringArray(value.labels),
    employee_min: typeof value.employee_min === "number" ? value.employee_min : null,
    employee_max: typeof value.employee_max === "number" ? value.employee_max : null,
  };
}

function mapOffering(row: Record<string, unknown>): Offering {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    description: typeof row.description === "string" ? row.description : null,
    problem_solved: typeof row.problem_solved === "string" ? row.problem_solved : null,
    target_industries: stringArray(row.target_industries),
    target_company_size: parseSize(row.target_company_size),
    target_regions: stringArray(row.target_regions),
    target_departments: stringArray(row.target_departments),
    target_roles: stringArray(row.target_roles),
    qualification_conditions: stringArray(row.qualification_conditions),
    exclusion_conditions: stringArray(row.exclusion_conditions),
    icp: parseIcp(row.icp),
    is_active: row.is_active === true,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

const COLUMNS =
  "id, name, description, problem_solved, target_industries, target_company_size, target_regions, target_departments, target_roles, qualification_conditions, exclusion_conditions, icp, is_active, created_at, updated_at";

export async function listOfferings(): Promise<Offering[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("offerings")
    .select(COLUMNS)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapOffering(row as Record<string, unknown>));
}

export async function loadActiveOffering(): Promise<Offering | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("offerings")
    .select(COLUMNS)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapOffering(data as Record<string, unknown>) : null;
}

export async function loadOffering(id: string): Promise<Offering | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("offerings")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapOffering(data as Record<string, unknown>) : null;
}

export interface OfferingInput {
  name: string;
  description?: string | null;
  problem_solved?: string | null;
  target_industries?: string[];
  target_company_size?: Offering["target_company_size"];
  target_regions?: string[];
  target_departments?: string[];
  target_roles?: string[];
  qualification_conditions?: string[];
  exclusion_conditions?: string[];
  icp?: Partial<IcpProfile> | IcpProfile;
  is_active?: boolean;
}

function payloadFromInput(input: OfferingInput) {
  const icp = {
    ...emptyIcp(),
    ...(input.icp ?? {}),
    firmographic: {
      ...emptyIcp().firmographic,
      ...(input.icp && "firmographic" in input.icp ? input.icp.firmographic : {}),
    },
    business_model: {
      ...emptyIcp().business_model,
      ...(input.icp && "business_model" in input.icp ? input.icp.business_model : {}),
    },
    problem: {
      ...emptyIcp().problem,
      ...(input.icp && "problem" in input.icp ? input.icp.problem : {}),
    },
    technology: {
      ...emptyIcp().technology,
      ...(input.icp && "technology" in input.icp ? input.icp.technology : {}),
    },
    geography: {
      ...emptyIcp().geography,
      ...(input.icp && "geography" in input.icp ? input.icp.geography : {}),
    },
    organization: {
      ...emptyIcp().organization,
      ...(input.icp && "organization" in input.icp ? input.icp.organization : {}),
    },
    negative: {
      ...emptyIcp().negative,
      ...(input.icp && "negative" in input.icp ? input.icp.negative : {}),
    },
  };
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    problem_solved: input.problem_solved?.trim() || null,
    target_industries: input.target_industries ?? [],
    target_company_size: input.target_company_size ?? {},
    target_regions: input.target_regions ?? [],
    target_departments: input.target_departments ?? [],
    target_roles: input.target_roles ?? [],
    qualification_conditions: input.qualification_conditions ?? [],
    exclusion_conditions: input.exclusion_conditions ?? [],
    icp,
    updated_at: new Date().toISOString(),
  };
}

export async function saveOffering(input: OfferingInput & { id?: string }): Promise<Offering> {
  const supabase = getSupabaseAdmin();
  const payload = payloadFromInput(input);
  const activate = input.is_active === true;

  if (activate) {
    await supabase
      .from("offerings")
      .update({ is_active: false, updated_at: payload.updated_at })
      .eq("is_active", true);
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("offerings")
      .update({ ...payload, is_active: activate || undefined })
      .eq("id", input.id)
      .select(COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    if (activate) {
      await supabase
        .from("offerings")
        .update({ is_active: true, updated_at: payload.updated_at })
        .eq("id", input.id);
    }
    const saved = await loadOffering(data.id);
    if (!saved) throw new Error("Offering save failed");
    return saved;
  }

  const { data, error } = await supabase
    .from("offerings")
    .insert({ ...payload, is_active: activate })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mapOffering(data as Record<string, unknown>);
}

export async function activateOffering(id: string): Promise<Offering> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  await supabase
    .from("offerings")
    .update({ is_active: false, updated_at: now })
    .eq("is_active", true);
  const { error } = await supabase
    .from("offerings")
    .update({ is_active: true, updated_at: now })
    .eq("id", id);
  if (error) throw new Error(error.message);
  const saved = await loadOffering(id);
  if (!saved) throw new Error("Offering not found");
  return saved;
}

export async function appendNegativeIcp(
  offeringId: string,
  condition: string
): Promise<void> {
  const offering = await loadOffering(offeringId);
  if (!offering) return;
  const conditions = offering.icp.negative.conditions;
  if (conditions.includes(condition)) return;
  const icp = {
    ...offering.icp,
    negative: {
      ...offering.icp.negative,
      conditions: [...conditions, condition],
    },
  };
  const supabase = getSupabaseAdmin();
  await supabase
    .from("offerings")
    .update({ icp, updated_at: new Date().toISOString() })
    .eq("id", offeringId);
}

export function offeringSearchQueries(offering: Offering): Array<{
  query: string;
  region: string;
}> {
  const triggers =
    offering.icp.problem.triggers.length > 0
      ? offering.icp.problem.triggers
      : ["新規事業", "海外進出", "資金調達", "新製品", "拠点開設"];
  const industries =
    offering.target_industries.length > 0
      ? offering.target_industries.slice(0, 3)
      : offering.icp.firmographic.industries.slice(0, 3);
  const regions =
    offering.target_regions.length > 0 ? offering.target_regions : ["japan"];

  const queries: Array<{ query: string; region: string }> = [];
  const japan = regions.includes("japan") ? "japan" : regions[0] ?? "global";
  const englishRegion = regions.find((item) => item !== "japan") ?? "north_america";

  for (const trigger of triggers.slice(0, 3)) {
    const industryPart = industries[0] ? ` ${industries[0]}` : "";
    queries.push({ query: `${trigger}${industryPart}`, region: japan });
  }

  queries.push({
    query: `"raises funding" OR "Series A" OR expansion OR "new product"`,
    region: englishRegion,
  });

  const unique = new Map<string, { query: string; region: string }>();
  for (const item of queries) {
    unique.set(`${item.region}:${item.query}`, item);
  }
  return [...unique.values()].slice(0, 4);
}
