import type { LeadRecord } from "@/lib/leads/types";

const LEAD_EMAIL_KEY = "pricesense_lead_email";
const LEAD_CONTEXT_KEY = "pricesense_lead_context";
const MAX_STORED_LEADS = 50;

function parseLeadContextRaw(raw: string): LeadRecord[] {
  const parsed: unknown = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    return parsed.filter(isLeadRecord);
  }

  if (isLeadRecord(parsed)) {
    return [parsed];
  }

  return [];
}

function isLeadRecord(value: unknown): value is LeadRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as LeadRecord;
  return (
    typeof record.email === "string" &&
    typeof record.leadSource === "string" &&
    typeof record.createdAt === "string"
  );
}

/** Client-only cache so returning users can skip re-entering their email. */
export function getCachedLeadEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LEAD_EMAIL_KEY) ?? "";
}

export function cacheLeadEmail(email: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LEAD_EMAIL_KEY, email.trim());
}

export function clearCachedLeadEmail(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEAD_EMAIL_KEY);
}

/** Appends a lead record to pricesense_lead_context (newest last). */
export function cacheLeadRecord(record: LeadRecord): void {
  if (typeof window === "undefined") return;
  cacheLeadEmail(record.email);

  const records = getCachedLeadRecords();
  const updated = [...records, record].slice(-MAX_STORED_LEADS);
  localStorage.setItem(LEAD_CONTEXT_KEY, JSON.stringify(updated));
}

export function getCachedLeadRecords(): LeadRecord[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(LEAD_CONTEXT_KEY);
  if (!raw) return [];

  try {
    return parseLeadContextRaw(raw);
  } catch {
    return [];
  }
}

/** Returns the most recently stored lead record. */
export function getCachedLeadRecord(): LeadRecord | null {
  const records = getCachedLeadRecords();
  return records.length > 0 ? records[records.length - 1] : null;
}

export function clearCachedLeadRecord(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEAD_CONTEXT_KEY);
}
