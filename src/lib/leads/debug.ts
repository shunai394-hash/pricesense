/** Temporary pipeline logging for lead registration (browser console). */
export function logLeadPipeline(
  step: string,
  detail?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  console.info(`[PriceSense:leads] ${step}`, detail ?? "");
}
