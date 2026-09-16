import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LeadRecord } from "@/lib/leads/types";
import { getSupabaseConfig } from "@/lib/server/env";
import { companyIdentityFromLead } from "@/lib/sales/company-identity";

export interface PremiumSubscriptionRow {
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: string | null;
}

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase is not configured: set valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  if (!adminClient) {
    try {
      adminClient = createClient(config.url, config.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch (error) {
      adminClient = null;
      const message =
        error instanceof Error ? error.message : "unknown createClient error";
      console.error("[save-report] Supabase createClient failed:", message, error);
      throw new Error(`Failed to create Supabase client: ${message}`);
    }
  }

  return adminClient;
}

function sameOptionalNumber(
  left: number | null | undefined,
  right: number | null | undefined
): boolean {
  if (left == null && right == null) return true;
  if (left == null || right == null) return false;
  return Number(left) === Number(right);
}

const DUPLICATE_LEAD_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Inserts a lead unless the same email + diagnosis already exists in the last 24h.
 * Does not add a unique email constraint (historical duplicates and sales lead_id stay intact).
 */
export async function insertLeadRecord(record: LeadRecord): Promise<void> {
  const supabase = getSupabaseAdmin();

  const email = record.email.toLowerCase();
  const identity = companyIdentityFromLead({
    id: "pending",
    email,
    company_name: null,
  });

  const row = {
    lead_source: record.leadSource,
    email,
    category_id: record.categoryId ?? null,
    category_name: record.categoryName ?? null,
    company_name: identity.name === email ? null : identity.name,
    industry: record.categoryName ?? null,
    user_rate: record.userRate ?? null,
    market_rate: record.marketRate ?? null,
    diagnosis_level: record.diagnosisLevel ?? null,
    target_rate: record.targetRate ?? null,
    created_at: record.createdAt,
  };

  const since = new Date(Date.now() - DUPLICATE_LEAD_WINDOW_MS).toISOString();
  const { data: existing, error: lookupError } = await supabase
    .from("leads")
    .select("id, category_id, user_rate, market_rate")
    .eq("email", row.email)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);

  if (lookupError) {
    console.error("[save-report] duplicate-lead lookup failed:", {
      message: lookupError.message,
      code: lookupError.code,
    });
  } else {
    const duplicate = (existing ?? []).some(
      (candidate) =>
        (candidate.category_id ?? null) === row.category_id &&
        sameOptionalNumber(candidate.user_rate, row.user_rate) &&
        sameOptionalNumber(candidate.market_rate, row.market_rate)
    );
    if (duplicate) {
      console.info("[save-report] skipped duplicate lead insert within 24h");
      return;
    }
  }

  const { error } = await supabase.from("leads").insert(row);

  if (error) {
    console.error("[save-report] Supabase insert failed:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      email: row.email,
    });
    throw new Error(`Failed to save lead: ${error.message}`);
  }

  try {
    const { syncLeadsIntoSalesOs } = await import("@/lib/server/sales-os");
    await syncLeadsIntoSalesOs();
  } catch (syncError) {
    console.error(
      "[save-report] sales os sync skipped:",
      syncError instanceof Error ? syncError.message : syncError
    );
  }
}

export async function upsertPremiumSubscription(
  row: PremiumSubscriptionRow
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("premium_subscriptions").upsert(
    {
      email: row.email.toLowerCase(),
      stripe_customer_id: row.stripe_customer_id,
      stripe_subscription_id: row.stripe_subscription_id,
      status: row.status,
      current_period_end: row.current_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`);
  }
}

export async function getPremiumSubscriptionByEmail(
  email: string
): Promise<PremiumSubscriptionRow | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("premium_subscriptions")
    .select(
      "email, stripe_customer_id, stripe_subscription_id, status, current_period_end"
    )
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch subscription: ${error.message}`);
  }

  return data;
}
