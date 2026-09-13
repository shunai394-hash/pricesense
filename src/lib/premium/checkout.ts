import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { getCachedLeadEmail } from "@/lib/leads";

export interface PremiumCheckoutResult {
  ok: boolean;
  url?: string;
  error?: string;
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

    let data: { url?: string; error?: string } = {};
    try {
      data = (await response.json()) as { url?: string; error?: string };
    } catch {
      // Response body may be empty on some failures.
    }

    if (response.ok && data.url) {
      return { ok: true, url: data.url };
    }

    const fallback =
      response.status === 503
        ? "決済機能の準備ができていません。しばらくしてから再度お試しください。"
        : "決済の開始に失敗しました。時間をおいて再度お試しください。";

    return {
      ok: false,
      error: data.error ?? fallback,
    };
  } catch {
    return {
      ok: false,
      error: "決済の開始に失敗しました。ネットワーク接続をご確認ください。",
    };
  }
}
