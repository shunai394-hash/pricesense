import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LeadRecord } from "@/lib/leads/types";
import { isSupabaseConfigured } from "@/lib/server/env";

export interface PremiumSubscriptionRow {
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: string | null;
}

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  if (!adminClient) {
    adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }

  return adminClient;
}

export async function insertLeadRecord(record: LeadRecord): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("leads").insert({
    lead_source: record.leadSource,
    email: record.email.toLowerCase(),
    category_id: record.categoryId ?? null,
    category_name: record.categoryName ?? null,
    user_rate: record.userRate ?? null,
    market_rate: record.marketRate ?? null,
    diagnosis_level: record.diagnosisLevel ?? null,
    target_rate: record.targetRate ?? null,
    created_at: record.createdAt,
  });

  if (error) {
    throw new Error(`Failed to save lead: ${error.message}`);
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
