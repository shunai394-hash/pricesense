import { NextResponse } from "next/server";
import type { LeadDeliveryMode } from "@/lib/leads/types";
import { parseLeadApiRequestBody } from "@/lib/server/leads";
import { sendDiagnosisPdfEmail } from "@/lib/server/resend";
import { insertLeadRecord } from "@/lib/server/supabase";
import {
  isResendConfigured,
  isSupabaseConfigured,
} from "@/lib/server/env";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Lead API is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = parseLeadApiRequestBody(await request.json());
    const { record, pdfAttachment } = body;

    await insertLeadRecord(record);

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
