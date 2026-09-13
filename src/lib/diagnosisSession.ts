const DIAGNOSIS_SESSION_KEY = "pricesense_diagnosis_session";

export interface DiagnosisSession {
  categoryId: string;
  userRate: string;
  targetRate: number;
}

export function persistDiagnosisSession(session: DiagnosisSession): void {
  try {
    sessionStorage.setItem(DIAGNOSIS_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage failures.
  }
}

export function restoreDiagnosisSession(): DiagnosisSession | null {
  try {
    const raw = sessionStorage.getItem(DIAGNOSIS_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiagnosisSession;
    if (!parsed.categoryId || typeof parsed.userRate !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
