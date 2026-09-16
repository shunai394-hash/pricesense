import {
  aiModelName,
  completeChatJson,
  isAiConfigured,
} from "@/lib/ai/chat";
import {
  classifyJapaneseSalesText,
  isInboxClassification,
  isNegotiationCategory,
  type InboxClassification,
  type NegotiationCategory,
} from "@/lib/ai/jp-sales";

export interface NegotiationContext {
  companyName: string | null;
  contactName: string | null;
  jobTitle: string | null;
  department: string | null;
  email: string | null;
  industry: string | null;
  knownFacts: string[];
  customerMessage: string;
}

export interface NegotiationAdvice {
  category: NegotiationCategory;
  classification: InboxClassification;
  utterance: string;
  confirmedFacts: string[];
  unknowns: string[];
  recommendedQuestions: string[];
  replyDraft: string;
  nextAction: string;
  matchedPhrases: string[];
  caution: string;
  model: string | null;
  usedAi: boolean;
}

const CAUTION =
  "相手の心理や導入意欲は断定しません。確認済み事実と不明点を分けて扱います。";

export function buildNegotiationFallback(
  input: NegotiationContext
): NegotiationAdvice {
  const classified = classifyJapaneseSalesText(input.customerMessage);
  const known = input.knownFacts.filter((item) => item.trim().length > 0);

  return {
    category: classified.category,
    classification: classified.classification,
    utterance: input.customerMessage.trim(),
    confirmedFacts: known.length > 0 ? known : ["この案件で確認済みの事実はまだありません"],
    unknowns: [
      known.length === 0 ? "企業・担当者の確認済み情報が不足しています" : null,
      classified.category === "unclear" ? "相手の意図は未確認です" : null,
      "予算・決裁者・導入時期は、発言から確定できる場合のみ事実とします",
    ].filter((item): item is string => Boolean(item)),
    recommendedQuestions: [
      "社内検討の対象部署と次回確認日を伺ってもよいでしょうか",
      "比較されている点があれば、確認済みの範囲で教えていただけますか",
      "金額や契約条件は未確定のため、判断に必要な条件だけ確認できますか",
    ],
    replyDraft: [
      "ご連絡ありがとうございます。",
      classified.matchedPhrases[0]
        ? `「${classified.matchedPhrases[0].phrase}」とのこと、承知しました。`
        : "いただいた内容を確認しました。",
      "未確認の効果や金額はお約束できません。次に確認すべき点だけ整理させてください。",
    ].join(""),
    nextAction: classified.nextAction,
    matchedPhrases: classified.matchedPhrases.map((item) => item.phrase),
    caution: CAUTION,
    model: null,
    usedAi: false,
  };
}

export async function analyzeNegotiation(
  input: NegotiationContext
): Promise<NegotiationAdvice> {
  const fallback = buildNegotiationFallback(input);

  if (!isAiConfigured()) return fallback;

  const { data, usedFallback } = await completeChatJson<NegotiationAdvice>(
    {
      system: [
        "あなたはPriceSenseの日本語B2B交渉支援です。",
        "相手の発言、確認済み事実、不明点、推奨確認事項、返信案、次アクションを分けてください。",
        "架空の会社情報、担当者、価格、競合名、導入効果は作らないでください。",
        "相手の心理や購買意欲を断定しないでください。",
        "金額・契約条件・送信は確定しないでください。",
        "JSONのみ返してください。",
      ].join("\n"),
      user: JSON.stringify({
        customerMessage: input.customerMessage.slice(0, 4000),
        companyName: input.companyName,
        contactName: input.contactName,
        jobTitle: input.jobTitle,
        department: input.department,
        email: input.email,
        industry: input.industry,
        knownFacts: input.knownFacts,
        fallback,
      }),
      temperature: 0.2,
      maxTokens: 900,
      timeoutMs: 20000,
    },
    fallback
  );

  return {
    ...fallback,
    ...data,
    category: isNegotiationCategory(data.category) ? data.category : fallback.category,
    classification: isInboxClassification(data.classification)
      ? data.classification
      : fallback.classification,
    utterance: input.customerMessage.trim(),
    confirmedFacts: Array.isArray(data.confirmedFacts)
      ? data.confirmedFacts.filter((item) => typeof item === "string")
      : fallback.confirmedFacts,
    unknowns: Array.isArray(data.unknowns)
      ? data.unknowns.filter((item) => typeof item === "string")
      : fallback.unknowns,
    recommendedQuestions: Array.isArray(data.recommendedQuestions)
      ? data.recommendedQuestions.filter((item) => typeof item === "string")
      : fallback.recommendedQuestions,
    matchedPhrases: fallback.matchedPhrases,
    caution: CAUTION,
    model: aiModelName(),
    usedAi: !usedFallback,
  };
}
