import type {
  MarketplaceAdapter,
  MarketplaceDefinition,
} from "@/lib/research/marketplace/types";

const MARKETPLACES: MarketplaceDefinition[] = [
  {
    slug: "yahoo-auctions-jp",
    name: "Yahoo!オークション",
    regionCode: "japan",
    countryCode: "JP",
    marketplaceType: "auction",
    baseUrl: "https://auctions.yahoo.co.jp/",
    adapterKey: "yahoo-auctions-jp",
  },
  {
    slug: "yahoo-shopping-jp",
    name: "Yahoo!ショッピング",
    regionCode: "japan",
    countryCode: "JP",
    marketplaceType: "shopping",
    baseUrl: "https://shopping.yahoo.co.jp/",
    adapterKey: "yahoo-shopping-jp",
  },
  {
    slug: "rakuten-jp",
    name: "楽天市場",
    regionCode: "japan",
    countryCode: "JP",
    marketplaceType: "shopping",
    baseUrl: "https://www.rakuten.co.jp/",
    adapterKey: "rakuten-jp",
  },
  {
    slug: "amazon-jp",
    name: "Amazon.co.jp",
    regionCode: "japan",
    countryCode: "JP",
    marketplaceType: "retail",
    baseUrl: "https://www.amazon.co.jp/",
    adapterKey: "amazon-jp",
  },  {
    slug: "ebay-us",
    name: "eBay US",
    regionCode: "north-america",
    countryCode: "US",
    marketplaceType: "marketplace",
    baseUrl: "https://www.ebay.com/",
    adapterKey: "ebay-us",
  },
];

export function getMarketplaceDefinitions(): MarketplaceDefinition[] {
  return MARKETPLACES;
}

export function getMarketplaceDefinition(
  slug: string
): MarketplaceDefinition | null {
  return MARKETPLACES.find(
    (marketplace) => marketplace.slug === slug
  ) ?? null;
}

export function registerMarketplaceAdapter(
  adapters: MarketplaceAdapter[]
): Map<string, MarketplaceAdapter> {
  return new Map(
    adapters.map((adapter) => [adapter.definition.adapterKey, adapter])
  );
}
