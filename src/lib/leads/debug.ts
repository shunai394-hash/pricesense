/** Temporary pipeline logging for lead registration (browser console). */
export function logLeadPipeline(
  step: string,
  detail?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  // warn: visible even when Chrome console "Info" level is hidden
  console.warn(`[PriceSense:leads] ${step}`, detail ?? "");
}
