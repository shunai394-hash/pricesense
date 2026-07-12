import type { DiagnosisLevel } from "@/lib/calculator";

export type LeadSource = "pdf_export" | "premium_waitlist";

export type LeadDeliveryMode = "local_download" | "email";

/** Diagnosis context captured at lead registration time. */
export interface LeadDiagnosisContext {
  categoryId?: string;
  categoryName?: string;
  userRate?: number;
  marketRate?: number;
  diagnosisLevel?: DiagnosisLevel;
  targetRate?: number;
}

/** Full lead record for localStorage and POST /api/leads. */
export interface LeadRecord {
  leadSource: LeadSource;
  email: string;
  categoryId?: string;
  categoryName?: string;
  userRate?: number;
  marketRate?: number;
  diagnosisLevel?: DiagnosisLevel;
  targetRate?: number;
  createdAt: string;
}

export type LeadSubmissionPayload = LeadRecord;

export interface PdfAttachmentPayload {
  filename: string;
  contentBase64: string;
}

export interface LeadApiRequest {
  record: LeadRecord;
  pdfAttachment?: PdfAttachmentPayload;
}

export interface LeadApiResponse {
  ok: boolean;
  deliveryMode: LeadDeliveryMode;
  error?: string;
}

export interface LeadRegistrationResult {
  email: string;
  deliveryMode: LeadDeliveryMode;
  pdfDownloaded: boolean;
  storedLocally: boolean;
  submittedToServer: boolean;
  record: LeadRecord;
}

export interface LeadWaitlistResult {
  email: string;
  storedLocally: boolean;
  submittedToServer: boolean;
  record: LeadRecord;
}
