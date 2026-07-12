import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { submitLeadToApi } from "@/lib/leads/api";
import { cacheLeadRecord } from "@/lib/leads/storage";
import type {
  LeadDiagnosisContext,
  LeadRecord,
  LeadRegistrationResult,
  LeadSource,
  LeadWaitlistResult,
  PdfAttachmentPayload,
} from "@/lib/leads/types";
import { isValidEmail } from "@/lib/leadCapture";

export function buildLeadRecord(
  email: string,
  leadSource: LeadSource,
  context: LeadDiagnosisContext = {}
): LeadRecord {
  return {
    leadSource,
    email,
    categoryId: context.categoryId,
    categoryName: context.categoryName,
    userRate: context.userRate,
    marketRate: context.marketRate,
    diagnosisLevel: context.diagnosisLevel,
    targetRate: context.targetRate,
    createdAt: new Date().toISOString(),
  };
}

function stripUndefinedFromLeadRecord(record: LeadRecord): LeadRecord {
  return {
    leadSource: record.leadSource,
    email: record.email,
    createdAt: record.createdAt,
    ...(record.categoryId !== undefined ? { categoryId: record.categoryId } : {}),
    ...(record.categoryName !== undefined ? { categoryName: record.categoryName } : {}),
    ...(record.userRate !== undefined ? { userRate: record.userRate } : {}),
    ...(record.marketRate !== undefined ? { marketRate: record.marketRate } : {}),
    ...(record.diagnosisLevel !== undefined
      ? { diagnosisLevel: record.diagnosisLevel }
      : {}),
    ...(record.targetRate !== undefined ? { targetRate: record.targetRate } : {}),
  };
}

async function persistLead(
  email: string,
  leadSource: LeadSource,
  context: LeadDiagnosisContext = {},
  pdfAttachment?: PdfAttachmentPayload
): Promise<{
  record: LeadRecord;
  submittedToServer: boolean;
  deliveryMode: LeadRegistrationResult["deliveryMode"];
  error?: string;
}> {
  const trimmed = email.trim();

  if (!isValidEmail(trimmed)) {
    throw new Error("有効なメールアドレスを入力してください");
  }

  const record = buildLeadRecord(trimmed, leadSource, context);
  cacheLeadRecord(record);

  const apiEnabled = process.env.NEXT_PUBLIC_LEAD_API_ENABLED === "true";
  const apiResult = await submitLeadToApi(
    stripUndefinedFromLeadRecord(record),
    pdfAttachment
  );

  if (!apiResult.ok) {
    return {
      record,
      submittedToServer: false,
      deliveryMode: apiResult.deliveryMode,
      error: apiResult.error,
    };
  }

  return {
    record,
    submittedToServer: apiEnabled && apiResult.ok,
    deliveryMode: apiResult.deliveryMode,
  };
}

function trackLeadRegistered(
  leadSource: LeadSource,
  record: LeadRecord,
  submittedToServer: boolean,
  deliveryMode?: LeadRegistrationResult["deliveryMode"]
): void {
  trackEvent(ANALYTICS_EVENTS.leadRegistered, {
    source: leadSource,
    category_id: record.categoryId,
    user_rate: record.userRate,
    ...(deliveryMode !== undefined ? { delivery_mode: deliveryMode } : {}),
    submitted_to_server: submittedToServer,
  });
}

export interface RegisterLeadForPdfParams {
  email: string;
  source?: LeadSource;
  context?: LeadDiagnosisContext;
  exportPdf: () => Promise<void>;
  getPdfAttachment?: () => Promise<PdfAttachmentPayload | null>;
}

export async function registerLeadAndExportPdf(
  params: RegisterLeadForPdfParams
): Promise<LeadRegistrationResult> {
  const leadSource = params.source ?? "pdf_export";
  const apiEnabled = process.env.NEXT_PUBLIC_LEAD_API_ENABLED === "true";
  const pdfAttachment =
    apiEnabled && params.getPdfAttachment
      ? await params.getPdfAttachment()
      : undefined;

  const persisted = await persistLead(
    params.email,
    leadSource,
    params.context,
    pdfAttachment ?? undefined
  );

  if (persisted.error) {
    throw new Error(persisted.error);
  }

  await params.exportPdf();

  const result: LeadRegistrationResult = {
    email: persisted.record.email,
    deliveryMode: persisted.deliveryMode,
    pdfDownloaded: true,
    storedLocally: true,
    submittedToServer: persisted.submittedToServer,
    record: persisted.record,
  };

  trackLeadRegistered(
    leadSource,
    persisted.record,
    result.submittedToServer,
    result.deliveryMode
  );

  return result;
}

export interface RegisterPremiumWaitlistParams {
  email: string;
  context?: LeadDiagnosisContext;
}

export async function registerPremiumWaitlist(
  params: RegisterPremiumWaitlistParams
): Promise<LeadWaitlistResult> {
  const persisted = await persistLead(
    params.email,
    "premium_waitlist",
    params.context
  );

  if (persisted.error) {
    throw new Error(persisted.error ?? "登録に失敗しました");
  }

  const result: LeadWaitlistResult = {
    email: persisted.record.email,
    storedLocally: true,
    submittedToServer: persisted.submittedToServer,
    record: persisted.record,
  };

  trackLeadRegistered(
    "premium_waitlist",
    persisted.record,
    result.submittedToServer
  );

  return result;
}
