import { getSupabaseAdmin } from "@/lib/server/supabase";

export type WorldPost = {
  id: string;
  event_id: string;
  agent_id: string;
  parent_post_id: string | null;
  round: number;
  content: string;
  stance: "support" | "oppose" | "skeptical" | "neutral" | "curious";
  reasoning_summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function getWorldPosts(
  eventId: string,
  limit = 100
): Promise<WorldPost[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("world_posts")
    .select(
      "id, event_id, agent_id, parent_post_id, round, content, stance, reasoning_summary, metadata, created_at"
    )
    .eq("event_id", eventId)
    .order("round", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load world posts: ${error.message}`);
  }

  return (data ?? []) as WorldPost[];
}

export async function createWorldPost(input: {
  eventId: string;
  agentId: string;
  parentPostId?: string | null;
  round?: number;
  content: string;
  stance: WorldPost["stance"];
  reasoningSummary?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<WorldPost> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("world_posts")
    .insert({
      event_id: input.eventId,
      agent_id: input.agentId,
      parent_post_id: input.parentPostId ?? null,
      round: input.round ?? 1,
      content: input.content,
      stance: input.stance,
      reasoning_summary: input.reasoningSummary ?? null,
      metadata: input.metadata ?? {},
    })
    .select(
      "id, event_id, agent_id, parent_post_id, round, content, stance, reasoning_summary, metadata, created_at"
    )
    .single();

  if (error) {
    throw new Error(`Failed to create world post: ${error.message}`);
  }

  return data as WorldPost;
}
