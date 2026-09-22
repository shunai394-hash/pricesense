import { NextResponse } from "next/server";
import type { LeadDeliveryMode } from "@/lib/leads/types";
import { parseLeadApiRequestBody } from "@/lib/server/leads";
import { sendDiagnosisPdfEmail } from "@/lib/server/resend";
import { insertLeadRecord } from "@/lib/server/supabase";
import {
  getSupabaseConfigError,
  isResendConfigured,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { publicErrorMessage } from "@/lib/server/public-error";
import {
  createEmailProofCookieValue,
  EMAIL_PROOF_COOKIE_NAME,
  EMAIL_PROOF_MAX_AGE_SECONDS,
} from "@/lib/server/email-proof";

function withEmailProofCookie(
  response: NextResponse,
  email: string
): NextResponse {
  // The visitor just submitted this email themselves via the diagnosis
  // form, so this browser can be trusted to check that email's premium
  // status later without requiring Supabase Auth login.
  const proof = createEmailProofCookieValue(email);
  if (proof) {
    response.cookies.set(EMAIL_PROOF_COOKIE_NAME, proof, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: EMAIL_PROOF_MAX_AGE_SECONDS,
    });
  }
  return response;
}

export async function handleLeadRegistrationPost(
  request: Request
): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    const configError = getSupabaseConfigError() ?? "Lead API is not configured";
    console.error("[save-report] Supabase config invalid:", configError);

    return NextResponse.json(
      {
        error:
          "Leadの保存は現在利用できません。診断結果のPDFは端末に保存できます。",
      },
      { status: 503 }
    );
  }

  let body: ReturnType<typeof parseLeadApiRequestBody>;

  try {
    body = parseLeadApiRequestBody(await request.json());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body";

    console.error("[save-report] Request validation failed:", message, error);

    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { record, pdfAttachment, sendPdfEmailOnly } = body;

  try {
    let deliveryMode: LeadDeliveryMode = "local_download";

    if (sendPdfEmailOnly) {
      if (
        record.leadSource === "pdf_export" &&
        pdfAttachment &&
        isResendConfigured()
      ) {
        try {
          await sendDiagnosisPdfEmail(record, pdfAttachment);
          deliveryMode = "email";
        } catch (emailError) {
          const emailMessage =
            emailError instanceof Error
              ? emailError.message
              : "Failed to send PDF email";
          console.error(
            "[save-report] sendPdfEmailOnly failed:",
            emailMessage,
            emailError
          );
        }
      }

      return withEmailProofCookie(
        NextResponse.json({ ok: true, deliveryMode }),
        record.email
      );
    }

    await insertLeadRecord(record);

    if (
      record.leadSource === "pdf_export" &&
      pdfAttachment &&
      isResendConfigured()
    ) {
      try {
        await sendDiagnosisPdfEmail(record, pdfAttachment);
        deliveryMode = "email";
      } catch (emailError) {
        const emailMessage =
          emailError instanceof Error
            ? emailError.message
            : "Failed to send PDF email";
        console.error(
          "[save-report] PDF email failed after lead save:",
          emailMessage,
          emailError
        );
      }
    }

    return withEmailProofCookie(
      NextResponse.json({ ok: true, deliveryMode }),
      record.email
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register lead";

    console.error("[save-report] POST failed:", message, error);

    return NextResponse.json(
      {
        error: publicErrorMessage(
          error,
          "Leadの保存に失敗しました。時間をおいて再試行してください。"
        ),
      },
      { status: 500 }
    );
  }
}
