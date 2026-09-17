import {
  aiModelName,
  completeChatJson,
  isAiConfigured,
} from "@/lib/ai/chat";
import { generateOutreachDraft, type OutreachDraft } from "@/lib/ai/sales-outreach";
import type { Offering } from "@/lib/nbos/types";

export interface OutboundPack {
  jaEmail: OutreachDraft;
  enEmail: OutreachDraft;
  callMemo: string;
  meetingHypothesis: string;
  assumedProblems: string[];
  assumedObjections: string[];
  followupDraft: string;
  usedAi: boolean;
  model: string | null;
}

export async function generateOutboundPack(input: {
  offering: Offering;
  companyName: string;
  domain: string | null;
  industry: string | null;
  factText: string;
  sourceUrl: string | null;
  whyNow: string | null;
  targetDepartment: string | null;
  targetRole: string | null;
  contactName: string | null;
  jobTitle: string | null;
  email: string | null;
}): Promise<OutboundPack> {
  const ja = await generateOutreachDraft({
    kind: "initial",
    companyName: input.companyName,
    domain: input.domain,
    industry: input.industry,
    contactName: input.contactName,
    jobTitle: input.jobTitle ?? input.targetRole,
    email: input.email,
    score: null,
    nextAction: input.whyNow,
    conversation: [],
  });

  const fallback: OutboundPack = {
    jaEmail: ja,
    enEmail: {
      ...ja,
      kind: "initial",
      subject: input.companyName
        ? `Introduction / ${input.companyName}`
        : "Introduction",
      body: [
        "Hello,",
        `I am reaching out based only on a public fact: ${input.factText}`,
        "I am not assuming an unstated need. If this is not relevant, please ignore.",
        "This is a draft. It must not be sent without human approval.",
      ].join("\n\n"),
    },
    callMemo: [
      `確認済み事実: ${input.factText}`,
      input.sourceUrl ? `ソース: ${input.sourceUrl}` : "ソースURLなし",
      `仮説のWhy Now: ${input.whyNow || "未作成"}`,
      `接触先: ${[input.targetDepartment, input.targetRole, input.contactName].filter(Boolean).join(" / ") || "未特定。個人名は推測しない"}`,
      "未確認の導入効果・金額は話さない。",
    ].join("\n"),
    meetingHypothesis:
      "公開事実から、課題が顕在化している可能性がある（仮説）。商談では事実確認を先にする。",
    assumedProblems: input.offering.icp.problem.triggers.slice(0, 4),
    assumedObjections: [
      "今は検討していない",
      "担当部署が違う",
      "既に他社を見ている",
      "予算が決まっていない",
    ],
    followupDraft:
      "先日ご連絡した件です。公開情報に基づくご案内であり、不要であればその旨お知らせください。",
    usedAi: ja.usedAi,
    model: ja.model,
  };

  if (!isAiConfigured()) return fallback;

  const { data, usedFallback } = await completeChatJson<OutboundPack>(
    {
      system: [
        "You write a new-business outbound pack for PriceSense.",
        "Only use the confirmed fact. Hypothesis is labeled as hypothesis.",
        "Do not invent people, metrics, case studies, or prices.",
        "jaEmail and enEmail must be drafts, not sendable claims of sending.",
        "Japanese for ja fields except enEmail.",
        "JSON only.",
      ].join("\n"),
      user: JSON.stringify({
        offering: {
          name: input.offering.name,
          problem_solved: input.offering.problem_solved,
        },
        companyName: input.companyName,
        factText: input.factText,
        sourceUrl: input.sourceUrl,
        whyNowHypothesis: input.whyNow,
        targetDepartment: input.targetDepartment,
        targetRole: input.targetRole,
        contactName: input.contactName,
        requiredKeys: [
          "jaEmail",
          "enEmail",
          "callMemo",
          "meetingHypothesis",
          "assumedProblems",
          "assumedObjections",
          "followupDraft",
        ],
      }),
      temperature: 0.3,
      maxTokens: 1400,
      timeoutMs: 25000,
    },
    fallback
  );

  const jaEmail = {
    ...fallback.jaEmail,
    ...(isRecord(data.jaEmail) ? data.jaEmail : {}),
    kind: "initial" as const,
    personalizationNotes: asStringArray(
      isRecord(data.jaEmail) ? data.jaEmail.personalizationNotes : null,
      fallback.jaEmail.personalizationNotes
    ),
  };
  const enEmail = {
    ...fallback.enEmail,
    ...(isRecord(data.enEmail) ? data.enEmail : {}),
    kind: "initial" as const,
    personalizationNotes: asStringArray(
      isRecord(data.enEmail) ? data.enEmail.personalizationNotes : null,
      fallback.enEmail.personalizationNotes
    ),
  };

  return {
    jaEmail,
    enEmail,
    callMemo:
      typeof data.callMemo === "string" ? data.callMemo : fallback.callMemo,
    meetingHypothesis:
      typeof data.meetingHypothesis === "string"
        ? data.meetingHypothesis
        : fallback.meetingHypothesis,
    assumedProblems: asStringArray(data.assumedProblems, fallback.assumedProblems),
    assumedObjections: asStringArray(
      data.assumedObjections,
      fallback.assumedObjections
    ),
    followupDraft:
      typeof data.followupDraft === "string"
        ? data.followupDraft
        : fallback.followupDraft,
    usedAi: !usedFallback,
    model: usedFallback ? null : aiModelName(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items : fallback;
}
