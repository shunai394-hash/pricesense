export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

/**
 * Read env at runtime via bracket access so Next.js does not inline
 * undefined at build time when vars are added after the last build.
 */
function readEnv(name: string): string | undefined {
  return process.env[name];
}

function trimEnv(value: string | undefined): string {
  let v = value?.trim() ?? "";

  if (v.charCodeAt(0) === 0xfeff) {
    v = v.slice(1).trim();
  }

  if (
    v.length >= 2 &&
    ((v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'")))
  ) {
    v = v.slice(1, -1).trim();
  }

  return v.replace(/\r$/, "");
}

export interface StripeConfigDiagnostics {
  hasRawSecretKey: boolean;
  hasRawPriceId: boolean;
  secretKeyLength: number;
  priceIdLength: number;
  secretStartsWithSk: boolean;
  priceStartsWithPrice: boolean;
  rejectReason: string | null;
}

function buildStripeConfigDiagnostics(): StripeConfigDiagnostics {
  const rawSecretKey = readEnv("STRIPE_SECRET_KEY");
  const rawPriceId = readEnv("STRIPE_PRICE_ID");
  const secretKey = trimEnv(rawSecretKey);
  const priceId = trimEnv(rawPriceId);

  let rejectReason: string | null = null;

  if (!secretKey || !priceId) {
    if (!secretKey && !priceId) {
      rejectReason = "missing_both";
    } else if (!secretKey) {
      rejectReason = "missing_secret_key";
    } else {
      rejectReason = "missing_price_id";
    }
  } else if (!secretKey.startsWith("sk_")) {
    rejectReason = "invalid_secret_key_prefix";
  } else if (!priceId.startsWith("price_")) {
    rejectReason = "invalid_price_id_prefix";
  }

  return {
    hasRawSecretKey: rawSecretKey !== undefined && rawSecretKey !== "",
    hasRawPriceId: rawPriceId !== undefined && rawPriceId !== "",
    secretKeyLength: secretKey.length,
    priceIdLength: priceId.length,
    secretStartsWithSk: secretKey.startsWith("sk_"),
    priceStartsWithPrice: priceId.startsWith("price_"),
    rejectReason,
  };
}

function logStripeConfigDiagnostics(context: string): StripeConfigDiagnostics {
  const diagnostics = buildStripeConfigDiagnostics();

  console.log(`[stripe-config] ${context}`, {
    hasRawSecretKey: diagnostics.hasRawSecretKey,
    hasRawPriceId: diagnostics.hasRawPriceId,
    secretStartsWithSk: diagnostics.secretStartsWithSk,
    priceStartsWithPrice: diagnostics.priceStartsWithPrice,
    secretKeyLength: diagnostics.secretKeyLength,
    priceIdLength: diagnostics.priceIdLength,
    rejectReason: diagnostics.rejectReason,
  });

  return diagnostics;
}

/**
 * Returns validated Supabase credentials or null when missing/invalid.
 * Trims whitespace (common when pasting into Vercel env UI).
 */
function readSupabaseUrl(): string {
  return (
    trimEnv(readEnv("SUPABASE_URL")) ||
    trimEnv(readEnv("NEXT_PUBLIC_SUPABASE_URL"))
  );
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = readSupabaseUrl();
  const serviceRoleKey = trimEnv(readEnv("SUPABASE_SERVICE_ROLE_KEY"));

  if (!url || !serviceRoleKey) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
  } catch {
    return null;
  }

  if (serviceRoleKey.length < 20) {
    return null;
  }

  return { url, serviceRoleKey };
}

export function getAppUrl(): string {
  return (
    trimEnv(readEnv("NEXT_PUBLIC_APP_URL")).replace(/\/$/, "") ||
    (process.env.NODE_ENV === "production"
      ? "https://pricesense-pi.vercel.app"
      : "http://localhost:3000")
  );
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function getSupabaseConfigError(): string | null {
  const url = readSupabaseUrl();
  const serviceRoleKey = trimEnv(readEnv("SUPABASE_SERVICE_ROLE_KEY"));

  if (!url && !serviceRoleKey) {
    return "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set";
  }
  if (!url) {
    return "SUPABASE_URL is not set";
  }
  if (!serviceRoleKey) {
    return "SUPABASE_SERVICE_ROLE_KEY is not set";
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "SUPABASE_URL must start with https:// or http://";
    }
  } catch {
    return "SUPABASE_URL is not a valid URL";
  }

  if (serviceRoleKey.length < 20) {
    return "SUPABASE_SERVICE_ROLE_KEY looks invalid (too short)";
  }

  return null;
}

export function isResendConfigured(): boolean {
  const apiKey = trimEnv(readEnv("RESEND_API_KEY"));
  const fromEmail = trimEnv(readEnv("RESEND_FROM_EMAIL"));
  return Boolean(apiKey && fromEmail);
}

export function isStripeConfigured(): boolean {
  return buildStripeConfigDiagnostics().rejectReason === null;
}

export function getStripeConfig(): { secretKey: string; priceId: string } | null {
  const diagnostics = logStripeConfigDiagnostics("getStripeConfig");

  if (diagnostics.rejectReason) {
    return null;
  }

  const secretKey = trimEnv(readEnv("STRIPE_SECRET_KEY"));
  const priceId = trimEnv(readEnv("STRIPE_PRICE_ID"));

  return { secretKey, priceId };
}

export function getStripeConfigDiagnostics(): StripeConfigDiagnostics {
  return buildStripeConfigDiagnostics();
}

export interface CompatibleAiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * Vendor-neutral OpenAI-compatible chat config.
 * Server-only. Never expose these values to the client.
 */
export function getCompatibleAiConfig(): CompatibleAiConfig | null {
  const apiKey =
    trimEnv(readEnv("AI_API_KEY")) || trimEnv(readEnv("OPENAI_API_KEY"));

  if (!apiKey) {
    return null;
  }

  const baseUrl = (
    trimEnv(readEnv("AI_BASE_URL")) ||
    trimEnv(readEnv("OPENAI_BASE_URL")) ||
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");

  const model =
    trimEnv(readEnv("AI_MODEL")) ||
    trimEnv(readEnv("OPENAI_MODEL")) ||
    "gpt-4o-mini";

  return { apiKey, baseUrl, model };
}

export interface FollowupDelayHours {
  followup1Hours: number;
  followup2Hours: number;
  followup3Hours: number;
}

function parseDelayHours(name: string, fallback: number): number {
  const raw = trimEnv(readEnv(name));
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

/** Hours until follow-up #1 / #2 / #3. Override with FOLLOWUP_*_DELAY_HOURS. */
export function getFollowupDelayHours(): FollowupDelayHours {
  return {
    followup1Hours: parseDelayHours("FOLLOWUP_1_DELAY_HOURS", 24),
    followup2Hours: parseDelayHours("FOLLOWUP_2_DELAY_HOURS", 72),
    followup3Hours: parseDelayHours("FOLLOWUP_3_DELAY_HOURS", 168),
  };
}

/** Deal-stage chase delays. Separate from lead FOLLOWUP_* hours. */
export function getDealFollowupDelayHours(): FollowupDelayHours {
  return {
    followup1Hours: parseDelayHours("DEAL_FOLLOWUP_1_DELAY_HOURS", 24),
    followup2Hours: parseDelayHours("DEAL_FOLLOWUP_2_DELAY_HOURS", 72),
    followup3Hours: parseDelayHours("DEAL_FOLLOWUP_3_DELAY_HOURS", 168),
  };
}

/**
 * Shared admin gate for RevOps (and future admin APIs).
 * There was no existing admin UI/auth in this repo; this follows the same
 * server-only env-secret pattern as Stripe / Supabase / AI keys.
 * Unset = fail closed (no admin data).
 */
export function getAdminToken(): string | null {
  const token = trimEnv(readEnv("ADMIN_TOKEN"));
  return token.length > 0 ? token : null;
}
