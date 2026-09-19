import type {
  MarketplaceAdapter,
  MarketplaceSearchInput,
  MarketplaceSearchResult,
  MarketplaceObservation,
} from "@/lib/research/marketplace/types";

type YahooShoppingHit = {
  name?: string;
  url?: string;
  image?: {
    medium?: string;
    small?: string;
  };
  price?: number;
  premiumPrice?: number;
  priceLabel?: {
    defaultPrice?: number;
    discountedPrice?: number | null;
    fixedPrice?: number | null;
  };
  brand?: {
    id?: number;
    name?: string;
  };
  seller?: {
    sellerId?: string;
    name?: string;
    url?: string;
  };
  inStock?: boolean;
  janCode?: string;
  code?: string;
  shipping?: {
    code?: number;
    name?: string;
  };
  condition?: string;
  review?: {
    count?: number;
    rate?: number;
  };
};

type YahooShoppingResponse = {
  totalResultsAvailable?: number;
  totalResultsReturned?: number;
  hits?: YahooShoppingHit[];
};

const API_URL =
  "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";

function getClientId(): string {
  const value = process.env.YAHOO_SHOPPING_APP_ID?.trim();

  if (!value) {
    throw new Error("YAHOO_SHOPPING_APP_ID is not configured");
  }

  return value;
}

function normalizeHit(
  hit: YahooShoppingHit,
  observedAt: string
): MarketplaceObservation {
  const productName = hit.name?.trim() || "Yahoo!ショッピング商品";
  const externalId =
    hit.code?.trim() ||
    hit.janCode?.trim() ||
    null;

  const currentPrice =
    typeof hit.price === "number"
      ? hit.price
      : typeof hit.priceLabel?.discountedPrice === "number"
        ? hit.priceLabel.discountedPrice
        : typeof hit.priceLabel?.defaultPrice === "number"
          ? hit.priceLabel.defaultPrice
          : null;

  return {
    marketplaceSlug: "yahoo-shopping-jp",
    externalId,
    productName,
    brand: hit.brand?.name?.trim() || null,
    canonicalProductKey:
      hit.janCode?.trim() ||
      hit.code?.trim() ||
      productName.toLowerCase(),
    productUrl: hit.url?.trim() || null,
    imageUrl:
      hit.image?.medium?.trim() ||
      hit.image?.small?.trim() ||
      null,
    currency: "JPY",
    currentPrice,
    originalPrice:
      typeof hit.priceLabel?.defaultPrice === "number"
        ? hit.priceLabel.defaultPrice
        : null,
    shippingPrice: null,
    availability:
      typeof hit.inStock === "boolean"
        ? hit.inStock
          ? "in_stock"
          : "out_of_stock"
        : null,
    sellerCount: 1,
    salesRank: null,
    listingCount: null,
    observedAt,
    metadata: {
      sellerId: hit.seller?.sellerId ?? null,
      sellerName: hit.seller?.name ?? null,
      sellerUrl: hit.seller?.url ?? null,
      janCode: hit.janCode ?? null,
      yahooCode: hit.code ?? null,
      condition: hit.condition ?? null,
      shippingName: hit.shipping?.name ?? null,
      reviewCount: hit.review?.count ?? null,
      reviewRate: hit.review?.rate ?? null,
    },
  };
}

export class YahooShoppingJpAdapter implements MarketplaceAdapter {
  readonly definition = {
    slug: "yahoo-shopping-jp",
    name: "Yahoo!ショッピング",
    regionCode: "japan",
    countryCode: "JP",
    marketplaceType: "shopping" as const,
    baseUrl: "https://shopping.yahoo.co.jp/",
    adapterKey: "yahoo-shopping-jp",
  };

  async search(
    input: MarketplaceSearchInput
  ): Promise<MarketplaceSearchResult> {
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
    const observedAt = new Date().toISOString();

    const params = new URLSearchParams({
      appid: getClientId(),
      query: input.query,
      results: String(limit),
    });

    const response = await fetch(`${API_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "PriceSense/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();

      return {
        marketplace: this.definition,
        observations: [],
        fetched: 0,
        error: `Yahoo Shopping API ${response.status}: ${body.slice(0, 500)}`,
      };
    }

    const data =
      (await response.json()) as YahooShoppingResponse;

    const hits = Array.isArray(data.hits) ? data.hits : [];

    const observations = hits.map((hit) =>
      normalizeHit(hit, observedAt)
    );

    return {
      marketplace: this.definition,
      observations,
      fetched: observations.length,
      error: null,
    };
  }
}

export const yahooShoppingJpAdapter =
  new YahooShoppingJpAdapter();
