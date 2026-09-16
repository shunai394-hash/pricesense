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

export function companyIdentityFromLead(lead: {
  id: string;
  email: string | null;
  company_name: string | null;
}): { key: string; name: string; domain: string | null } {
  const domain = parseEmailDomain(lead.email);
  const companyName = text(lead.company_name);
  const consumer = isConsumerEmailDomain(domain);

  if (companyName) {
    return {
      key: `name:${companyName.toLowerCase()}`,
      name: companyName,
      domain: consumer ? null : domain,
    };
  }

  if (domain && !consumer) {
    return {
      key: `domain:${domain}`,
      name: domain,
      domain,
    };
  }

  const email = text(lead.email);
  return {
    key: `lead:${lead.id}`,
    name: email ?? `Lead ${lead.id.slice(0, 8)}`,
    domain: null,
  };
}
