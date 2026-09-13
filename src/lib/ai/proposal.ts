import type { SalesLeadRow } from "@/lib/ai/respond";
import type { MeetingSummary } from "@/lib/ai/meeting";
import type { SalesBrief } from "@/lib/ai/sales-brief";

export type ProposalDraftStatus = "draft" | "reviewed" | "approved" | "rejected";

export interface ProposalDraft {
  leadId: string;
  meetingId: string;
  title: string;
  problem: string;
  proposedSolution: string;
  benefits: string[];
  implementationPlan: string[];
  assumptions: string[];
  risks: string[];
  nextSteps: string[];
  status: ProposalDraftStatus;
}

function hasPriceConcern(summary: MeetingSummary): boolean {
  return summary.objections.some((item) => /価格|too_expensive|高い/.test(item));
}

export function buildProposalDraft(input: {
  lead: SalesLeadRow;
  meetingId: string;
  brief: SalesBrief | null;
  summary: MeetingSummary;
}): ProposalDraft {
  const category = input.lead.category_name ?? "対象職種（要確認）";
  const priceConcern = hasPriceConcern(input.summary);
  const needs = input.summary.customerNeeds.join("、") || "要確認";

  const benefits = [
    typeof input.lead.user_rate === "number" &&
    typeof input.lead.market_rate === "number"
      ? `診断上、現在単価と市場目安の差は把握済み（差額を確約するものではない）`
      : "導入効果の定量値は要確認",
    "商談で確認できた課題を提案範囲に落とす（未確認事項は断定しない）",
  ];

  const assumptions = [
    "提案範囲・対象人数・期間は要確認",
    "見積金額は本ドラフトでは未確定",
    input.brief?.decisionMaker
      ? "決裁者は会話上本人と整理（最終確認は要確認）"
      : "決裁者は要確認",
  ];

  const risks = [
    priceConcern
      ? "価格懸念が残っている。値引き前提にせず、効果と回収の軸で整理する"
      : "主要な懸念の優先度は要確認",
    "商談メモにない条件を既決として扱わない",
  ];

  return {
    leadId: input.lead.id,
    meetingId: input.meetingId,
    title: `${category}向け 単価改善支援（draft）`,
    problem: `顧客課題: ${needs}。${
      priceConcern ? "価格への懸念あり。" : ""
    }会話にない詳細は要確認。`.trim(),
    proposedSolution:
      "診断結果と商談内容を踏まえ、単価改善の進め方を整理する。具体的な施策・成果数値は要確認。",
    benefits,
    implementationPlan: [
      "未確定事項（範囲・金額・開始日）を確認する",
      "提案内容を社内レビューする",
      "顧客提示は承認後に限る",
    ],
    assumptions,
    risks,
    nextSteps: [input.summary.nextAction, "draftのまま顧客へは送付しない"],
    status: "draft",
  };
}
