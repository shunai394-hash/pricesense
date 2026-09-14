import { Resend } from "resend";
import type { LeadRecord } from "@/lib/leads/types";
import { isResendConfigured } from "@/lib/server/env";

export interface PdfEmailAttachment {
  filename: string;
  contentBase64: string;
}

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!isResendConfigured()) {
    throw new Error("Resend is not configured");
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY!);
  }

  return resendClient;
}

export async function sendDiagnosisPdfEmail(
  record: LeadRecord,
  attachment: PdfEmailAttachment
): Promise<void> {
  const resend = getResendClient();
  const categoryLabel = record.categoryName ? ` — ${record.categoryName}` : "";

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: record.email,
    subject: `PriceSense 単価診断レポート${categoryLabel}`,
    html: `
      <div style="font-family: sans-serif; color: #1a1a1a; line-height: 1.7;">
        <p>PriceSense をご利用いただきありがとうございます。</p>
        <p>単価診断レポートをPDFでお送りします。添付ファイルをご確認ください。</p>
        ${
          record.categoryName
            ? `<p style="color:#666;font-size:14px;">職種: ${record.categoryName}</p>`
            : ""
        }
        <p style="color:#888;font-size:12px;">このメールはご依頼いただいた診断PDFのみです。営業メールの配信ではありません。</p>
        <p style="color:#888;font-size:12px;">※ 相場データは参考値です。PriceSense</p>
      </div>
    `,
    attachments: [
      {
        filename: attachment.filename,
        content: Buffer.from(attachment.contentBase64, "base64"),
      },
    ],
  });

  if (error) {
    throw new Error(error.message);
  }
}
