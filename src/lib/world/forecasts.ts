import { getSupabaseAdmin } from "@/lib/server/supabase";

export type WorldForecast = {
  id: string;
  event_id: string;
  scenario: string;
  time_horizon: string;
  probability_band: "low" | "medium" | "high";
  drivers: string[];
  risks: string[];
  affected_industries: string[];
  affected_entities: string[];
  metadata: Record<string, unknown>;
  actual_outcome: string | null;
  accuracy: "correct" | "partially_correct" | "incorrect" | "unknown";
  evaluated_at: string | null;
  created_at: string;
};

export async function getWorldForecasts(
  eventId: string
): Promise<WorldForecast[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("world_forecasts")
    .select(
      "id, event_id, scenario, time_horizon, probability_band, drivers, risks, affected_industries, affected_entities, metadata, actual_outcome, accuracy, evaluated_at, created_at"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load world forecasts: ${error.message}`);
  }

  return (data ?? []) as WorldForecast[];
}

export async function createWorldForecast(input: {
  eventId: string;
  scenario: string;
  timeHorizon: string;
  probabilityBand: WorldForecast["probability_band"];
  drivers?: string[];
  risks?: string[];
  affectedIndustries?: string[];
  affectedEntities?: string[];
  metadata?: Record<string, unknown>;
}): Promise<WorldForecast> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("world_forecasts")
    .insert({
      event_id: input.eventId,
      scenario: input.scenario,
      time_horizon: input.timeHorizon,
      probability_band: input.probabilityBand,
      drivers: input.drivers ?? [],
      risks: input.risks ?? [],
      affected_industries: input.affectedIndustries ?? [],
      affected_entities: input.affectedEntities ?? [],
      metadata: input.metadata ?? {},
    })
    .select(
      "id, event_id, scenario, time_horizon, probability_band, drivers, risks, affected_industries, affected_entities, metadata, actual_outcome, accuracy, evaluated_at, created_at"
    )
    .single();

  if (error) {
    throw new Error(`Failed to create world forecast: ${error.message}`);
  }

  return data as WorldForecast;
}

export async function evaluateWorldForecast(
  forecastId: string,
  actualOutcome: string,
  accuracy: Exclude<WorldForecast["accuracy"], "unknown">
): Promise<WorldForecast> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("world_forecasts")
    .update({
      actual_outcome: actualOutcome,
      accuracy,
      evaluated_at: new Date().toISOString(),
    })
    .eq("id", forecastId)
    .select(
      "id, event_id, scenario, time_horizon, probability_band, drivers, risks, affected_industries, affected_entities, metadata, actual_outcome, accuracy, evaluated_at, created_at"
    )
    .single();

  if (error) {
    throw new Error(`Failed to evaluate world forecast: ${error.message}`);
  }

  return data as WorldForecast;
}
