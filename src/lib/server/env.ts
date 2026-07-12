export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

/**
 * Returns validated Supabase credentials or null when missing/invalid.
 * Trims whitespace (common when pasting into Vercel env UI).
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = trimEnv(process.env.SUPABASE_URL);
  const serviceRoleKey = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

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
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function getSupabaseConfigError(): string | null {
  const url = trimEnv(process.env.SUPABASE_URL);
  const serviceRoleKey = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

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
  const apiKey = trimEnv(process.env.RESEND_API_KEY);
  const fromEmail = trimEnv(process.env.RESEND_FROM_EMAIL);
  return Boolean(apiKey && fromEmail);
}

export function isStripeConfigured(): boolean {
  const secretKey = trimEnv(process.env.STRIPE_SECRET_KEY);
  const priceId = trimEnv(process.env.STRIPE_PRICE_ID);
  return Boolean(secretKey && priceId);
}
