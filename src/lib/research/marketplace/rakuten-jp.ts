import type {
  MarketplaceAdapter,
  MarketplaceSearchInput,
  MarketplaceSearchResult,
  MarketplaceObservation,
} from "@/lib/research/marketplace/types";

type RakutenItem = {
  itemName?: string;
  itemCode?: string;
  itemPrice?: number;
  itemUrl?: string;
  mediumImageUrls?: Array<{ imageUrl?: string }>;
  smallImageUrls?: Array<{ imageUrl?: string }>;
  shopName?: string;
  shopCode?: string;
  availability?: number;
  genreId?: number;
  reviewCount?: number;
  reviewAverage?: number;
};

type RakutenResponse = {
  count?: number;
  items?: RakutenItem[];
};

const API_URL =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";

function getConfig() {
  const applicationId = process.env.RAKUTEN_APPLICATION_ID?.trim();
  const accessKey = process.env.RAKUTEN_ACCESS_KEY?.trim();

  if (!applicationId || !accessKey) {
    throw new Error(
      "RAKUTEN_APPLICATION_ID and RAKUTEN_ACCESS_KEY are required"
    );
  }

  return { applicationId, accessKey };
}

function normalizeItem(
  item: RakutenItem,
  observedAt: string
): MarketplaceObservation {
  const productName = item.itemName?.trim() || "楽天市場商品";

  return {
    marketplaceSlug: "rakuten-jp",
    externalId: item.itemCode?.trim() || null,
    productName,
    brand: null,
    canonicalProductKey:
      item.itemCode?.trim() || productName.toLowerCase(),
    productUrl: item.itemUrl?.trim() || null,
    imageUrl:
      item.mediumImageUrls?.[0]?.imageUrl?.trim() ||
      item.smallImageUrls?.[0]?.imageUrl?.trim() ||
      null,
    currency: "JPY",
    currentPrice:
      typeof item.itemPrice === "number" ? item.itemPrice : null,
    originalPrice: null,
    shippingPrice: null,
    availability:
      typeof item.availability === "number"
        ? item.availability === 1
          ? "in_stock"
          : "out_of_stock"
        : null,
    sellerCount: 1,
    salesRank: null,
    listingCount: null,
    observedAt,
    metadata: {
      shopName: item.shopName ?? null,
      shopCode: item.shopCode ?? null,
      genreId: item.genreId ?? null,
      reviewCount: item.reviewCount ?? null,
      reviewAverage: item.reviewAverage ?? null,
    },
  };
}

export class RakutenJpAdapter implements MarketplaceAdapter {
  readonly definition = {
    slug: "rakuten-jp",
    name: "楽天市場",
    regionCode: "japan",
    countryCode: "JP",
    marketplaceType: "shopping" as const,
    baseUrl: "https://www.rakuten.co.jp/",
    adapterKey: "rakuten-jp",
  };

  async search(
    input: MarketplaceSearchInput
  ): Promise<MarketplaceSearchResult> {
    const { applicationId, accessKey } = getConfig();

    const limit = Math.min(Math.max(input.limit ?? 10, 1), 30);
    const observedAt = new Date().toISOString();

    const params = new URLSearchParams({
      format: "json",
      formatVersion: "2",
      keyword: input.query,
      hits: String(limit),
      applicationId,
      accessKey,
    });

    const response = await fetch(`${API_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Origin: "https://pricesense-pi.vercel.app",
        Referer: "https://pricesense-pi.vercel.app/",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();

      return {
        marketplace: this.definition,
        observations: [],
        fetched: 0,
        error: `Rakuten Ichiba API ${response.status}: ${body.slice(0, 500)}`,
      };
    }

    const data = (await response.json()) as RakutenResponse;
    const items = Array.isArray(data.items) ? data.items : [];

    const observations = items.map((item) =>
      normalizeItem(item, observedAt)
    );

    return {
      marketplace: this.definition,
      observations,
      fetched: observations.length,
      error: null,
    };
  }
}

export const rakutenJpAdapter = new RakutenJpAdapter();