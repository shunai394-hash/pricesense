import type { DiagnosisLevel } from "@/lib/calculator";
import type { LeadRecord } from "@/lib/leads/types";

const VALID_LEAD_SOURCES = new Set(["pdf_export", "premium_waitlist"]);

const VALID_DIAGNOSIS_LEVELS = new Set<DiagnosisLevel>([
  "significantly_low",
  "below_market",
  "at_market",
  "above_market",
  "premium",
]);

export interface LeadApiRequestBody {
  record: LeadRecord;
  pdfAttachment?: {
    filename: string;
    contentBase64: string;
  };
  sendPdfEmailOnly?: boolean;
}

function coerceOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return Math.round(num);
}

function coerceOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isAcceptableEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 254) return false;
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return false;
  const domain = trimmed.slice(at + 1);
  return domain.includes(".");
}

/** Normalize partial client payloads into a DB-safe lead record. */
export function normalizeLeadRecord(input: unknown): LeadRecord {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid record");
  }

  const partial = input as Partial<LeadRecord> & { email?: unknown };
  const email = coerceOptionalString(partial.email)?.toLowerCase();

  if (!email || !isAcceptableEmail(email)) {
    throw new Error("Invalid email");
  }

  const leadSource =
    partial.leadSource === "premium_waitlist" ? "premium_waitlist" : "pdf_export";

  let createdAt = coerceOptionalString(partial.createdAt);
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
    createdAt = new Date().toISOString();
  }

  const record: LeadRecord = {
    leadSource,
    email,
    createdAt,
  };

  const categoryId = coerceOptionalString(partial.categoryId);
  if (categoryId) record.categoryId = categoryId;

  const categoryName = coerceOptionalString(partial.categoryName);
  if (categoryName) record.categoryName = categoryName;

  const userRate = coerceOptionalInt(partial.userRate);
  if (userRate !== undefined) record.userRate = userRate;

  const marketRate = coerceOptionalInt(partial.marketRate);
  if (marketRate !== undefined) record.marketRate = marketRate;

  const targetRate = coerceOptionalInt(partial.targetRate);
  if (targetRate !== undefined) record.targetRate = targetRate;

  const diagnosisLevel = coerceOptionalString(partial.diagnosisLevel);
  if (
    diagnosisLevel &&
    VALID_DIAGNOSIS_LEVELS.has(diagnosisLevel as DiagnosisLevel)
  ) {
    record.diagnosisLevel = diagnosisLevel as DiagnosisLevel;
  }

  return record;
}

export function parseLeadApiRequestBody(body: unknown): LeadApiRequestBody {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const payload = body as Record<string, unknown>;

  let recordInput: unknown = payload.record;
  if (!recordInput && typeof payload.email === "string") {
    recordInput = {
      email: payload.email,
      leadSource: payload.leadSource,
      createdAt: payload.createdAt,
    };
  }

  const record = normalizeLeadRecord(recordInput);

  const sendPdfEmailOnly = payload.sendPdfEmailOnly === true;

  let pdfAttachment: LeadApiRequestBody["pdfAttachment"];
  if (payload.pdfAttachment !== undefined && payload.pdfAttachment !== null) {
    pdfAttachment = normalizePdfAttachment(payload.pdfAttachment);
  }

  return {
    record,
    ...(pdfAttachment ? { pdfAttachment } : {}),
    ...(sendPdfEmailOnly ? { sendPdfEmailOnly: true } : {}),
  };
}

function normalizePdfAttachment(
  input: unknown
): LeadApiRequestBody["pdfAttachment"] {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid pdfAttachment");
  }

  const attachment = input as {
    filename?: unknown;
    contentBase64?: unknown;
  };

  const filename = coerceOptionalString(attachment.filename);
  const contentBase64 = coerceOptionalString(attachment.contentBase64);

  if (!filename || !contentBase64) {
    throw new Error("Invalid pdfAttachment");
  }

  if (contentBase64.length > 8_000_000) {
    throw new Error("PDF attachment too large");
  }

  return { filename, contentBase64 };
}

/** @deprecated Use normalizeLeadRecord instead. */
export function validateLeadRecord(record: LeadRecord): void {
  if (!VALID_LEAD_SOURCES.has(record.leadSource)) {
    throw new Error("Invalid leadSource");
  }

  if (!isAcceptableEmail(record.email)) {
    throw new Error("Invalid email");
  }

  if (!record.createdAt || Number.isNaN(Date.parse(record.createdAt))) {
    throw new Error("Invalid createdAt");
  }
}
