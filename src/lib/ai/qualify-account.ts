import {
  aiModelName,
  completeChatJson,
  isAiConfigured,
} from "@/lib/ai/chat";
import type { Offering, PursueDecision } from "@/lib/nbos/types";

export async function explainQualification(input: {
  offering: Offering;
  companyName: string;
  factText: string;
  hypothesis: string | null;
  scores: {
    icpFit: number;
    intent: number;
    timing: number;
    recentChange: number;
    needHypothesis: number;
    evidenceQuality: number;
    contactability: number;
  };
  decision: PursueDecision;
  whyThisCompany: string;
}): Promise<{ whyThisCompany: string; usedAi: boolean; model: string | null }> {
  const fallback = {
    whyThisCompany: input.whyThisCompany,
    usedAi: false,
    model: null,
  };
  if (!isAiConfigured()) return fallback;

  const { data, usedFallback } = await completeChatJson<{ whyThisCompany: string }>(
    {
      system: [
        "Explain why this company is or is not a new-business target.",
        "Do not treat hypothesis as fact.",
        "Do not invent unstated events.",
        "Japanese. JSON only.",
      ].join("\n"),
      user: JSON.stringify({
        offering: input.offering.name,
        problem: input.offering.problem_solved,
        companyName: input.companyName,
        confirmedFact: input.factText,
        hypothesis: input.hypothesis,
        scores: input.scores,
        decision: input.decision,
        draft: input.whyThisCompany,
      }),
      temperature: 0.2,
      maxTokens: 400,
      timeoutMs: 15000,
    },
    { whyThisCompany: input.whyThisCompany }
  );

  return {
    whyThisCompany:
      typeof data.whyThisCompany === "string" && data.whyThisCompany.trim()
        ? data.whyThisCompany.trim()
        : input.whyThisCompany,
    usedAi: !usedFallback,
    model: usedFallback ? null : aiModelName(),
  };
}
