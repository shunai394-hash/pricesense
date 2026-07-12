import type { LeadRecord } from "@/lib/leads/types";

function coerceOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return Math.round(num);
}

/** Build a minimal, API-safe lead payload (email-only save supported). */
export function serializeLeadRecordForApi(record: LeadRecord): LeadRecord {
  const payload: LeadRecord = {
    leadSource:
      record.leadSource === "premium_waitlist" ? "premium_waitlist" : "pdf_export",
    email: record.email.trim(),
    createdAt: record.createdAt || new Date().toISOString(),
  };

  if (record.categoryId) payload.categoryId = String(record.categoryId);
  if (record.categoryName) payload.categoryName = String(record.categoryName);

  const userRate = coerceOptionalInt(record.userRate);
  if (userRate !== undefined) payload.userRate = userRate;

  const marketRate = coerceOptionalInt(record.marketRate);
  if (marketRate !== undefined) payload.marketRate = marketRate;

  const targetRate = coerceOptionalInt(record.targetRate);
  if (targetRate !== undefined) payload.targetRate = targetRate;

  if (record.diagnosisLevel) payload.diagnosisLevel = record.diagnosisLevel;

  return payload;
}
