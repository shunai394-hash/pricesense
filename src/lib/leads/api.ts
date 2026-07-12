import type { LeadApiRequest, LeadApiResponse, LeadRecord, PdfAttachmentPayload } from "@/lib/leads/types";

const LEAD_API_PATH = "/api/leads";

function isLeadApiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LEAD_API_ENABLED === "true";
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
      return data.error;
    }
  } catch {
    if (raw.length > 0) {
      return raw;
    }
  }

  if (response.status === 503) {
    return "サーバーが準備中です。しばらくしてから再度お試しください。";
  }

  return fallback;
}

/**
 * Submits a lead to POST /api/leads when NEXT_PUBLIC_LEAD_API_ENABLED=true.
 */
export async function submitLeadToApi(
  payload: LeadRecord,
  pdfAttachment?: PdfAttachmentPayload
): Promise<LeadApiResponse> {
  if (!isLeadApiEnabled()) {
    return {
      ok: true,
      deliveryMode: "local_download",
    };
  }

  const requestBody: LeadApiRequest = {
    record: payload,
    ...(pdfAttachment ? { pdfAttachment } : {}),
  };

  try {
    const response = await fetch(LEAD_API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return {
        ok: false,
        deliveryMode: "local_download",
        error: await parseApiErrorMessage(response),
      };
    }

    const data = (await response.json()) as {
      deliveryMode?: LeadApiResponse["deliveryMode"];
    };

    return {
      ok: true,
      deliveryMode: data.deliveryMode ?? "email",
    };
  } catch {
    return {
      ok: false,
      deliveryMode: "local_download",
      error: "リード登録に失敗しました。時間をおいて再度お試しください。",
    };
  }
}
