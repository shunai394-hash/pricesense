const PREMIUM_STATUS_KEY = "pricesense_premium_status";

export interface CachedPremiumStatus {
  isPremium: boolean;
  email: string;
  checkedAt: string;
}

export function getCachedPremiumStatus(): CachedPremiumStatus | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(PREMIUM_STATUS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedPremiumStatus;
    if (
      typeof parsed.isPremium === "boolean" &&
      typeof parsed.email === "string" &&
      typeof parsed.checkedAt === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function cachePremiumStatus(status: CachedPremiumStatus): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREMIUM_STATUS_KEY, JSON.stringify(status));
}

export function clearPremiumStatusCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PREMIUM_STATUS_KEY);
}
