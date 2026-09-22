import { getSupabaseAdmin } from "@/lib/server/supabase";
import { canonicalizeUrl, sourceFingerprint } from "@/lib/research/urls";
import { upsertBrand } from "@/lib/research/graph";
import type { PersistedMarketplaceItem } from "@/lib/research/marketplace/persist";

/**
 * Connects Marketplace Runner observations into the same research_discoveries
 * table that Offering/NBOS Discovery already reads from (research/engine.ts,
 * nbos/pipeline.ts processPendingDiscoveries). Reuses the existing
 * source-provenance + dedup pattern (research_sources keyed by canonical
 * URL/fingerprint, discovery deduped by source_id) rather than inventing a
 * new pipeline.
 *
 * The fact layer is built ONLY from structured, already-verified fields
 * returned by the marketplace adapters (price, availability, observed_at,
 * seller/listing counts) -- no AI call, so there is no fabrication risk at
 * this stage. Interpretation/hypothesis (Why Now, qualification) are left
 * for the existing NBOS pipeline to fill in later via generateWhyNow /
 * explainQualification, which already separate fact from hypothesis and are
 * instructed not to invent unstated details.
 */

async function upsertMarketplaceSource(
  productUrl: string,
  marketplaceName: string,
  observedAt: string
): Promise<string | null> {
  const url = canonicalizeUrl(productUrl);
  if (!url) return null;

  const supabase = getSupabaseAdmin();
  const fingerprint = sourceFingerprint({ url, title: marketplaceName });

  const { data: byFingerprint } = await supabase
    .from("research_sources")
    .select("id")
    .eq("fingerprint", fingerprint)
    .maybeSingle();
  if (byFingerprint?.id) return byFingerprint.id;

  const { data: byUrl } = await supabase
    .from("research_sources")
    .select("id")
    .eq("canonical_url", url)
    .maybeSingle();
  if (byUrl?.id) return byUrl.id;

  const { data, error } = await supabase
    .from("research_sources")
    .insert({
      url,
      canonical_url: url,
      fingerprint,
      source_name: marketplaceName,
      source_type: "marketplace",
      published_at: observedAt,
      verification_status: "source_confirmed",
      title: marketplaceName,
    })
    .select("id")
    .single();

  if (error) {
    const { data: again } = await supabase
      .from("research_sources")
      .select("id")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    if (again?.id) return again.id;
    return null;
  }

  return data.id;
}

function buildFactText(item: PersistedMarketplaceItem): string {
  const { observation, marketplaceName } = item;
  const priceText =
    observation.currentPrice != null
      ? `${observation.currency ?? ""}${observation.currentPrice}`.trim()
      : "価格不明";
  const availabilityText = observation.availability ?? "在庫状況不明";

  return (
    `${marketplaceName}で商品「${observation.productName}」が` +
    `${priceText}（${availabilityText}）で観測されました。` +
    `観測日時: ${observation.observedAt}` +
    (observation.sellerCount != null
      ? `、出品者数: ${observation.sellerCount}`
      : "") +
    (observation.salesRank != null
      ? `、売上ランキング: ${observation.salesRank}`
      : "") +
    "。"
  );
}

export async function ingestMarketplaceItemAsDiscovery(
  item: PersistedMarketplaceItem
): Promise<{ discoveryId: string | null; duplicate: boolean }> {
  if (!item.observation.productUrl) {
    // No source provenance available -- do not fabricate one; skip.
    return { discoveryId: null, duplicate: false };
  }

  const supabase = getSupabaseAdmin();
  const sourceId = await upsertMarketplaceSource(
    item.observation.productUrl,
    item.marketplaceName,
    item.observation.observedAt
  );
  if (!sourceId) return { discoveryId: null, duplicate: false };

  const { data: existing } = await supabase
    .from("research_discoveries")
    .select("id")
    .eq("source_id", sourceId)
    .maybeSingle();
  if (existing?.id) {
    return { discoveryId: existing.id, duplicate: true };
  }

  const brandId = item.observation.brand
    ? await upsertBrand({ name: item.observation.brand, sourceId })
    : null;

  const { data: inserted, error } = await supabase
    .from("research_discoveries")
    .insert({
      source_id: sourceId,
      brand_id: brandId,
      title: `${item.marketplaceName}: ${item.observation.productName}`,
      fact_text: buildFactText(item),
      verification_status: "source_confirmed",
      region_code: null,
      country: null,
      consumer_targets: ["pricesense"],
      needs_human_review: true,
      used_ai: false,
      metadata: {
        source: "marketplace",
        marketplace_slug: item.marketplaceSlug,
        marketplace_item_id: item.itemId,
        product_url: item.observation.productUrl,
        current_price: item.observation.currentPrice,
        currency: item.observation.currency,
        availability: item.observation.availability,
        observed_at: item.observation.observedAt,
      },
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(
      `Failed to create discovery from marketplace item: ${error?.message ?? "unknown error"}`
    );
  }

  return { discoveryId: inserted.id, duplicate: false };
}

export async function ingestMarketplaceItemsAsDiscoveries(
  items: PersistedMarketplaceItem[]
): Promise<{ created: number; duplicates: number; skipped: number }> {
  let created = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const item of items) {
    const result = await ingestMarketplaceItemAsDiscovery(item);
    if (!result.discoveryId) skipped += 1;
    else if (result.duplicate) duplicates += 1;
    else created += 1;
  }

  return { created, duplicates, skipped };
}
