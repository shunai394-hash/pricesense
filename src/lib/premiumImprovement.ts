import type { JobCategory, JobGroupId } from "@/data/types";

export interface PremiumImprovementInput {
  category: JobCategory;
}

export interface PremiumImprovementItem {
  id: "improvement_theme" | "rate_factors" | "negotiation_point";
  label: string;
  preview: string;
  detail: string;
}

export interface PremiumJobImprovementAnalysis {
  items: PremiumImprovementItem[];
  previewText: string;
  blurredText: string;
}

interface GroupImprovementTheme {
  oneLiner: string;
  bullets: string[];
  rateFactorDetail: string;
  negotiationPreview: string;
  negotiationDetail: string;
}

const GROUP_IMPROVEMENT_THEMES: Record<JobGroupId, GroupImprovementTheme> = {
  it: {
    oneLiner: "実装だけでなく設計・保守範囲を明確化",
    bullets: [
      "実装工数だけでなく、設計・レビュー・保守の範囲を整理する",
      "技術選定や品質担保など、上流工程の関与を参考値として示す",
      "障害対応・運用改善など継続支援の位置づけを明確にする",
    ],
    rateFactorDetail:
      "アーキテクチャ設計、コードレビュー、運用監視など専門性の高い工程を単価の根拠にできます（参考値）。",
    negotiationPreview: "作業量ではなく提供価値を中心に説明する",
    negotiationDetail:
      "実装行数や工数より、設計判断・品質・保守性など提供価値を中心に説明すると整理しやすいです（参考値）。",
  },
  design: {
    oneLiner: "制作範囲だけでなく改善提案まで含める",
    bullets: [
      "画面制作だけでなく、UI改善提案・情報設計まで含める",
      "デザインシステムやガイドライン整備など再利用率の高い成果を示す",
      "クライアントの課題整理から関与する範囲を参考値として明示する",
    ],
    rateFactorDetail:
      "UX改善提案、デザインシステム、ブランド一貫性など付加価値の高い対応を根拠にできます（参考値）。",
    negotiationPreview: "作業量ではなく提供価値を中心に説明する",
    negotiationDetail:
      "制作枚数や修正回数より、改善提案・成果物の再利用性を中心に説明すると参考になります（参考値）。",
  },
  marketing: {
    oneLiner: "運用タスク数ではなく成果指標を提示",
    bullets: [
      "広告設定や投稿数だけでなく、KPI・ROASなど成果指標を整理する",
      "施策設計から分析・改善提案までの対応範囲を明確化する",
      "継続支援としてのPDCAサイクルを参考値として示す",
    ],
    rateFactorDetail:
      "CPA改善、CV率向上、LTV改善など数値成果と専門性を組み合わせて説明できます（参考値）。",
    negotiationPreview: "作業量ではなく提供価値を中心に説明する",
    negotiationDetail:
      "運用工数より、成果指標の改善と施策提案の価値を中心に説明すると整理しやすいです（参考値）。",
  },
  writing: {
    oneLiner: "記事数ではなく成果指標を提示",
    bullets: [
      "納品本数だけでなく、SEO効果・CV貢献など成果指標を整理する",
      "リサーチ・構成・編集まで含めた提供範囲を明確化する",
      "継続更新やコンテンツ改善提案を参考値として示す",
    ],
    rateFactorDetail:
      "専門分野の知見、SEO設計、コンバージョンに寄与するライティングを根拠にできます（参考値）。",
    negotiationPreview: "作業量ではなく提供価値を中心に説明する",
    negotiationDetail:
      "文字数や本数より、読者成果・検索成果・CV貢献など提供価値を中心に説明すると参考になります（参考値）。",
  },
  video: {
    oneLiner: "本数ではなく企画・制作品質を含めて整理",
    bullets: [
      "納品本数だけでなく、企画・編集・改善提案まで含める",
      "ブランドに合ったトーン設計など専門性を参考値として示す",
      "継続制作や運用改善の支援範囲を明確化する",
    ],
    rateFactorDetail:
      "企画力、編集クオリティ、SNS最適化など付加価値の高い工程を根拠にできます（参考値）。",
    negotiationPreview: "作業量ではなく提供価値を中心に説明する",
    negotiationDetail:
      "本数や尺より、企画意図・視聴成果・ブランド品質を中心に説明すると整理しやすいです（参考値）。",
  },
  ai: {
    oneLiner: "ツール操作ではなく業務適用・成果設計を明確化",
    bullets: [
      "プロンプト作成だけでなく、業務フローへの適用設計まで含める",
      "精度改善・運用設計など継続支援の範囲を参考値として示す",
      "導入効果の測定方法をあわせて整理する",
    ],
    rateFactorDetail:
      "業務設計、プロンプトエンジニアリング、評価・改善サイクルなど専門性を根拠にできます（参考値）。",
    negotiationPreview: "作業量ではなく提供価値を中心に説明する",
    negotiationDetail:
      "操作時間より、業務効率化・品質向上など導入成果を中心に説明すると参考になります（参考値）。",
  },
  consulting: {
    oneLiner: "稼働時間ではなく提案・成果の価値を提示",
    bullets: [
      "調査・分析だけでなく、実行支援・フォローまで含める",
      "課題整理から提案、意思決定支援までの範囲を明確化する",
      "継続的な改善支援を参考値として示す",
    ],
    rateFactorDetail:
      "業界知見、フレームワーク適用、実行支援など専門性と成果実績を根拠にできます（参考値）。",
    negotiationPreview: "作業量ではなく提供価値を中心に説明する",
    negotiationDetail:
      "稼働時間より、提案の質・意思決定支援・成果創出を中心に説明すると整理しやすいです（参考値）。",
  },
  professional: {
    oneLiner: "作業範囲ではなく専門判断・助言の価値を明確化",
    bullets: [
      "定型作業だけでなく、専門的判断・助言の範囲を整理する",
      "コンプライアンスやリスク整理など付加価値を参考値として示す",
      "継続顧問・定期レビューなど継続支援を明確化する",
    ],
    rateFactorDetail:
      "資格・専門知識、助言の質、リスク回避など専門性を根拠にできます（参考値）。",
    negotiationPreview: "作業量ではなく提供価値を中心に説明する",
    negotiationDetail:
      "処理件数より、専門判断・助言・リスク管理の価値を中心に説明すると参考になります（参考値）。",
  },
  admin: {
    oneLiner: "作業量ではなく業務改善・効率化の成果を提示",
    bullets: [
      "入力作業だけでなく、業務フロー改善提案まで含める",
      "ツール活用・自動化など効率化の成果を参考値として示す",
      "継続支援としての定例報告・改善サイクルを明確化する",
    ],
    rateFactorDetail:
      "業務知識、効率化提案、ミス削減など成果実績を根拠にできます（参考値）。",
    negotiationPreview: "作業量ではなく提供価値を中心に説明する",
    negotiationDetail:
      "処理件数より、業務改善・効率化・安定稼働の価値を中心に説明すると整理しやすいです（参考値）。",
  },
  sales: {
    oneLiner: "活動量ではなく成果・再現性を中心に整理",
    bullets: [
      "架電数・訪問数だけでなく、受注・継続率など成果指標を整理する",
      "提案設計・クロージング支援など専門性を参考値として示す",
      "継続支援としてのパイプライン改善を明確化する",
    ],
    rateFactorDetail:
      "成約率、パイプライン改善、顧客継続など成果実績を根拠にできます（参考値）。",
    negotiationPreview: "作業量ではなく提供価値を中心に説明する",
    negotiationDetail:
      "活動量より、受注成果・再現性・顧客価値創出を中心に説明すると参考になります（参考値）。",
  },
};

const CATEGORY_THEME_OVERRIDES: Partial<Record<string, string>> = {
  web_designer: "制作範囲だけでなく改善提案まで含める",
  web_engineer: "実装だけでなく設計・保守範囲を明確化",
  frontend_engineer: "UI実装だけでなく設計・性能改善まで含める",
  backend_engineer: "実装だけでなくAPI設計・保守範囲を明確化",
  copywriter: "記事数ではなく成果指標を提示",
  seo_writer: "記事数ではなくSEO成果指標を提示",
  ui_designer: "画面制作だけでなくUI改善提案まで含める",
  ux_designer: "リサーチ成果と改善提案まで含めて整理",
};

function getCategoryOneLiner(category: JobCategory, groupTheme: GroupImprovementTheme): string {
  return CATEGORY_THEME_OVERRIDES[category.id] ?? groupTheme.oneLiner;
}

function buildCategoryContext(category: JobCategory): string {
  return `${category.label}（${category.description}）では、${category.skillExamples}が参考市場データ上の主要スキル例です（参考値）。${category.marketTrend}（参考値）。`;
}

function buildImprovementThemeItem(
  category: JobCategory,
  groupTheme: GroupImprovementTheme,
  oneLiner: string
): PremiumImprovementItem {
  const bulletsText = groupTheme.bullets.map((bullet) => `・${bullet}`).join(" ");

  return {
    id: "improvement_theme",
    label: "職種別の改善テーマ",
    preview: oneLiner,
    detail: `${bulletsText} ${buildCategoryContext(category)}`,
  };
}

function buildRateFactorsItem(
  category: JobCategory,
  groupTheme: GroupImprovementTheme
): PremiumImprovementItem {
  const tagHint =
    category.tags.length > 0
      ? `参考タグ: ${category.tags.slice(0, 3).join("、")}。`
      : "";

  return {
    id: "rate_factors",
    label: "単価改善につながる要素",
    preview: "対応範囲・専門性・成果実績・継続支援（参考値）",
    detail: `・対応範囲: ${category.description}の範囲を明確化。・専門性: ${category.skillExamples}。・成果実績: 数値や事例を参考値として整理。・継続支援: 更新・改善サイクルを含める。${groupTheme.rateFactorDetail}${tagHint}`,
  };
}

function buildNegotiationPointItem(
  category: JobCategory,
  groupTheme: GroupImprovementTheme
): PremiumImprovementItem {
  return {
    id: "negotiation_point",
    label: "次回交渉時のポイント",
    preview: groupTheme.negotiationPreview,
    detail: `${groupTheme.negotiationDetail}${category.label}の案件では、${category.skillExamples}を具体例にすると整理しやすいです（参考値）。`,
  };
}

function buildPreviewTexts(
  category: JobCategory,
  oneLiner: string,
  items: PremiumImprovementItem[]
): { previewText: string; blurredText: string } {
  return {
    previewText: `${category.label} — ${oneLiner}（参考値）`,
    blurredText: items
      .map((item) => `${item.label}: ${item.preview}${item.detail}`)
      .join(" "),
  };
}

export function getPremiumJobImprovementAnalysis(
  input: PremiumImprovementInput
): PremiumJobImprovementAnalysis {
  const { category } = input;
  const groupTheme = GROUP_IMPROVEMENT_THEMES[category.group];
  const oneLiner = getCategoryOneLiner(category, groupTheme);

  const items: PremiumImprovementItem[] = [
    buildImprovementThemeItem(category, groupTheme, oneLiner),
    buildRateFactorsItem(category, groupTheme),
    buildNegotiationPointItem(category, groupTheme),
  ];

  const { previewText, blurredText } = buildPreviewTexts(
    category,
    oneLiner,
    items
  );

  return {
    items,
    previewText,
    blurredText,
  };
}
