import { canonicalizeUrl, decodeXmlEntities } from "@/lib/research/urls";
import type { ResearchRegion } from "@/lib/research/regions";

export interface FeedItem {
  title: string;
  url: string;
  sourceName: string | null;
  publishedAt: string | null;
  snippet: string | null;
  language: string | null;
}

const FETCH_TIMEOUT_MS = 12_000;
const MAX_ITEMS = 8;

function googleNewsUrl(query: string, region: ResearchRegion | string): string {
  const japan = region === "japan";
  const params = new URLSearchParams({
    q: query,
    hl: japan ? "ja" : "en-US",
    gl: japan ? "JP" : "US",
    ceid: japan ? "JP:ja" : "US:en",
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

function tagValue(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match?.[1]) return null;
  const decoded = decodeXmlEntities(match[1]);
  return decoded || null;
}

function parsePubDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

export function parseRssItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = tagValue(block, "title");
    const link = tagValue(block, "link") ?? tagValue(block, "guid");
    if (!title || !link) continue;
    const url = canonicalizeUrl(link);
    if (!url) continue;
    const sourceMatch = block.match(
      /<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/i
    );
    items.push({
      title,
      url,
      sourceName: sourceMatch?.[2]
        ? decodeXmlEntities(sourceMatch[2])
        : tagValue(block, "source"),
      publishedAt: parsePubDate(tagValue(block, "pubDate")),
      snippet: tagValue(block, "description"),
      language: null,
    });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.8",
        "User-Agent": "PriceSenseResearchBot/1.0",
      },
      redirect: "follow",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Feed returned ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPublicNewsFeed(input: {
  query: string;
  region: ResearchRegion | string;
}): Promise<{ items: FeedItem[]; feedUrl: string; error: string | null }> {
  const feedUrl = googleNewsUrl(input.query, input.region);
  try {
    const xml = await fetchText(feedUrl);
    const items = parseRssItems(xml);
    return { items, feedUrl, error: items.length === 0 ? "フィードに有効な記事がありません" : null };
  } catch (error) {
    return {
      items: [],
      feedUrl,
      error:
        error instanceof Error && error.name === "AbortError"
          ? "フィード取得がタイムアウトしました"
          : error instanceof Error
            ? error.message
            : "フィード取得に失敗しました",
    };
  }
}

export async function fetchSourcePreview(url: string): Promise<{
  ok: boolean;
  title: string | null;
  snippet: string | null;
  error: string | null;
}> {
  const canonical = canonicalizeUrl(url);
  if (!canonical) {
    return { ok: false, title: null, snippet: null, error: "URLが不正です" };
  }
  try {
    const html = await fetchText(canonical);
    const title =
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null;
    const snippet =
      html.match(
        /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"]+)/i
      )?.[1] ?? null;
    return {
      ok: true,
      title: title ? decodeXmlEntities(title).slice(0, 240) : null,
      snippet: snippet ? decodeXmlEntities(snippet).slice(0, 400) : null,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      title: null,
      snippet: null,
      error:
        error instanceof Error && error.name === "AbortError"
          ? "ソース取得がタイムアウトしました"
          : "ソースURLを取得できませんでした",
    };
  }
}
