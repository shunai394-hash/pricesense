export type {
  LeadApiResponse,
  LeadDeliveryMode,
  LeadDiagnosisContext,
  LeadRecord,
  LeadRegistrationResult,
  LeadSource,
  LeadSubmissionPayload,
  LeadWaitlistResult,
  PdfAttachmentPayload,
} from "@/lib/leads/types";

export {
  getCachedLeadEmail,
  getCachedLeadRecord,
  getCachedLeadRecords,
  cacheLeadEmail,
  cacheLeadRecord,
  clearCachedLeadEmail,
  clearCachedLeadRecord,
} from "@/lib/leads/storage";
export { submitLeadToApi } from "@/lib/leads/api";
export {
  buildLeadRecord,
  registerLeadAndExportPdf,
  registerPremiumWaitlist,
  type RegisterLeadForPdfParams,
  type RegisterPremiumWaitlistParams,
} from "@/lib/leads/service";
