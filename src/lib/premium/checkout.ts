import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { getCachedLeadEmail } from "@/lib/leads";

export interface PremiumCheckoutResult {
  ok: boolean;
  url?: string;
}

export async function startPremiumCheckout(
  source: string
): Promise<PremiumCheckoutResult> {
  trackEvent(ANALYTICS_EVENTS.premiumPurchaseClick, { source });

  try {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: getCachedLeadEmail() || undefined,
        source,
      }),
    });

    const data = (await response.json()) as { url?: string };

    if (response.ok && data.url) {
      return { ok: true, url: data.url };
    }

    return { ok: false };
  } catch {
    return { ok: false };
  }
}
