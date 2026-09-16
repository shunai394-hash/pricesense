import {
  aiModelName,
  completeChatJson,
  isAiConfigured,
} from "@/lib/ai/chat";
import {
  classifyJapaneseSalesText,
  isInboxClassification,
} from "@/lib/ai/jp-sales";
import type { ConversationMessage } from "@/lib/ai/respond";

export type OutreachKind = "initial" | "followup" | "refollow" | "objection";

export interface OutreachDraft {
  subject: string;
  body: string;
  nextAction: string;
  personalizationNotes: string[];
  kind: OutreachKind;
  model: string | null;
  usedAi: boolean;
}

export interface InboxAnalysis {
  sentiment: string;
  intent: string;
  objection: string | null;
  classification: string;
  replyDraft: string;
  recommendHandoff: boolean;
  nextAction: string;
  model: string | null;
  usedAi: boolean;
}

const OUTREACH_FALLBACK: Record<OutreachKind, Omit<OutreachDraft, "kind" | "model" | "usedAi">> = {
  initial: {
    subject: "ご挨拶",
    body: "突然のご連絡失礼します。確認済みの情報に基づき、一度状況を伺えますでしょうか。未確認の効果や金額はお約束できません。",
    nextAction: "下書きを人間が確認してから送る",
    personalizationNotes: ["未確認事実は使わない"],
  },
  followup: {
    subject: "フォローアップ",
    body: "先日ご連絡した件について、ご都合はいかがでしょうか。不要であればその旨お知らせください。",
    nextAction: "未返信が続く場合は停止を検討する",
    personalizationNotes: ["値引きや未提示条件は約束しない"],
  },
  refollow: {
    subject: "再フォロー",
    body: "以前ご案内した件の最終確認です。関心がなければその旨お知らせください。未確認の金額や効果はお約束できません。",
    nextAction: "再フォロー後も未返信ならシーケンスを停止する",
    personalizationNotes: ["同一Leadへの重複送信をしない", "自動送信はしない"],
  },
  objection: {
    subject: "ご懸念について",
    body: "ご指摘ありがとうございます。価格・条件は未確定のため、まず確認事項を整理させてください。",
    nextAction: "人間が条件を確認してから返信する",
    personalizationNotes: ["金額変更は人間承認が必要"],
  },
};

export async function generateOutreachDraft(input: {
  kind: OutreachKind;
  companyName: string | null;
  domain: string | null;
  industry: string | null;
  contactName: string | null;
  jobTitle: string | null;
  email: string | null;
  score: number | null;
  nextAction: string | null;
  conversation: ConversationMessage[];
  objection?: string | null;
}): Promise<OutreachDraft> {
  const fallback: OutreachDraft = {
    ...OUTREACH_FALLBACK[input.kind],
    kind: input.kind,
    subject: input.companyName
      ? `${OUTREACH_FALLBACK[input.kind].subject} / ${input.companyName}`
      : OUTREACH_FALLBACK[input.kind].subject,
    model: null,
    usedAi: false,
  };

  if (!isAiConfigured()) return fallback;

  const { data, usedFallback } = await completeChatJson<OutreachDraft>(
    {
      system: [
        "あなたはPriceSenseの日本語B2B営業ライターです。",
        "確認済み情報だけを使ってメール下書きを作ってください。",
        "架空の実績、金額、導入効果は書かないでください。",
        "送信はせず、下書きだけを返してください。",
        "JSONのみ返してください。",
      ].join("\n"),
      user: JSON.stringify({
        kind: input.kind,
        companyName: input.companyName,
        domain: input.domain,
        industry: input.industry,
        contactName: input.contactName,
        jobTitle: input.jobTitle,
        email: input.email,
        score: input.score,
        nextAction: input.nextAction,
        objection: input.objection ?? null,
        conversationPreview: input.conversation.slice(-8),
      }),
      temperature: 0.3,
      maxTokens: 700,
      timeoutMs: 20000,
    },
    fallback
  );

  return {
    ...fallback,
    ...data,
    kind: input.kind,
    personalizationNotes: Array.isArray(data.personalizationNotes)
      ? data.personalizationNotes.filter((item) => typeof item === "string")
      : fallback.personalizationNotes,
    model: aiModelName(),
    usedAi: !usedFallback,
  };
}

export async function analyzeInboxMessage(input: {
  body: string;
  subject?: string | null;
  companyName?: string | null;
  conversation?: ConversationMessage[];
}): Promise<InboxAnalysis> {
  const text = input.body.trim();
  const classified = classifyJapaneseSalesText(text);
  const fallback: InboxAnalysis = {
    sentiment: /ありがとう|興味|ぜひ|お願い|前向き/.test(text)
      ? "positive"
      : /高い|不要|結構です|検討しません|お断り|予算がありません/.test(text)
        ? "negative"
        : "neutral",
    intent: classified.category,
    objection:
      classified.category === "price_objection" ||
      classified.category === "no_budget" ||
      classified.category === "discount_request" ||
      classified.category === "competitor"
        ? classified.category
        : null,
    classification: classified.classification,
    replyDraft:
      "ご返信ありがとうございます。内容を確認し、次の進め方をご提案します。金額や契約条件は未確定です。相手の心理は断定しません。",
    recommendHandoff:
      classified.classification === "needs_human" ||
      /決裁|契約|法務|見積確定/.test(text),
    nextAction: classified.nextAction,
    model: null,
    usedAi: false,
  };

  if (!isAiConfigured()) return fallback;

  const { data, usedFallback } = await completeChatJson<InboxAnalysis>(
    {
      system: [
        "あなたはPriceSenseの受信メール解析担当です。",
        "classification は reply / interested / question / price_negotiation / competitor / hold / decline / meeting_request / needs_human のいずれかにしてください。",
        "日本企業特有の『社内で検討します』『一度持ち帰ります』『予算がありません』『他社とも比較しています』『時期を見て検討します』『担当部署に確認します』『決裁者に確認します』を分類してください。",
        "相手の心理や導入意欲は断定しないでください。",
        "契約・金額・送信は確定しないでください。",
        "JSONのみ返してください。",
      ].join("\n"),
      user: JSON.stringify({
        subject: input.subject ?? null,
        body: text.slice(0, 4000),
        companyName: input.companyName ?? null,
        conversationPreview: (input.conversation ?? []).slice(-6),
      }),
      temperature: 0.2,
      maxTokens: 700,
      timeoutMs: 20000,
    },
    fallback
  );

  return {
    ...fallback,
    ...data,
    classification: isInboxClassification(data.classification)
      ? data.classification
      : fallback.classification,
    recommendHandoff: Boolean(data.recommendHandoff),
    model: aiModelName(),
    usedAi: !usedFallback,
  };
}
