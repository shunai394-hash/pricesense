import type { MarketplaceObservation } from "@/lib/research/marketplace/types";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const MARKETPLACE_META: Record<
  string,
  {
    name: string;
    regionCode: string;
    countryCode: string;
    marketplaceType: "auction" | "shopping" | "marketplace" | "retail";
    baseUrl: string;
  }
> = {
  "yahoo-shopping-jp": {
    name: "Yahoo!ショッピング",
    regionCode: "japan",
    countryCode: "JP",
    marketplaceType: "shopping",
    baseUrl: "https://shopping.yahoo.co.jp/",
  },
  "rakuten-jp": {
    name: "楽天市場",
    regionCode: "japan",
    countryCode: "JP",
    marketplaceType: "shopping",
    baseUrl: "https://www.rakuten.co.jp/",
  },
  "ebay-us": {
    name: "eBay US",
    regionCode: "north-america",
    countryCode: "US",
    marketplaceType: "marketplace",
    baseUrl: "https://www.ebay.com/",
  },
};

export interface PersistedMarketplaceItem {
  itemId: string;
  marketplaceId: string;
  marketplaceName: string;
  marketplaceSlug: string;
  observation: MarketplaceObservation;
}

export async function persistMarketplaceObservations(
  observations: MarketplaceObservation[]
): Promise<PersistedMarketplaceItem[]> {
  if (observations.length === 0) return [];

  const supabase = getSupabaseAdmin();
  const marketplaceSlug = observations[0].marketplaceSlug;
  const meta = MARKETPLACE_META[marketplaceSlug];

  if (!meta) {
    throw new Error(
      `Unsupported marketplace for persistence: ${marketplaceSlug}`
    );
  }

  const { data: marketplace, error: marketplaceError } = await supabase
    .from("research_marketplaces")
    .upsert(
      {
        slug: marketplaceSlug,
        name: meta.name,
        region_code: meta.regionCode,
        country_code: meta.countryCode,
        marketplace_type: meta.marketplaceType,
        base_url: meta.baseUrl,
        adapter_key: marketplaceSlug,
        status: "active",
        metadata: {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (marketplaceError || !marketplace) {
    throw new Error(
      "Failed to upsert marketplace: " +
        (marketplaceError?.message || "unknown error")
    );
  }

  const persisted: PersistedMarketplaceItem[] = [];

  for (const observation of observations) {
    const itemRow = {
      marketplace_id: marketplace.id,
      external_id: observation.externalId,
      product_name: observation.productName,
      brand: observation.brand,
      canonical_product_key: observation.canonicalProductKey,
      product_url: observation.productUrl,
      image_url: observation.imageUrl,
      currency: observation.currency,
      current_price: observation.currentPrice,
      original_price: observation.originalPrice,
      shipping_price: observation.shippingPrice,
      availability: observation.availability,
      seller_count: observation.sellerCount,
      sales_rank: observation.salesRank,
      listing_count: observation.listingCount,
      observed_at: observation.observedAt,
      metadata: observation.metadata,
      updated_at: new Date().toISOString(),
    };

    let item: { id: string } | null = null;
    let itemError: { message: string } | null = null;

    if (observation.externalId) {
      const { data: existingItem, error: findError } = await supabase
        .from("research_market_observation_items")
        .select("id")
        .eq("marketplace_id", marketplace.id)
        .eq("external_id", observation.externalId)
        .maybeSingle();

      if (findError) {
        itemError = findError;
      } else if (existingItem) {
        const { data: updatedItem, error: updateError } = await supabase
          .from("research_market_observation_items")
          .update(itemRow)
          .eq("id", existingItem.id)
          .select("id")
          .single();

        item = updatedItem;
        itemError = updateError;
      } else {
        const { data: insertedItem, error: insertError } = await supabase
          .from("research_market_observation_items")
          .insert(itemRow)
          .select("id")
          .single();

        item = insertedItem;
        itemError = insertError;
      }
    } else {
      const { data: insertedItem, error: insertError } = await supabase
        .from("research_market_observation_items")
        .insert(itemRow)
        .select("id")
        .single();

      item = insertedItem;
      itemError = insertError;
    }

    if (itemError || !item) {
      throw new Error(
        "Failed to save marketplace item: " +
          (itemError?.message || "unknown error")
      );
    }

    const { error: observationError } = await supabase
      .from("research_market_observations")
      .insert({
        item_id: item.id,
        marketplace_id: marketplace.id,
        observed_at: observation.observedAt,
        price: observation.currentPrice,
        currency: observation.currency,
        shipping_price: observation.shippingPrice,
        availability: observation.availability,
        seller_count: observation.sellerCount,
        sales_rank: observation.salesRank,
        listing_count: observation.listingCount,
        signal_strength: null,
        metadata: observation.metadata,
      });

    if (observationError) {
      throw new Error(
        "Failed to save marketplace observation: " +
          observationError.message
      );
    }

    persisted.push({
      itemId: item.id,
      marketplaceId: marketplace.id,
      marketplaceName: meta.name,
      marketplaceSlug,
      observation,
    });
  }

  return persisted;
}