import type { ResearchRegion } from "@/lib/research/regions";

export const RESEARCH_CONSUMERS = ["pricesense", "newfind"] as const;
export type ResearchConsumer = (typeof RESEARCH_CONSUMERS)[number];

export const CORRESPONDENT_STATUSES = ["active", "paused", "error"] as const;
export type CorrespondentStatus = (typeof CORRESPONDENT_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  "unverified",
  "source_confirmed",
  "needs_human",
  "rejected",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export interface ResearchCorrespondent {
  id: string;
  slug: string;
  name: string;
  role: string;
  correspondent_type: string;
  region_code: ResearchRegion | string;
  country_code: string | null;
  industries: unknown;
  topics: unknown;
  search_query: string | null;
  cadence_minutes: number;
  sources: unknown;
  status: CorrespondentStatus | string;
  current_focus: string | null;
  last_run_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchRun {
  id: string;
  correspondent_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  items_fetched: number;
  discoveries_created: number;
  duplicates_skipped: number;
  error_count: number;
  used_ai: boolean;
  error_message: string | null;
  current_focus: string | null;
}

export interface ResearchSource {
  id: string;
  url: string;
  canonical_url: string;
  fingerprint: string;
  source_name: string | null;
  source_type: string;
  published_at: string | null;
  retrieved_at: string;
  language: string | null;
  country: string | null;
  region_code: string | null;
  verification_status: VerificationStatus | string;
  title: string | null;
  snippet: string | null;
}

export interface ResearchDiscovery {
  id: string;
  correspondent_id: string | null;
  run_id: string | null;
  source_id: string | null;
  title: string;
  fact_text: string;
  interpretation: string | null;
  hypothesis: string | null;
  unknown: string | null;
  verification_status: VerificationStatus | string;
  region_code: string | null;
  country: string | null;
  language: string | null;
  topics: unknown;
  organization_id: string | null;
  brand_id: string | null;
  product_id: string | null;
  place_id: string | null;
  person_id: string | null;
  signal_id: string | null;
  consumer_targets: unknown;
  pricesense_status: string;
  newfind_status: string;
  duplicate_of: string | null;
  needs_human_review: boolean;
  used_ai: boolean;
  ai_model: string | null;
  created_at: string;
}

export function isResearchConsumer(value: unknown): value is ResearchConsumer {
  return (
    typeof value === "string" &&
    (RESEARCH_CONSUMERS as readonly string[]).includes(value)
  );
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
