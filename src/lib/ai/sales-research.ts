import {
  aiModelName,
  completeChatJson,
  isAiConfigured,
} from "@/lib/ai/chat";
import type { CompanyResearchContext } from "@/lib/server/sales-os";

export interface CompanyResearchDraft {
  researchType: "company";
  summary: string;
  companyFacts: string[];
  contactFacts: string[];
  salesHypothesis: string;
  painHypothesis: string;
  approachReason: string;
  references: string[];
  unknowns: string[];
  nextAction: string;
  score: number | null;
  model: string | null;
  usedAi: boolean;
}

function knownFacts(context: CompanyResearchContext): CompanyResearchDraft {
  const companyFacts = [
    `企業名: ${context.company.name}`,
    context.company.domain ? `ドメイン: ${context.company.domain}` : null,
    context.company.industry ? `業種: ${context.company.industry}` : null,
    context.company.location ? `所在地: ${context.company.location}` : null,
    typeof context.company.employee_count === "number"
      ? `従業員数: ${context.company.employee_count}`
      : null,
    context.company.website_url ? `Web: ${context.company.website_url}` : null,
    context.company.description ? `説明: ${context.company.description}` : null,
  ].filter((item): item is string => Boolean(item));

  const contactFacts = context.contacts.map((contact) =>
    [
      contact.full_name || "氏名未特定",
      contact.job_title,
      contact.department,
      contact.email,
    ]
      .filter(Boolean)
      .join(" / ")
  );

  const unknowns = [
    context.company.industry ? null : "業種は未確認",
    typeof context.company.employee_count === "number" ? null : "従業員数は未確認",
    context.company.location ? null : "所在地は未確認",
    context.contacts.some((item) => item.job_title) ? null : "担当者の役職は未確認",
    context.leads.length > 0 ? null : "関連Leadはまだありません",
  ].filter((item): item is string => Boolean(item));

  const nextAction =
    context.leads[0]?.next_action ||
    context.prospects[0]?.next_action ||
    (contactFacts.length > 0
      ? "確認済みの担当者情報を基に初回メール案を作成する"
      : "担当者情報を追加してからアプローチする");

  const summary = [
    `${context.company.name}の確認済み情報のみを整理しました。`,
    unknowns.length > 0 ? `未確認: ${unknowns.join("、")}。` : "",
    "未確認事項は仮説として扱い、事実としては使いません。",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    researchType: "company",
    summary,
    companyFacts,
    contactFacts,
    salesHypothesis:
      context.leads[0]?.category_name
        ? `診断カテゴリ「${context.leads[0].category_name}」に関心がある可能性がある（未確認）`
        : "営業仮説を立てるための確認済み事実が不足しています",
    painHypothesis: "課題仮説は確認済み会話がないため未定です",
    approachReason: context.company.domain
      ? `確認済みドメイン ${context.company.domain} に基づく接点がある`
      : "確認済みの企業識別子に基づいて接点を作る",
    references: [
      ...companyFacts,
      ...context.leads.map((lead) => `Lead ${lead.id}`),
    ],
    unknowns,
    nextAction,
    score: context.prospects[0]?.score ?? context.leads[0]?.score ?? null,
    model: null,
    usedAi: false,
  };
}

export async function generateCompanyResearch(
  context: CompanyResearchContext
): Promise<CompanyResearchDraft> {
  const fallback = knownFacts(context);
  if (!isAiConfigured()) return fallback;

  const { data, usedFallback } = await completeChatJson<CompanyResearchDraft>(
    {
      system: [
        "あなたはPriceSenseのB2B営業リサーチャーです。",
        "確認済みの事実だけを使ってください。",
        "存在しない企業情報、担当者、売上、従業員数、ニュースは作らないでください。",
        "分からないことは unknowns に入れてください。",
        "日本語のJSONだけを返してください。",
      ].join("\n"),
      user: JSON.stringify({
        company: context.company,
        contacts: context.contacts,
        prospects: context.prospects,
        leads: context.leads.map((lead) => ({
          id: lead.id,
          email: lead.email,
          category_name: lead.category_name,
          score: lead.score,
          next_action: lead.next_action,
          conversationPreview: lead.conversation.slice(-6),
        })),
        requiredKeys: [
          "summary",
          "companyFacts",
          "contactFacts",
          "salesHypothesis",
          "painHypothesis",
          "approachReason",
          "references",
          "unknowns",
          "nextAction",
          "score",
        ],
      }),
      temperature: 0.1,
      maxTokens: 900,
      timeoutMs: 25000,
    },
    fallback
  );

  return {
    ...fallback,
    ...data,
    researchType: "company",
    companyFacts: Array.isArray(data.companyFacts)
      ? data.companyFacts.filter((item) => typeof item === "string")
      : fallback.companyFacts,
    contactFacts: Array.isArray(data.contactFacts)
      ? data.contactFacts.filter((item) => typeof item === "string")
      : fallback.contactFacts,
    references: Array.isArray(data.references)
      ? data.references.filter((item) => typeof item === "string")
      : fallback.references,
    unknowns: Array.isArray(data.unknowns)
      ? data.unknowns.filter((item) => typeof item === "string")
      : fallback.unknowns,
    score:
      typeof data.score === "number" ? data.score : fallback.score,
    model: aiModelName(),
    usedAi: !usedFallback,
  };
}
