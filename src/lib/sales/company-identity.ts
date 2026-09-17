const CONSUMER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.co.jp",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "outlook.jp",
  "live.jp",
  "live.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "docomo.ne.jp",
  "ezweb.ne.jp",
  "au.com",
  "softbank.ne.jp",
  "i.softbank.jp",
]);

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain.includes(".") ? domain : null;
}

export function isConsumerEmailDomain(domain: string | null): boolean {
  return !domain || CONSUMER_DOMAINS.has(domain);
}

const LEGAL_SUFFIXES = [
  "株式会社",
  "有限会社",
  "合同会社",
  "合資会社",
  "合名会社",
  "一般社団法人",
  "公益社団法人",
  "一般財団法人",
  "公益財団法人",
  "inc",
  "inc.",
  "incorporated",
  "corp",
  "corp.",
  "corporation",
  "co",
  "co.",
  "ltd",
  "ltd.",
  "limited",
  "llc",
  "gmbh",
  "kk",
  "k.k.",
  "kabushiki kaisha",
];

export function normalizeDomain(
  value: string | null | undefined
): string | null {
  const raw = text(value)?.toLowerCase() ?? null;
  if (!raw) return null;
  try {
    const host = raw.includes("://")
      ? new URL(raw).hostname.toLowerCase()
      : raw.replace(/^www\./, "");
    const cleaned = host.replace(/^www\./, "").replace(/\/.*$/, "");
    if (!cleaned.includes(".")) return null;
    if (isConsumerEmailDomain(cleaned)) return null;
    return cleaned;
  } catch {
    const cleaned = raw.replace(/^www\./, "").replace(/\/.*$/, "");
    return cleaned.includes(".") && !isConsumerEmailDomain(cleaned)
      ? cleaned
      : null;
  }
}

export function normalizeCompanyName(
  value: string | null | undefined
): string | null {
  const raw = text(value);
  if (!raw) return null;
  let name = raw
    .normalize("NFKC")
    .replace(/[（(].*?[）)]/g, " ")
    .replace(/[・･]/g, " ")
    .toLowerCase();
  for (const suffix of LEGAL_SUFFIXES) {
    name = name.replace(new RegExp(`\\b${suffix.replace(".", "\\.")}\\b`, "gi"), " ");
    name = name.replace(suffix.toLowerCase(), " ");
  }
  name = name.replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, " ").trim();
  return name || null;
}

export function companyMatchKeys(input: {
  name?: string | null;
  domain?: string | null;
  websiteUrl?: string | null;
  country?: string | null;
  registrationId?: string | null;
}): string[] {
  const keys: string[] = [];
  const domain =
    normalizeDomain(input.domain) ?? normalizeDomain(input.websiteUrl);
  const name = normalizeCompanyName(input.name);
  const country = text(input.country)?.toUpperCase() ?? null;
  const registration = text(input.registrationId)?.toUpperCase() ?? null;

  if (domain) keys.push(`domain:${domain}`);
  if (registration) keys.push(`reg:${registration}`);
  if (name && country) keys.push(`name-country:${name}:${country}`);
  if (name) keys.push(`name:${name}`);
  return keys;
}

export function companyIdentityFromLead(lead: {
  id: string;
  email: string | null;
  company_name: string | null;
}): { key: string; name: string; domain: string | null } {
  const domain = parseEmailDomain(lead.email);
  const companyName = text(lead.company_name);
  const consumer = isConsumerEmailDomain(domain);
  const normalizedDomain = consumer ? null : normalizeDomain(domain);
  const normalizedName = normalizeCompanyName(companyName);

  if (companyName) {
    return {
      key: normalizedName ? `name:${normalizedName}` : `name:${companyName.toLowerCase()}`,
      name: companyName,
      domain: normalizedDomain,
    };
  }

  if (normalizedDomain) {
    return {
      key: `domain:${normalizedDomain}`,
      name: domain ?? normalizedDomain,
      domain: normalizedDomain,
    };
  }

  const email = text(lead.email);
  return {
    key: `lead:${lead.id}`,
    name: email ?? `Lead ${lead.id.slice(0, 8)}`,
    domain: null,
  };
}
