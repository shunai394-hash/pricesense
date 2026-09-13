import type { SalesLeadRow } from "@/lib/ai/respond";
import type { MeetingSummary } from "@/lib/ai/meeting";

export type QuoteDraftStatus = "draft" | "reviewed" | "approved" | "rejected";

export interface QuoteItem {
  name: string;
  quantity: number;
  unitPrice: number | null;
  amount: number | null;
}

export interface QuoteDraft {
  leadId: string;
  meetingId: string;
  items: QuoteItem[];
  subtotal: number | null;
  discount: number | null;
  total: number | null;
  currency: string | null;
  assumptions: string[];
  validUntil: string | null;
  status: QuoteDraftStatus;
}

function parseStatedQuoteAmount(notes: string): { amount: number; currency: string } | null {
  const match = notes.match(
    /(?:見積|合意|契約)[^\d]{0,12}(\d{1,3}(?:,\d{3})+|\d{4,})円/
  );
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, currency: "JPY" };
}

export function buildQuoteDraft(input: {
  lead: SalesLeadRow;
  meetingId: string;
  summary: MeetingSummary;
  rawNotes: string;
}): QuoteDraft {
  const stated = parseStatedQuoteAmount(input.rawNotes);
  const assumptions = [
    "見積はdraft。顧客へ自動送付しない",
    "商談で合意していない金額は設定しない",
    typeof input.lead.user_rate === "number"
      ? `診断上の現在単価 ${input.lead.user_rate.toLocaleString("ja-JP")} は参考値であり見積金額ではない`
      : "診断単価の記載なし",
    typeof input.lead.market_rate === "number"
      ? `診断上の市場目安 ${input.lead.market_rate.toLocaleString("ja-JP")} は参考値であり見積金額ではない`
      : "市場目安の記載なし",
  ];

  if (!stated) {
    return {
      leadId: input.lead.id,
      meetingId: input.meetingId,
      items: [
        {
          name: "提案スコープ（要確認）",
          quantity: 1,
          unitPrice: null,
          amount: null,
        },
      ],
      subtotal: null,
      discount: null,
      total: null,
      currency: null,
      assumptions,
      validUntil: null,
      status: "draft",
    };
  }

  return {
    leadId: input.lead.id,
    meetingId: input.meetingId,
    items: [
      {
        name: "商談メモ上の見積/合意金額（要確認）",
        quantity: 1,
        unitPrice: stated.amount,
        amount: stated.amount,
      },
    ],
    subtotal: stated.amount,
    discount: null,
    total: stated.amount,
    currency: stated.currency,
    assumptions,
    validUntil: null,
    status: "draft",
  };
}
