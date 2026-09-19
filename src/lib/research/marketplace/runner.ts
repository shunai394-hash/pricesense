import { getSupabaseAdmin } from "@/lib/server/supabase";
import { persistMarketplaceObservations } from "@/lib/research/marketplace/persist";
import { yahooShoppingJpAdapter } from "@/lib/research/marketplace/yahoo-shopping-jp";
import { rakutenJpAdapter } from "@/lib/research/marketplace/rakuten-jp";
import { ebayUsAdapter } from "@/lib/research/marketplace/ebay";
import type {
  MarketplaceAdapter,
  MarketplaceSearchResult,
} from "@/lib/research/marketplace/types";

const ADAPTERS: MarketplaceAdapter[] = [
  yahooShoppingJpAdapter,
  rakutenJpAdapter,
  ebayUsAdapter,
];

export interface MarketplaceMonitorTarget {
  query: string;
  region?: string;
  countryCode?: string | null;
  limit?: number;
}

export interface MarketplaceMonitorResult {
  query: string;
  marketplaces: Array<{
    marketplace: string;
    fetched: number;
    saved: number;
    error: string | null;
  }>;
  totalFetched: number;
  totalSaved: number;
  errors: number;
}

export async function runMarketplaceMonitor(
  targets: MarketplaceMonitorTarget[]
): Promise<MarketplaceMonitorResult[]> {
  const results: MarketplaceMonitorResult[] = [];

  for (const target of targets) {
    const marketplaceResults: MarketplaceMonitorResult["marketplaces"] = [];

    for (const adapter of ADAPTERS) {
      let result: MarketplaceSearchResult;

      try {
        result = await adapter.search({
          query: target.query,
          region: target.region ?? "japan",
          countryCode: target.countryCode ?? "JP",
          limit: target.limit ?? 10,
        });
      } catch (error) {
        result = {
          marketplace: adapter.definition,
          observations: [],
          fetched: 0,
          error:
            error instanceof Error
              ? error.message
              : "Unknown marketplace adapter error",
        };
      }

      let saved = 0;

      if (result.observations.length > 0) {
        try {
          saved = await persistMarketplaceObservations(
            result.observations
          );
        } catch (error) {
          result.error =
            error instanceof Error
              ? error.message
              : "Failed to persist marketplace observations";
        }
      }

      marketplaceResults.push({
        marketplace: result.marketplace.name,
        fetched: result.fetched,
        saved,
        error: result.error,
      });
    }

    results.push({
      query: target.query,
      marketplaces: marketplaceResults,
      totalFetched: marketplaceResults.reduce(
        (sum, item) => sum + item.fetched,
        0
      ),
      totalSaved: marketplaceResults.reduce(
        (sum, item) => sum + item.saved,
        0
      ),
      errors: marketplaceResults.filter((item) => item.error).length,
    });
  }

  return results;
}

export async function getMarketplaceMonitorStatus() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("research_marketplaces")
    .select(
      "id,slug,name,region_code,country_code,marketplace_type,base_url,adapter_key,status,updated_at"
    )
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to load marketplace monitor status: ${error.message}`
    );
  }

  return data ?? [];
}
