import type {
  MarketplaceAdapter,
  MarketplaceObservation,
  MarketplaceSearchInput,
  MarketplaceSearchResult,
} from "@/lib/research/marketplace/types";

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;

const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SEARCH_URL =
  "https://api.ebay.com/buy/browse/v1/item_summary/search";
const MARKETPLACE_ID = "EBAY_US";

let cachedToken: {
  accessToken: string;
  expiresAt: number;
} | null = null;

interface EbayTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface EbaySearchResponse {
  total?: number;
  itemSummaries?: EbayItem[];
}

interface EbayItem {
  itemId?: string;
  title?: string;
  price?: {
    value?: string;
    currency?: string;
  };
  currentBidPrice?: {
    value?: string;
    currency?: string;
  };
  condition?: string;
  itemWebUrl?: string;
  image?: {
    imageUrl?: string;
  };
  seller?: {
    username?: string;
  };
  buyingOptions?: string[];
  itemLocation?: {
    country?: string;
    postalCode?: string;
  };
}

async function getEbayAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
    throw new Error(
      "EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are required"
    );
  }

  const basic = Buffer.from(
    `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`,
    "utf8"
  ).toString("base64");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `eBay OAuth failed: ${response.status} ${body}`
    );
  }

  const data = (await response.json()) as EbayTokenResponse;

  if (!data.access_token) {
    throw new Error("eBay OAuth returned no access token");
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(data.expires_in - 60, 60) * 1000,
  };

  return data.access_token;
}

function parsePrice(value: string | undefined): number | null {
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractBrand(title: string | undefined): string | null {
  if (!title) return null;

  const knownBrands = [
    "Nike",
    "adidas",
    "Apple",
    "Samsung",
    "Sony",
    "New Balance",
    "ASICS",
    "Puma",
    "LEGO",
    "Nintendo",
    "Microsoft",
    "Google",
  ];

  const lowerTitle = title.toLowerCase();

  return (
    knownBrands.find((brand) =>
      lowerTitle.includes(brand.toLowerCase())
    ) ?? null
  );
}

function toObservation(item: EbayItem): MarketplaceObservation {
  const currentPrice = parsePrice(
    item.price?.value ?? item.currentBidPrice?.value
  );

  const currency =
    item.price?.currency ??
    item.currentBidPrice?.currency ??
    "USD";

  const title = item.title?.trim() || "Unknown eBay item";

  return {
    marketplaceSlug: "ebay-us",
    externalId: item.itemId ?? null,
    productName: title,
    brand: extractBrand(title),
    canonicalProductKey: null,
    productUrl: item.itemWebUrl ?? null,
    imageUrl: item.image?.imageUrl ?? null,
    currency,
    currentPrice,
    originalPrice: null,
    shippingPrice: null,
    availability: "available",
    sellerCount: null,
    salesRank: null,
    listingCount: null,
    observedAt: new Date().toISOString(),
    metadata: {
      marketplaceId: MARKETPLACE_ID,
      condition: item.condition ?? null,
      sellerUsername: item.seller?.username ?? null,
      buyingOptions: item.buyingOptions ?? [],
      itemLocation: item.itemLocation ?? null,
    },
  };
}

export const ebayUsAdapter: MarketplaceAdapter = {
  definition: {
    slug: "ebay-us",
    name: "eBay US",
    regionCode: "north-america",
    countryCode: "US",
    marketplaceType: "marketplace",
    baseUrl: "https://www.ebay.com/",
    adapterKey: "ebay-us",
  },

  async search(
    input: MarketplaceSearchInput
  ): Promise<MarketplaceSearchResult> {
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 100);
    const query = input.query.trim();

    if (!query) {
      return {
        marketplace: this.definition,
        observations: [],
        fetched: 0,
        error: "eBay search query is empty",
      };
    }

    try {
      const accessToken = await getEbayAccessToken();

      const url = new URL(SEARCH_URL);
      url.searchParams.set("q", query);
      url.searchParams.set("limit", String(limit));

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE_ID,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.text();

        throw new Error(
          `eBay Browse API failed: ${response.status} ${body}`
        );
      }

      const data = (await response.json()) as EbaySearchResponse;
      const items = data.itemSummaries ?? [];

      return {
        marketplace: this.definition,
        observations: items.map(toObservation),
        fetched: items.length,
        error: null,
      };
    } catch (error) {
      return {
        marketplace: this.definition,
        observations: [],
        fetched: 0,
        error:
          error instanceof Error
            ? error.message
            : "Unknown eBay adapter error",
      };
    }
  },
};
