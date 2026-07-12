import { NextResponse } from "next/server";
import type { LeadDeliveryMode } from "@/lib/leads/types";
import { parseLeadApiRequestBody } from "@/lib/server/leads";
import { sendDiagnosisPdfEmail } from "@/lib/server/resend";
import { insertLeadRecord } from "@/lib/server/supabase";
import { isResendConfigured, isSupabaseConfigured } from "@/lib/server/env";

export async function handleLeadRegistrationPost(
  request: Request
): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Lead API is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = parseLeadApiRequestBody(await request.json());
    const { record, pdfAttachment, sendPdfEmailOnly } = body;

    if (!sendPdfEmailOnly) {
      await insertLeadRecord(record);
    } else if (!pdfAttachment) {
      throw new Error("pdfAttachment is required for sendPdfEmailOnly");
    }

    let deliveryMode: LeadDeliveryMode = "local_download";

    if (
      record.leadSource === "pdf_export" &&
      pdfAttachment &&
      isResendConfigured()
    ) {
      await sendDiagnosisPdfEmail(record, pdfAttachment);
      deliveryMode = "email";
    }

    return NextResponse.json({ ok: true, deliveryMode });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register lead";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
