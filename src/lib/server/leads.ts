import type { LeadRecord } from "@/lib/leads/types";
import { isValidEmail } from "@/lib/leadCapture";

const VALID_LEAD_SOURCES = new Set(["pdf_export", "premium_waitlist"]);

export interface LeadApiRequestBody {
  record: LeadRecord;
  pdfAttachment?: {
    filename: string;
    contentBase64: string;
  };
  sendPdfEmailOnly?: boolean;
}

export function parseLeadApiRequestBody(body: unknown): LeadApiRequestBody {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const payload = body as LeadApiRequestBody;

  if (!payload.record || typeof payload.record !== "object") {
    throw new Error("record is required");
  }

  validateLeadRecord(payload.record);

  if (payload.pdfAttachment !== undefined) {
    validatePdfAttachment(payload.pdfAttachment);
  }

  return payload;
}

export function validateLeadRecord(record: LeadRecord): void {
  if (!VALID_LEAD_SOURCES.has(record.leadSource)) {
    throw new Error("Invalid leadSource");
  }

  if (!isValidEmail(record.email)) {
    throw new Error("Invalid email");
  }

  if (!record.createdAt || Number.isNaN(Date.parse(record.createdAt))) {
    throw new Error("Invalid createdAt");
  }
}

function validatePdfAttachment(attachment: {
  filename: string;
  contentBase64: string;
}): void {
  if (!attachment.filename || !attachment.contentBase64) {
    throw new Error("Invalid pdfAttachment");
  }

  if (attachment.contentBase64.length > 8_000_000) {
    throw new Error("PDF attachment too large");
  }
}
