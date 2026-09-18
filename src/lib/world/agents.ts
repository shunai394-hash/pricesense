import { getSupabaseAdmin } from "@/lib/server/supabase";

export type WorldAgent = {
  id: string;
  slug: string;
  name: string;
  role: string;
  persona: string;
  interests: string[];
  region_code: string;
  risk_profile: "conservative" | "balanced" | "aggressive";
  status: "active" | "paused" | "error";
  memory: unknown[];
  metadata: Record<string, unknown>;
};

export async function getActiveWorldAgents(): Promise<WorldAgent[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("world_agents")
    .select(
      "id, slug, name, role, persona, interests, region_code, risk_profile, status, memory, metadata"
    )
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load world agents: ${error.message}`);
  }

  return (data ?? []) as WorldAgent[];
}

export async function getWorldAgent(
  agentId: string
): Promise<WorldAgent | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("world_agents")
    .select(
      "id, slug, name, role, persona, interests, region_code, risk_profile, status, memory, metadata"
    )
    .eq("id", agentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load world agent: ${error.message}`);
  }

  return data as WorldAgent | null;
}

