import { PREMIUM_MONTHLY_PRICE } from "@/lib/pricing";

/** Features actually available after Premium purchase today. */
export const PREMIUM_AVAILABLE_FEATURES = [
  "単価交渉文の全文（3パターン）",
  "断られた場合の返答文",
  "案件応募文",
  "職務経歴書の改善ポイント",
  "単価面談の話法",
  "文面のコピー・編集",
  "診断PDFへの全文反映",
] as const;

/** Roadmap value of Premium — do not present as currently usable. */
export const PREMIUM_UPCOMING_FEATURES = [
  "市場単価の定期チェック",
  "高単価案件の発見",
  "定期的な単価再診断",
  "希望単価との差額管理",
  "交渉文書の保存",
] as const;

export const PREMIUM_POSITIONING =
  "一度だけではなく、継続して単価・収入を改善したい人へ";

export const PREMIUM_PRICE_LABEL = `¥${PREMIUM_MONTHLY_PRICE.toLocaleString("ja-JP")}`;
