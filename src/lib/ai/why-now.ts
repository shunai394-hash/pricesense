import {
  aiModelName,
  completeChatJson,
  isAiConfigured,
} from "@/lib/ai/chat";
import type { Offering } from "@/lib/nbos/types";

export interface WhyNowDraft {
  businessChange: string;
  potentialNeed: string;
  whyNow: string;
  recommendedAction: string;
  recommendedContact: string;
  confidence: number;
  usedAi: boolean;
  model: string | null;
}

export async function generateWhyNow(input: {
  offering: Offering;
  companyName: string;
  factText: string;
  sourceUrl: string | null;
  sourceName: string | null;
  hypothesis: string | null;
  unknown: string | null;
  signalType: string | null;
  targetDepartment: string | null;
  targetRole: string | null;
}): Promise<WhyNowDraft> {
  const fallback: WhyNowDraft = {
    businessChange: input.hypothesis
      ? "公開事実から読み取れる変化の含意は仮説として扱う"
      : "確認済み事実以外の事業変化は未確定",
    potentialNeed: input.offering.problem_solved
      ? `Offeringが解く課題「${input.offering.problem_solved}」と一致する可能性は未確認`
      : "Needsは未確認",
    whyNow: input.hypothesis
      ? "今接触すべきかは仮説であり、事実としては断定しない"
      : "Why Nowを裏付ける追加事実が不足している",
    recommendedAction: "事実とソースを確認し、人間がPURSUE / WATCH / INVESTIGATE を判断する",
    recommendedContact: [input.targetDepartment, input.targetRole]
      .filter(Boolean)
      .join(" / ") || "部署・役職は未特定。個人名は生成しない",
    confidence: input.hypothesis ? 0.42 : 0.2,
    usedAi: false,
    model: null,
  };

  if (!isAiConfigured()) return fallback;

  const { data, usedFallback } = await completeChatJson<WhyNowDraft>(
    {
      system: [
        "You convert a confirmed public fact into a sales Why Now brief.",
        "NEVER mix fact and hypothesis.",
        "businessChange, potentialNeed, whyNow, recommendedAction are HYPOTHESES.",
        "Do not invent people, emails, revenue, or unstated events.",
        "If the offering problem does not clearly match the fact, say so.",
        "confidence is 0-1.",
        "Return JSON only. Japanese values.",
      ].join("\n"),
      user: JSON.stringify({
        offering: {
          name: input.offering.name,
          problem_solved: input.offering.problem_solved,
          icp_problem_triggers: input.offering.icp.problem.triggers,
        },
        confirmedFact: input.factText,
        sourceUrl: input.sourceUrl,
        sourceName: input.sourceName,
        existingHypothesis: input.hypothesis,
        unknown: input.unknown,
        signalType: input.signalType,
        companyName: input.companyName,
        targetDepartment: input.targetDepartment,
        targetRole: input.targetRole,
        requiredKeys: [
          "businessChange",
          "potentialNeed",
          "whyNow",
          "recommendedAction",
          "recommendedContact",
          "confidence",
        ],
      }),
      temperature: 0.15,
      maxTokens: 700,
      timeoutMs: 20000,
    },
    fallback
  );

  const confidence =
    typeof data.confidence === "number"
      ? Math.max(0, Math.min(1, data.confidence))
      : fallback.confidence;

  return {
    ...fallback,
    ...data,
    confidence,
    usedAi: !usedFallback,
    model: usedFallback ? null : aiModelName(),
  };
}
