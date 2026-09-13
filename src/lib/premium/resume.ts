export const RESUME_NEGOTIATION_KEY = "pricesense_resume_negotiation";

export function markResumeNegotiation(): void {
  try {
    sessionStorage.setItem(RESUME_NEGOTIATION_KEY, "1");
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

export function consumeResumeNegotiation(): boolean {
  try {
    const shouldResume = sessionStorage.getItem(RESUME_NEGOTIATION_KEY) === "1";
    if (shouldResume) {
      sessionStorage.removeItem(RESUME_NEGOTIATION_KEY);
    }
    return shouldResume;
  } catch {
    return false;
  }
}
