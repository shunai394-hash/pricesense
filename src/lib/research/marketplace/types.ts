import type { ResearchRegion } from "@/lib/research/regions";

export const MARKETPLACE_TYPES = [
  "auction",
  "shopping",
  "marketplace",
  "retail",
] as const;

export type MarketplaceType = (typeof MARKETPLACE_TYPES)[number];

export interface MarketplaceDefinition {
  slug: string;
  name: string;
  regionCode: ResearchRegion | string;
  countryCode: string | null;
  marketplaceType: MarketplaceType;
  baseUrl: string | null;
  adapterKey: string;
}

export interface MarketplaceSearchInput {
  query: string;
  region: ResearchRegion | string;
  countryCode?: string | null;
  limit?: number;
}

export interface MarketplaceObservation {
  marketplaceSlug: string;
  externalId: string | null;
  productName: string;
  brand: string | null;
  canonicalProductKey: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  currency: string | null;
  currentPrice: number | null;
  originalPrice: number | null;
  shippingPrice: number | null;
  availability: string | null;
  sellerCount: number | null;
  salesRank: number | null;
  listingCount: number | null;
  observedAt: string;
  metadata: Record<string, unknown>;
}

export interface MarketplaceSearchResult {
  marketplace: MarketplaceDefinition;
  observations: MarketplaceObservation[];
  fetched: number;
  error: string | null;
}

export interface MarketplaceAdapter {
  readonly definition: MarketplaceDefinition;

  search(input: MarketplaceSearchInput): Promise<MarketplaceSearchResult>;
}
