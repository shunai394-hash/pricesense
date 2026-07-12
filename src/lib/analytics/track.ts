import { isAnalyticsEnabled } from "@/lib/analytics/config";
import type { AnalyticsEventName } from "@/lib/analytics/events";

export type AnalyticsEventParams = Record<
  string,
  string | number | boolean | undefined
>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function sanitizeParams(
  params?: AnalyticsEventParams
): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;

  const sanitized = Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string | number | boolean] => {
      const value = entry[1];
      return value !== undefined && value !== null && value !== "";
    })
  );

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function trackEvent(
  event: AnalyticsEventName,
  params?: AnalyticsEventParams
): void {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) return;

  const sanitizedParams = sanitizeParams(params);
  window.gtag?.("event", event, sanitizedParams);
}
