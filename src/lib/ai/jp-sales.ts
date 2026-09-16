export const INBOX_CLASSIFICATIONS = [
  "reply",
  "interested",
  "question",
  "price_negotiation",
  "competitor",
  "hold",
  "decline",
  "meeting_request",
  "needs_human",
] as const;

export type InboxClassification = (typeof INBOX_CLASSIFICATIONS)[number];

export const NEGOTIATION_CATEGORIES = [
  "price_objection",
  "no_budget",
  "competitor",
  "discount_request",
  "quantity",
  "delivery",
  "payment_terms",
  "contract_terms",
  "timing",
  "internal_approval",
  "decision_maker",
  "hold",
  "unclear",
] as const;

export type NegotiationCategory = (typeof NEGOTIATION_CATEGORIES)[number];

export interface JapanesePhraseMatch {
  phrase: string;
  category: NegotiationCategory;
  inboxClassification: InboxClassification;
  suggestedNextAction: string;
}

const JP_PHRASES: JapanesePhraseMatch[] = [
  {
    phrase: "社内で検討します",
    category: "internal_approval",
    inboxClassification: "hold",
    suggestedNextAction: "検討に必要な資料と次回確認日を確認する",
  },
  {
    phrase: "一度持ち帰ります",
    category: "hold",
    inboxClassification: "hold",
    suggestedNextAction: "持ち帰り事項と社内共有先を確認する",
  },
  {
    phrase: "予算がありません",
    category: "no_budget",
    inboxClassification: "price_negotiation",
    suggestedNextAction: "予算化の時期と決裁プロセスを確認する（断定しない）",
  },
  {
    phrase: "他社とも比較しています",
    category: "competitor",
    inboxClassification: "competitor",
    suggestedNextAction: "比較軸と重視条件を確認する。未確認の競合名は作らない",
  },
  {
    phrase: "時期を見て検討します",
    category: "timing",
    inboxClassification: "hold",
    suggestedNextAction: "検討時期の目安だけ確認し、無理な前倒しはしない",
  },
  {
    phrase: "担当部署に確認します",
    category: "internal_approval",
    inboxClassification: "question",
    suggestedNextAction: "確認先部署と次回連絡日を確認する",
  },
  {
    phrase: "決裁者に確認します",
    category: "decision_maker",
    inboxClassification: "needs_human",
    suggestedNextAction: "決裁者への確認事項と日程を整理する。心理は断定しない",
  },
  {
    phrase: "稟議に回します",
    category: "internal_approval",
    inboxClassification: "needs_human",
    suggestedNextAction: "稟議に必要な資料と決裁予定を確認する。心理は断定しない",
  },
  {
    phrase: "数量を調整したい",
    category: "quantity",
    inboxClassification: "question",
    suggestedNextAction: "必要数量と条件だけ確認する",
  },
  {
    phrase: "納期が合いません",
    category: "delivery",
    inboxClassification: "question",
    suggestedNextAction: "希望納期を確認する。未確認の約束はしない",
  },
  {
    phrase: "支払条件を確認します",
    category: "payment_terms",
    inboxClassification: "question",
    suggestedNextAction: "支払条件の確認事項を整理する",
  },
  {
    phrase: "契約条件を確認します",
    category: "contract_terms",
    inboxClassification: "needs_human",
    suggestedNextAction: "契約条件は人間が確認する",
  },
];

const EXTRA_RULES: Array<{
  keywords: string[];
  category: NegotiationCategory;
  inboxClassification: InboxClassification;
}> = [
  {
    keywords: ["値引き", "割引", "ディスカウント", "安く"],
    category: "discount_request",
    inboxClassification: "price_negotiation",
  },
  {
    keywords: ["高い", "価格", "費用", "コスト"],
    category: "price_objection",
    inboxClassification: "price_negotiation",
  },
  {
    keywords: ["納期", "導入時期", "いつから"],
    category: "delivery",
    inboxClassification: "question",
  },
  {
    keywords: ["支払", "支払い条件", "サイト", "請求"],
    category: "payment_terms",
    inboxClassification: "question",
  },
  {
    keywords: ["契約", "条項", "NDA", "利用規約"],
    category: "contract_terms",
    inboxClassification: "needs_human",
  },
  {
    keywords: ["数量", "ライセンス数", "席数", "人数"],
    category: "quantity",
    inboxClassification: "question",
  },
  {
    keywords: ["稟議", "決裁", "承認"],
    category: "internal_approval",
    inboxClassification: "needs_human",
  },
  {
    keywords: ["興味", "ぜひ", "前向き", "検討したい"],
    category: "hold",
    inboxClassification: "interested",
  },
  {
    keywords: ["不要", "結構です", "検討しません", "お断り"],
    category: "hold",
    inboxClassification: "decline",
  },
  {
    keywords: ["アポ", "商談", "打ち合わせ", "面談"],
    category: "timing",
    inboxClassification: "meeting_request",
  },
];

export function matchJapaneseSalesPhrases(text: string): JapanesePhraseMatch[] {
  const normalized = text.replace(/\s+/g, "");
  return JP_PHRASES.filter((item) =>
    normalized.includes(item.phrase.replace(/\s+/g, ""))
  );
}

export function classifyJapaneseSalesText(text: string): {
  category: NegotiationCategory;
  classification: InboxClassification;
  matchedPhrases: JapanesePhraseMatch[];
  nextAction: string;
} {
  const matchedPhrases = matchJapaneseSalesPhrases(text);
  if (matchedPhrases[0]) {
    return {
      category: matchedPhrases[0].category,
      classification: matchedPhrases[0].inboxClassification,
      matchedPhrases,
      nextAction: matchedPhrases[0].suggestedNextAction,
    };
  }

  for (const rule of EXTRA_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return {
        category: rule.category,
        classification: rule.inboxClassification,
        matchedPhrases: [],
        nextAction: "確認済み事実だけを使い、未確認事項を質問で埋める",
      };
    }
  }

  return {
    category: "unclear",
    classification: "reply",
    matchedPhrases: [],
    nextAction: "相手の意図を確認する質問を返す。心理は断定しない",
  };
}

export function isInboxClassification(
  value: unknown
): value is InboxClassification {
  return (
    typeof value === "string" &&
    (INBOX_CLASSIFICATIONS as readonly string[]).includes(value)
  );
}

export function isNegotiationCategory(
  value: unknown
): value is NegotiationCategory {
  return (
    typeof value === "string" &&
    (NEGOTIATION_CATEGORIES as readonly string[]).includes(value)
  );
}
