import type {
  LeadApiRequest,
  LeadApiResponse,
  LeadRecord,
  PdfAttachmentPayload,
} from "@/lib/leads/types";
import { logLeadPipeline } from "@/lib/leads/debug";
import { serializeLeadRecordForApi } from "@/lib/leads/serialize";

/** Avoid /api/leads — commonly blocked by privacy/ad blocklists. */
const LEAD_API_PATH = "/api/save-report";
const LEAD_API_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    LEAD_API_TIMEOUT_MS
  );

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function parseApiErrorMessage(response: Response): Promise<string> {
  const fallback = "リード登録に失敗しました";

  let raw = "";
  try {
    raw = await response.text();
  } catch {
    return response.status === 503
      ? "サーバーが準備中です。しばらくしてから再度お試しください。"
      : fallback;
  }

  try {
    const data = JSON.parse(raw) as { error?: string };
    if (typeof data.error === "string" && data.error.length > 0) {
      if (
        /service_role|SUPABASE|ADMIN_TOKEN|Failed to save lead|postgres|PGRST/i.test(
          data.error
        )
      ) {
        return fallback;
      }
      return data.error.slice(0, 300);
    }
  } catch {
    if (raw.length > 0) {
      return fallback;
    }
  }

  if (response.status === 503) {
    return "サーバーが準備中です。しばらくしてから再度お試しください。";
  }

  return fallback;
}

interface SubmitLeadOptions {
  sendPdfEmailOnly?: boolean;
}

async function postLeadRequest(
  requestBody: LeadApiRequest
): Promise<LeadApiResponse> {
  logLeadPipeline("submitLeadToApi:fetch", {
    path: LEAD_API_PATH,
    sendPdfEmailOnly: requestBody.sendPdfEmailOnly ?? false,
    hasPdf: Boolean(requestBody.pdfAttachment),
    email: requestBody.record.email,
  });

  try {
    const response = await fetchWithTimeout(LEAD_API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    logLeadPipeline("submitLeadToApi:response", {
      status: response.status,
      ok: response.ok,
    });

    if (response.status === 503) {
      return {
        ok: true,
        deliveryMode: "local_download",
        submittedToServer: false,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        deliveryMode: "local_download",
        submittedToServer: false,
        error: await parseApiErrorMessage(response),
      };
    }

    const data = (await response.json()) as {
      deliveryMode?: LeadApiResponse["deliveryMode"];
    };

    return {
      ok: true,
      deliveryMode: data.deliveryMode ?? "local_download",
      submittedToServer: !requestBody.sendPdfEmailOnly,
    };
  } catch (error) {
    logLeadPipeline("submitLeadToApi:error", {
      message: error instanceof Error ? error.message : "unknown",
    });

    return {
      ok: false,
      deliveryMode: "local_download",
      submittedToServer: false,
      error: "リード登録に失敗しました。時間をおいて再度お試しください。",
    };
  }
}

/**
 * Submits a lead to POST /api/save-report.
 * Server-side env (Supabase/Resend) controls persistence.
 */
export async function submitLeadToApi(
  payload: LeadRecord,
  pdfAttachment?: PdfAttachmentPayload,
  options?: SubmitLeadOptions
): Promise<LeadApiResponse> {
  const requestBody: LeadApiRequest = {
    record: serializeLeadRecordForApi(payload),
    ...(pdfAttachment?.filename && pdfAttachment.contentBase64
      ? { pdfAttachment }
      : {}),
    ...(options?.sendPdfEmailOnly ? { sendPdfEmailOnly: true } : {}),
  };

  return postLeadRequest(requestBody);
}

/** Sends the diagnosis PDF by email without inserting another lead row. */
export async function submitLeadPdfEmail(
  payload: LeadRecord,
  pdfAttachment: PdfAttachmentPayload
): Promise<LeadApiResponse> {
  return submitLeadToApi(payload, pdfAttachment, { sendPdfEmailOnly: true });
}
