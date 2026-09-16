import { createHash } from "node:crypto";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "example.com",
  "example.org",
  "example.net",
  "invalid",
  "test",
]);

export function canonicalizeUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith(".example")) return null;
  if (host.endsWith(".local") || host.endsWith(".invalid")) return null;
  if (/^\d+$/.test(host.replaceAll(".", ""))) return null;

  parsed.hash = "";
  parsed.username = "";
  parsed.password = "";
  if (parsed.pathname.endsWith("/") && parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }
  return parsed.toString();
}

export function sourceFingerprint(input: {
  url: string;
  title?: string | null;
}): string {
  const host = (() => {
    try {
      return new URL(input.url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  const title = (input.title ?? "")
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, " ")
    .trim();
  return createHash("sha256")
    .update(`${host}|${title || input.url}`)
    .digest("hex");
}

export function entityCanonicalKey(
  type: string,
  name: string,
  extra?: string | null
): string {
  const normalized = name
    .toLowerCase()
    .replace(/[®™]/g, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, " ")
    .trim();
  const extraPart = extra ? extra.toLowerCase().trim() : "";
  return `${type}:${normalized}${extraPart ? `:${extraPart}` : ""}`;
}

export function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}
