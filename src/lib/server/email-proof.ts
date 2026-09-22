import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseConfig } from "@/lib/server/env";
import { normalizePremiumEmail } from "@/lib/server/premium";

/**
 * Proves that a specific browser is the one that legitimately established an
 * email address (via a real Stripe checkout session or by submitting the
 * diagnosis lead form), without requiring Supabase Auth login. This keeps the
 * public diagnosis/account funnel anonymous while preventing an unrelated
 * visitor from probing arbitrary third-party emails against the premium
 * status/account endpoints.
 */

const COOKIE_NAME = "ps_email_proof";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

function getSigningSecret(): string | null {
  return getSupabaseConfig()?.serviceRoleKey ?? null;
}

function sign(email: string, expiresAt: number, secret: string): string {
  return createHmac("sha256", secret).update(`${email}|${expiresAt}`).digest("hex");
}

export function createEmailProofCookieValue(email: string): string | null {
  const secret = getSigningSecret();
  const normalized = normalizePremiumEmail(email);
  if (!secret || !normalized) return null;

  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const signature = sign(normalized, expiresAt, secret);
  return `${normalized}|${expiresAt}|${signature}`;
}

export function verifyEmailProof(
  cookieValue: string | undefined | null,
  email: string
): boolean {
  const secret = getSigningSecret();
  const normalized = normalizePremiumEmail(email);
  if (!secret || !normalized || !cookieValue) return false;

  const parts = cookieValue.split("|");
  if (parts.length !== 3) return false;
  const [provenEmail, expiresAtRaw, signature] = parts;
  if (provenEmail !== normalized) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = sign(provenEmail, expiresAt, secret);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export const EMAIL_PROOF_COOKIE_NAME = COOKIE_NAME;
export const EMAIL_PROOF_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
