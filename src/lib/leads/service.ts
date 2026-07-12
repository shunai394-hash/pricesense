import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { logLeadPipeline } from "@/lib/leads/debug";
import { submitLeadPdfEmail, submitLeadToApi } from "@/lib/leads/api";
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
  context: LeadDiagnosisContext = {}
): Promise<{
  record: LeadRecord;
  submittedToServer: boolean;
  deliveryMode: LeadRegistrationResult["deliveryMode"];
  apiError?: string;
}> {
  const trimmed = email.trim();

  if (!isValidEmail(trimmed)) {
    throw new Error("有効なメールアドレスを入力してください");
  }

  const record = buildLeadRecord(trimmed, leadSource, context);
  cacheLeadRecord(record);

  logLeadPipeline("persistLead:beforeApi", {
    email: trimmed,
    leadSource,
  });

  const apiResult = await submitLeadToApi(stripUndefinedFromLeadRecord(record));

  logLeadPipeline("persistLead:afterApi", {
    ok: apiResult.ok,
    submittedToServer: apiResult.submittedToServer,
    deliveryMode: apiResult.deliveryMode,
    error: apiResult.error,
  });

  return {
    record,
    submittedToServer: apiResult.submittedToServer,
    deliveryMode: apiResult.deliveryMode,
    ...(apiResult.error ? { apiError: apiResult.error } : {}),
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

  logLeadPipeline("registerLeadAndExportPdf:start", { email: params.email });

  const persisted = await persistLead(
    params.email,
    leadSource,
    params.context
  );

  let deliveryMode = persisted.deliveryMode;
  let pdfDownloaded = false;

  try {
    await params.exportPdf();
    pdfDownloaded = true;
    logLeadPipeline("registerLeadAndExportPdf:pdfDownloaded");
  } catch (error) {
    logLeadPipeline("registerLeadAndExportPdf:pdfExportFailed", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  if (params.getPdfAttachment && persisted.submittedToServer) {
    try {
      const pdfAttachment = await params.getPdfAttachment();
      if (pdfAttachment) {
        logLeadPipeline("registerLeadAndExportPdf:sendPdfEmail");
        const emailResult = await submitLeadPdfEmail(
          stripUndefinedFromLeadRecord(persisted.record),
          pdfAttachment
        );
        if (emailResult.ok && emailResult.deliveryMode === "email") {
          deliveryMode = "email";
        }
      }
    } catch (error) {
      logLeadPipeline("registerLeadAndExportPdf:emailFailed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  const result: LeadRegistrationResult = {
    email: persisted.record.email,
    deliveryMode,
    pdfDownloaded,
    storedLocally: true,
    submittedToServer: persisted.submittedToServer,
    record: persisted.record,
    ...(persisted.apiError ? { apiError: persisted.apiError } : {}),
  };

  logLeadPipeline("registerLeadAndExportPdf:complete", {
    submittedToServer: result.submittedToServer,
    deliveryMode: result.deliveryMode,
    pdfDownloaded: result.pdfDownloaded,
  });

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

  if (!persisted.submittedToServer && persisted.apiError) {
    throw new Error(persisted.apiError);
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
