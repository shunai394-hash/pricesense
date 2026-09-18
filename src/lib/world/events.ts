import { getSupabaseAdmin } from "@/lib/server/supabase";

export type WorldEvent = {
  id: string;
  discovery_id: string | null;
  title: string;
  fact: string;
  hypothesis: string | null;
  source_url: string | null;
  event_type: string;
  importance: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function getWorldEvent(
  eventId: string
): Promise<WorldEvent | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("world_events")
    .select(
      "id, discovery_id, title, fact, hypothesis, source_url, event_type, importance, metadata, created_at"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load world event: ${error.message}`);
  }

  return data as WorldEvent | null;
}

export async function getRecentWorldEvents(
  limit = 20
): Promise<WorldEvent[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("world_events")
    .select(
      "id, discovery_id, title, fact, hypothesis, source_url, event_type, importance, metadata, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load world events: ${error.message}`);
  }

  return (data ?? []) as WorldEvent[];
}

export async function createWorldEvent(input: {
  discoveryId?: string | null;
  title: string;
  fact: string;
  hypothesis?: string | null;
  sourceUrl?: string | null;
  eventType: string;
  importance?: number;
  metadata?: Record<string, unknown>;
}): Promise<WorldEvent> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("world_events")
    .insert({
      discovery_id: input.discoveryId ?? null,
      title: input.title,
      fact: input.fact,
      hypothesis: input.hypothesis ?? null,
      source_url: input.sourceUrl ?? null,
      event_type: input.eventType,
      importance: input.importance ?? 3,
      metadata: input.metadata ?? {},
    })
    .select(
      "id, discovery_id, title, fact, hypothesis, source_url, event_type, importance, metadata, created_at"
    )
    .single();

  if (error) {
    throw new Error(`Failed to create world event: ${error.message}`);
  }

  return data as WorldEvent;
}
