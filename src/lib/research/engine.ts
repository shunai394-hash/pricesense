import {
  aiModelName,
  completeChatJson,
  isAiConfigured,
} from "@/lib/ai/chat";
import {
  addRelationship,
  upsertBrand,
  upsertOrganization,
  upsertPlace,
  upsertProduct,
} from "@/lib/research/graph";
import { fetchPublicNewsFeed, fetchSourcePreview, type FeedItem } from "@/lib/research/feeds";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { canonicalizeUrl, sourceFingerprint } from "@/lib/research/urls";
import type { ResearchCorrespondent } from "@/lib/research/types";

const CONSUMER_VALUES = ["pricesense", "newfind"] as const;

interface Interpretation {
  fact: string;
  interpretation: string;
  hypothesis: string;
  unknown: string;
  organizationName: string | null;
  brandName: string | null;
  productName: string | null;
  placeName: string | null;
  country: string | null;
  signalType: string;
  consumers: string[];
  needsHumanReview: boolean;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function consumersFrom(value: unknown, fallback: string[]): string[] {
  const list = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
  const filtered = list.filter((item) =>
    (CONSUMER_VALUES as readonly string[]).includes(item)
  );
  return filtered.length > 0 ? [...new Set(filtered)] : fallback;
}

function defaultConsumers(correspondent: ResearchCorrespondent): string[] {
  const type = correspondent.correspondent_type;
  if (type === "brand" || type === "product" || type === "trend" || type === "retail") {
    return ["pricesense", "newfind"];
  }
  if (type === "company" || type === "market" || type === "japan_market" || type === "startup") {
    return ["pricesense"];
  }
  return ["pricesense", "newfind"];
}

async function interpretItem(
  correspondent: ResearchCorrespondent,
  item: FeedItem
): Promise<{ data: Interpretation; usedAi: boolean; model: string | null }> {
  const fallback: Interpretation = {
    fact: `${item.title}${item.sourceName ? `（出典: ${item.sourceName}）` : ""}${
      item.publishedAt ? ` / ${item.publishedAt.slice(0, 10)}` : ""
    }`,
    interpretation: "",
    hypothesis: "",
    unknown: "本文の詳細・関係者・真偽は未確認",
    organizationName: null,
    brandName: null,
    productName: null,
    placeName: null,
    country: correspondent.country_code,
    signalType: correspondent.correspondent_type,
    consumers: defaultConsumers(correspondent),
    needsHumanReview: true,
  };

  if (!isAiConfigured()) {
    return { data: fallback, usedAi: false, model: null };
  }

  const { data, usedFallback } = await completeChatJson<Interpretation>(
    {
      system: [
        "You extract research notes from a public news headline.",
        "Separate FACT from HYPOTHESIS.",
        "Fact may only restate what the source explicitly says.",
        "Do not invent companies, people, URLs, dates, or countries.",
        "If a name is not in the source text, leave it null.",
        "Hypothesis is optional business implication and must not be phrased as fact.",
        "Return JSON only.",
      ].join("\n"),
      user: JSON.stringify({
        correspondent: {
          name: correspondent.name,
          role: correspondent.role,
          region: correspondent.region_code,
        },
        source: {
          title: item.title,
          url: item.url,
          sourceName: item.sourceName,
          publishedAt: item.publishedAt,
          snippet: item.snippet,
        },
        requiredKeys: [
          "fact",
          "interpretation",
          "hypothesis",
          "unknown",
          "organizationName",
          "brandName",
          "productName",
          "placeName",
          "country",
          "signalType",
          "consumers",
          "needsHumanReview",
        ],
      }),
      temperature: 0.1,
      maxTokens: 700,
      timeoutMs: 20000,
    },
    fallback
  );

  return {
    data: {
      ...fallback,
      fact: text(data.fact) || fallback.fact,
      interpretation: text(data.interpretation) ?? "",
      hypothesis: text(data.hypothesis) ?? "",
      unknown: text(data.unknown) || fallback.unknown,
      organizationName: text(data.organizationName),
      brandName: text(data.brandName),
      productName: text(data.productName),
      placeName: text(data.placeName),
      country: text(data.country) ?? fallback.country,
      signalType: text(data.signalType) || fallback.signalType,
      consumers: consumersFrom(data.consumers, fallback.consumers),
      needsHumanReview: data.needsHumanReview !== false,
    },
    usedAi: !usedFallback,
    model: usedFallback ? null : aiModelName(),
  };
}

async function upsertSource(item: FeedItem, region: string): Promise<{
  id: string;
  duplicate: boolean;
}> {
  const supabase = getSupabaseAdmin();
  const url = canonicalizeUrl(item.url);
  if (!url) throw new Error("Invalid source URL");
  const fingerprint = sourceFingerprint({ url, title: item.title });

  const { data: byFingerprint } = await supabase
    .from("research_sources")
    .select("id")
    .eq("fingerprint", fingerprint)
    .maybeSingle();
  if (byFingerprint?.id) return { id: byFingerprint.id, duplicate: true };

  const { data: byUrl } = await supabase
    .from("research_sources")
    .select("id")
    .eq("canonical_url", url)
    .maybeSingle();
  if (byUrl?.id) return { id: byUrl.id, duplicate: true };

  const { data, error } = await supabase
    .from("research_sources")
    .insert({
      url,
      canonical_url: url,
      fingerprint,
      source_name: item.sourceName,
      source_type: "news",
      published_at: item.publishedAt,
      language: item.language,
      region_code: region,
      verification_status: "source_confirmed",
      title: item.title,
      snippet: item.snippet,
    })
    .select("id")
    .single();

  if (error) {
    const { data: again } = await supabase
      .from("research_sources")
      .select("id")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    if (again?.id) return { id: again.id, duplicate: true };
    throw new Error(error.message);
  }

  return { id: data.id, duplicate: false };
}

export async function ingestPublicFeedItem(input: {
  correspondent: ResearchCorrespondent;
  item: FeedItem;
  runId?: string | null;
  offeringId?: string | null;
}): Promise<{
  discoveryId: string | null;
  duplicate: boolean;
  usedAi: boolean;
}> {
  const supabase = getSupabaseAdmin();
  const source = await upsertSource(input.item, input.correspondent.region_code);
  const { data: existingDiscovery } = await supabase
    .from("research_discoveries")
    .select("id")
    .eq("source_id", source.id)
    .maybeSingle();
  if (existingDiscovery?.id) {
    return { discoveryId: existingDiscovery.id, duplicate: true, usedAi: false };
  }

  const interpreted = await interpretItem(input.correspondent, input.item);

  const organizationId = interpreted.data.organizationName
    ? await upsertOrganization({
        name: interpreted.data.organizationName,
        country: interpreted.data.country,
        regionCode: input.correspondent.region_code,
        sourceId: source.id,
      })
    : null;
  const brandId = interpreted.data.brandName
    ? await upsertBrand({
        name: interpreted.data.brandName,
        organizationId,
        country: interpreted.data.country,
        sourceId: source.id,
      })
    : null;
  const productId = interpreted.data.productName
    ? await upsertProduct({
        name: interpreted.data.productName,
        brandId,
        organizationId,
        sourceId: source.id,
      })
    : null;
  const placeId = interpreted.data.placeName
    ? await upsertPlace({
        name: interpreted.data.placeName,
        country: interpreted.data.country,
        regionCode: input.correspondent.region_code,
        sourceId: source.id,
      })
    : null;

  const { data: signal } = await supabase
    .from("research_signals")
    .insert({
      source_id: source.id,
      organization_id: organizationId,
      brand_id: brandId,
      product_id: productId,
      signal_type: interpreted.data.signalType,
      title: input.item.title,
      fact_text: interpreted.data.fact,
      hypothesis: interpreted.data.hypothesis || null,
      unknown: interpreted.data.unknown,
      verification_status: "source_confirmed",
      region_code: input.correspondent.region_code,
      country: interpreted.data.country,
      consumer_targets: interpreted.data.consumers,
      strength: null,
    })
    .select("id")
    .single();

  const { data: discovery, error: discoveryError } = await supabase
    .from("research_discoveries")
    .insert({
      correspondent_id: input.correspondent.id,
      run_id: input.runId ?? null,
      source_id: source.id,
      title: input.item.title,
      fact_text: interpreted.data.fact,
      interpretation: interpreted.data.interpretation || null,
      hypothesis: interpreted.data.hypothesis || null,
      unknown: interpreted.data.unknown,
      verification_status: "source_confirmed",
      region_code: input.correspondent.region_code,
      country: interpreted.data.country,
      language: input.correspondent.region_code === "japan" ? "ja" : "en",
      topics: input.correspondent.topics,
      organization_id: organizationId,
      brand_id: brandId,
      product_id: productId,
      place_id: placeId,
      signal_id: signal?.id ?? null,
      consumer_targets: interpreted.data.consumers,
      pricesense_status: interpreted.data.consumers.includes("pricesense")
        ? "available"
        : "ignored",
      newfind_status: interpreted.data.consumers.includes("newfind")
        ? "available"
        : "ignored",
      needs_human_review: interpreted.data.needsHumanReview,
      used_ai: interpreted.usedAi,
      ai_model: interpreted.model,
      offering_id: input.offeringId ?? null,
      nbos_status: "pending",
    })
    .select("id")
    .single();

  if (discoveryError) throw new Error(discoveryError.message);

  if (signal?.id) {
    await supabase
      .from("research_signals")
      .update({ discovery_id: discovery.id })
      .eq("id", signal.id);
  }

  if (organizationId && brandId) {
    await addRelationship({
      fromType: "brand",
      fromId: brandId,
      toType: "organization",
      toId: organizationId,
      relation: "owned_by",
      sourceId: source.id,
      discoveryId: discovery.id,
      isHypothesis: true,
    });
  }
  if (organizationId && placeId) {
    await addRelationship({
      fromType: "organization",
      fromId: organizationId,
      toType: "place",
      toId: placeId,
      relation: "located_in",
      sourceId: source.id,
      discoveryId: discovery.id,
      isHypothesis: true,
    });
  }
  if (productId && brandId) {
    await addRelationship({
      fromType: "product",
      fromId: productId,
      toType: "brand",
      toId: brandId,
      relation: "belongs_to",
      sourceId: source.id,
      discoveryId: discovery.id,
      isHypothesis: true,
    });
  }

  return {
    discoveryId: discovery.id,
    duplicate: false,
    usedAi: interpreted.usedAi,
  };
}

export async function runCorrespondent(
  correspondentId: string
): Promise<{
  runId: string;
  status: string;
  itemsFetched: number;
  discoveriesCreated: number;
  duplicatesSkipped: number;
  usedAi: boolean;
  error: string | null;
}> {
  const supabase = getSupabaseAdmin();
  const { data: correspondent, error: loadError } = await supabase
    .from("research_correspondents")
    .select("*")
    .eq("id", correspondentId)
    .maybeSingle();

  if (loadError) throw new Error(loadError.message);
  if (!correspondent) throw new Error("Correspondent not found");
  if (correspondent.status === "paused") {
    throw new Error("Correspondent is paused");
  }

  const { data: run, error: runError } = await supabase
    .from("research_runs")
    .insert({
      correspondent_id: correspondent.id,
      status: "running",
      current_focus: correspondent.current_focus,
    })
    .select("id")
    .single();
  if (runError || !run) throw new Error(runError?.message ?? "Failed to start run");

  let itemsFetched = 0;
  let discoveriesCreated = 0;
  let duplicatesSkipped = 0;
  let errorCount = 0;
  let usedAi = false;
  let errorMessage: string | null = null;

  try {
    const query = text(correspondent.search_query);
    if (!query) {
      throw new Error("検索条件が未設定です");
    }

    const feed = await fetchPublicNewsFeed({
      query,
      region: correspondent.region_code,
    });
    itemsFetched = feed.items.length;
    if (feed.error && feed.items.length === 0) {
      errorMessage = feed.error;
    }

    for (const item of feed.items) {
      try {
        const ingested = await ingestPublicFeedItem({
          correspondent: correspondent as ResearchCorrespondent,
          item,
          runId: run.id,
        });
        if (ingested.duplicate) {
          duplicatesSkipped += 1;
          continue;
        }
        if (ingested.usedAi) usedAi = true;
        discoveriesCreated += 1;
      } catch (itemError) {
        errorCount += 1;
        errorMessage =
          itemError instanceof Error ? itemError.message : "item failed";
      }
    }

    const status =
      errorMessage && discoveriesCreated === 0 && itemsFetched === 0
        ? "failed"
        : errorCount > 0
          ? "partial"
          : "succeeded";

    await supabase
      .from("research_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        items_fetched: itemsFetched,
        discoveries_created: discoveriesCreated,
        duplicates_skipped: duplicatesSkipped,
        error_count: errorCount,
        used_ai: usedAi,
        error_message: errorMessage,
      })
      .eq("id", run.id);

    await supabase
      .from("research_correspondents")
      .update({
        last_run_at: new Date().toISOString(),
        last_error: status === "failed" ? errorMessage : null,
        status: status === "failed" ? "error" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", correspondent.id);

    return {
      runId: run.id,
      status,
      itemsFetched,
      discoveriesCreated,
      duplicatesSkipped,
      usedAi,
      error: status === "failed" ? errorMessage : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "run failed";
    await supabase
      .from("research_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        items_fetched: itemsFetched,
        discoveries_created: discoveriesCreated,
        duplicates_skipped: duplicatesSkipped,
        error_count: errorCount + 1,
        used_ai: usedAi,
        error_message: message,
      })
      .eq("id", run.id);
    await supabase
      .from("research_correspondents")
      .update({
        last_run_at: new Date().toISOString(),
        last_error: message,
        status: "error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", correspondent.id);
    return {
      runId: run.id,
      status: "failed",
      itemsFetched,
      discoveriesCreated,
      duplicatesSkipped,
      usedAi,
      error: message,
    };
  }
}

export async function ingestSourceUrl(input: {
  url: string;
  correspondentId?: string | null;
}): Promise<{ discoveryId: string; duplicate: boolean; usedAi: boolean }> {
  const url = canonicalizeUrl(input.url);
  if (!url) throw new Error("URLが不正です。架空URLは保存しません。");

  const preview = await fetchSourcePreview(url);
  if (!preview.ok) {
    throw new Error(preview.error || "ソースを取得できませんでした");
  }

  const supabase = getSupabaseAdmin();
  const title = preview.title || url;
  const item: FeedItem = {
    title,
    url,
    sourceName: new URL(url).hostname,
    publishedAt: null,
    snippet: preview.snippet,
    language: null,
  };

  let correspondent: ResearchCorrespondent | null = null;
  if (input.correspondentId) {
    const { data } = await supabase
      .from("research_correspondents")
      .select("*")
      .eq("id", input.correspondentId)
      .maybeSingle();
    correspondent = (data as ResearchCorrespondent | null) ?? null;
  }
  if (!correspondent) {
    const { data } = await supabase
      .from("research_correspondents")
      .select("*")
      .eq("slug", "news-reporter")
      .maybeSingle();
    correspondent = (data as ResearchCorrespondent | null) ?? null;
  }
  if (!correspondent) throw new Error("特派員が見つかりません");

  const source = await upsertSource(item, correspondent.region_code);
  const { data: existing } = await supabase
    .from("research_discoveries")
    .select("id")
    .eq("source_id", source.id)
    .maybeSingle();
  if (existing?.id) {
    return { discoveryId: existing.id, duplicate: true, usedAi: false };
  }

  const interpreted = await interpretItem(correspondent, item);
  const { data: discovery, error } = await supabase
    .from("research_discoveries")
    .insert({
      correspondent_id: correspondent.id,
      source_id: source.id,
      title,
      fact_text: interpreted.data.fact,
      interpretation: interpreted.data.interpretation || null,
      hypothesis: interpreted.data.hypothesis || null,
      unknown: interpreted.data.unknown,
      verification_status: "source_confirmed",
      region_code: correspondent.region_code,
      country: interpreted.data.country,
      consumer_targets: interpreted.data.consumers,
      needs_human_review: true,
      used_ai: interpreted.usedAi,
      ai_model: interpreted.model,
    })
    .select("id")
    .single();
  if (error || !discovery) throw new Error(error?.message ?? "保存に失敗しました");
  return { discoveryId: discovery.id, duplicate: false, usedAi: interpreted.usedAi };
}

export async function runDueCorrespondents(limit = 3): Promise<{
  ran: number;
  results: Array<Awaited<ReturnType<typeof runCorrespondent>> & { correspondentId: string }>;
}> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("research_correspondents")
    .select("id, cadence_minutes, last_run_at, status")
    .eq("status", "active")
    .order("last_run_at", { ascending: true, nullsFirst: true })
    .limit(24);
  if (error) throw new Error(error.message);

  const now = Date.now();
  const due = (data ?? []).filter((row) => {
    if (!row.last_run_at) return true;
    const cadence = Math.max(Number(row.cadence_minutes) || 1440, 30) * 60 * 1000;
    return now - Date.parse(row.last_run_at) >= cadence;
  }).slice(0, limit);

  const results = [];
  for (const row of due) {
    const result = await runCorrespondent(row.id);
    results.push({ ...result, correspondentId: row.id });
  }
  return { ran: results.length, results };
}
