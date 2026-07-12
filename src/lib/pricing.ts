export const PREMIUM_MONTHLY_PRICE = 1480;

export const PRICING_PLANS = {
  free: {
    id: "free",
    name: "Free",
    label: "無料プラン",
    price: 0,
    priceLabel: "¥0",
    period: "ずっと無料",
    description: "市場との比較と交渉の第一歩まで、登録不要で利用できます。",
  },
  premium: {
    id: "premium",
    name: "Premium",
    label: "Premiumプラン",
    price: PREMIUM_MONTHLY_PRICE,
    priceLabel: `¥${PREMIUM_MONTHLY_PRICE.toLocaleString("ja-JP")}`,
    period: "/ 月",
    description:
      "診断結果をもとに、詳細分析から交渉準備までをまとめてサポートします。",
  },
} as const;

export type ComparisonValue = boolean | "partial" | string;

export interface PricingComparisonRow {
  id: string;
  feature: string;
  free: ComparisonValue;
  premium: ComparisonValue;
}

export const PRICING_COMPARISON: PricingComparisonRow[] = [
  {
    id: "diagnosis",
    feature: "基本単価診断",
    free: true,
    premium: true,
  },
  {
    id: "market_gap",
    feature: "市場平均との差・年間機会損失",
    free: true,
    premium: true,
  },
  {
    id: "detail_report",
    feature: "詳細レポート（職種別分析）",
    free: "プレビューのみ",
    premium: true,
  },
  {
    id: "negotiation_sample",
    feature: "交渉文サンプル",
    free: "冒頭のみ",
    premium: "全文",
  },
  {
    id: "negotiation_patterns",
    feature: "交渉文パターン（3種類）",
    free: false,
    premium: true,
  },
  {
    id: "rejection_response",
    feature: "断られた場合の返答文",
    free: false,
    premium: true,
  },
  {
    id: "copy_edit",
    feature: "交渉文のコピー・編集",
    free: false,
    premium: true,
  },
  {
    id: "pdf_export",
    feature: "診断結果PDFの保存",
    free: "交渉文は冒頭のみ",
    premium: "全文込み",
  },
  {
    id: "history",
    feature: "診断・交渉履歴の保存",
    free: false,
    premium: true,
  },
];

export const PRICING_FAQ = [
  {
    id: "free_scope",
    question: "無料プランでどこまで使えますか？",
    answer:
      "職種と単価を入力するだけで、市場平均との比較・年間機会損失・交渉文サンプル（冒頭）・PDF保存（交渉文冒頭のみ）が利用できます。登録はPDF保存時のメールアドレスのみです。",
  },
  {
    id: "premium_value",
    question: "Premiumで追加される機能は何ですか？",
    answer:
      "詳細レポートの全文、交渉文の全文生成（3パターン）、断り対応文、コピー・編集、PDFへの全文反映、履歴保存が利用できます。診断結果をそのまま交渉準備に活かせます。",
  },
  {
    id: "cancel",
    question: "Premiumはいつでも解約できますか？",
    answer:
      "はい。Stripeの顧客ポータルからいつでも解約できます。解約後も当該請求期間の終了まではPremium機能をご利用いただけます。",
  },
  {
    id: "payment",
    question: "支払い方法は何がありますか？",
    answer:
      "クレジットカード決済（Stripe）に対応しています。お支払いは月額1,480円（税込）のサブスクリプションです。",
  },
  {
    id: "data",
    question: "診断データはサーバーに保存されますか？",
    answer:
      "診断入力自体はブラウザ内で処理されます。PDF保存時のメール登録、Premium購入、ウェイトリスト登録時に、診断コンテキストとともに保存される場合があります。",
  },
  {
    id: "categories",
    question: "複数の職種で使えますか？",
    answer:
      "はい。121職種以上のカテゴリに対応しています。職種を切り替えて何度でも診断できます。Premiumでは職種ごとの詳細レポートと交渉文を生成できます。",
  },
] as const;
