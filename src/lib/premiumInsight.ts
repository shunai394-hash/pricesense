import type { JobCategory } from "@/data/types";
import {
  formatYen,
  getPercentilePosition,
  type DiagnosisLevel,
  type RateComparison,
} from "@/lib/calculator";

export interface PremiumInsightInput {
  category: JobCategory;
  userRate: number;
  marketRate: number;
  comparison: RateComparison;
  diagnosisLevel: DiagnosisLevel;
  targetRate: number;
}

export interface PremiumInsightItem {
  id: "rate_difference" | "experience_years" | "improvement_points" | "negotiation_materials";
  label: string;
  preview: string;
  detail: string;
}

export interface PremiumRateIncreaseAnalysis {
  items: PremiumInsightItem[];
  previewText: string;
  blurredText: string;
}

function getEstimatedExperienceBand(percentile: number): string {
  if (percentile < 25) return "初〜中堅";
  if (percentile < 50) return "中堅";
  if (percentile <= 75) return "中堅〜シニア";
  return "シニア";
}

function getSuggestedIncreasePercent(
  userRate: number,
  targetRate: number,
  diagnosisLevel: DiagnosisLevel
): number {
  if (userRate <= 0) return 10;

  const targetPercent = Math.round(((targetRate - userRate) / userRate) * 100);

  if (diagnosisLevel === "significantly_low" || diagnosisLevel === "below_market") {
    return Math.min(Math.max(targetPercent, 5), 20);
  }

  if (diagnosisLevel === "at_market") {
    return Math.min(Math.max(targetPercent, 5), 10);
  }

  return Math.min(Math.max(targetPercent, 3), 8);
}

function buildRateDifferenceInsight(
  comparison: RateComparison,
  marketRate: number,
  userRate: number
): PremiumInsightItem {
  if (comparison.direction === "below") {
    return {
      id: "rate_difference",
      label: "現在単価との差分析",
      preview: "現在単価は市場平均（参考値）より低い位置です。",
      detail: `参考市場平均 ${formatYen(marketRate)}/日に対し、現在 ${formatYen(userRate)}/日。差額は ${formatYen(comparison.dailyDiff)}/日（${comparison.gapLabel}、参考値）です。`,
    };
  }

  if (comparison.direction === "above") {
    return {
      id: "rate_difference",
      label: "現在単価との差分析",
      preview: "現在単価は市場平均（参考値）より高い位置です。",
      detail: `参考市場平均 ${formatYen(marketRate)}/日を ${formatYen(comparison.dailyDiff)}/日上回っています（${comparison.gapLabel}、参考値）。`,
    };
  }

  return {
    id: "rate_difference",
    label: "現在単価との差分析",
    preview: "現在単価は市場平均（参考値）付近に位置しています。",
    detail: `参考市場平均 ${formatYen(marketRate)}/日と同水準付近です。上位25%との差を確認できます（参考値）。`,
  };
}

function buildExperienceYearsInsight(
  category: JobCategory,
  marketRate: number,
  diagnosisLevel: DiagnosisLevel,
  percentile: number
): PremiumInsightItem {
  const band = getEstimatedExperienceBand(percentile);

  if (
    diagnosisLevel === "significantly_low" ||
    diagnosisLevel === "below_market"
  ) {
    return {
      id: "experience_years",
      label: "経験年数分析",
      preview: "経験年数に対して、参考市場単価との差があります。",
      detail: `${category.label}の参考相場における${band}帯と比較すると、市場内ポジション（推定 ${percentile}%付近、参考値）は参考単価帯より下側に位置しています。${category.marketTrend}（参考値）。`,
    };
  }

  if (diagnosisLevel === "at_market") {
    return {
      id: "experience_years",
      label: "経験年数分析",
      preview: "参考市場データ上、経験換算の単価帯と概ね整合しています。",
      detail: `${band}帯の参考単価レンジ（平均 ${formatYen(marketRate)}/日、参考値）付近に位置しています。上位25%（${formatYen(category.top25Rate)}/日、参考値）との比較も有効です。`,
    };
  }

  return {
    id: "experience_years",
    label: "経験年数分析",
    preview: "参考市場データ上、経験換算の単価帯を上回る水準です。",
    detail: `${band}帯の参考相場（平均 ${formatYen(marketRate)}/日、参考値）を上回る位置にあります。上位10%（${formatYen(category.top10Rate)}/日、参考値）との差分も確認できます。`,
  };
}

function buildImprovementPointsInsight(
  category: JobCategory,
  userRate: number,
  targetRate: number,
  diagnosisLevel: DiagnosisLevel
): PremiumInsightItem {
  const increasePercent = getSuggestedIncreasePercent(
    userRate,
    targetRate,
    diagnosisLevel
  );

  if (
    diagnosisLevel === "significantly_low" ||
    diagnosisLevel === "below_market"
  ) {
    return {
      id: "improvement_points",
      label: "改善ポイント",
      preview: `次回更新時は+${increasePercent}%前後の改定幅から検討できます（参考値）。`,
      detail: `参考目標 ${formatYen(targetRate)}/日まで段階的に近づける改定が考えられます。${category.skillExamples}の実績整理が改定幅の根拠になります（参考値）。`,
    };
  }

  if (diagnosisLevel === "at_market") {
    return {
      id: "improvement_points",
      label: "改善ポイント",
      preview: `次回更新時は+${increasePercent}%前後の改定幅から検討できます（参考値）。`,
      detail: `参考市場の上位25%（${formatYen(category.top25Rate)}/日）を中長期の目安に、小幅な段階改定が現実的です（参考値）。`,
    };
  }

  return {
    id: "improvement_points",
    label: "改善ポイント",
    preview: "現有水準の維持確認を優先し、小幅改定を参考値として検討できます。",
    detail: `+${increasePercent}%前後の改定幅（参考値）や、参考目標 ${formatYen(targetRate)}/日を更新時の目安にできます。`,
  };
}

function buildNegotiationMaterialsInsight(
  category: JobCategory,
  marketRate: number,
  comparison: RateComparison
): PremiumInsightItem {
  const scopeHint =
    comparison.direction === "below"
      ? "対応範囲の明確化"
      : "継続的な成果の整理";

  return {
    id: "negotiation_materials",
    label: "交渉材料",
    preview: "対応範囲・経験年数・市場相場を根拠として提示できます。",
    detail: `${scopeHint}、${category.skillExamples}の実績、参考市場相場（平均 ${formatYen(marketRate)}/日）を組み合わせた説明が可能です（参考値）。${category.description}の案件文脈も交渉材料になります。`,
  };
}

function buildPreviewTexts(items: PremiumInsightItem[]): {
  previewText: string;
  blurredText: string;
} {
  const [first, ...rest] = items;

  const previewText = `${first.label}: ${first.preview}`;
  const blurredText = [
    first.detail,
    ...rest.map((item) => `${item.label}: ${item.preview}${item.detail}`),
  ].join(" ");

  return { previewText, blurredText };
}

export function getPremiumRateIncreaseAnalysis(
  input: PremiumInsightInput
): PremiumRateIncreaseAnalysis {
  const {
    category,
    userRate,
    marketRate,
    comparison,
    diagnosisLevel,
    targetRate,
  } = input;

  const percentile = getPercentilePosition(userRate, category);

  const items: PremiumInsightItem[] = [
    buildRateDifferenceInsight(comparison, marketRate, userRate),
    buildExperienceYearsInsight(
      category,
      marketRate,
      diagnosisLevel,
      percentile
    ),
    buildImprovementPointsInsight(
      category,
      userRate,
      targetRate,
      diagnosisLevel
    ),
    buildNegotiationMaterialsInsight(category, marketRate, comparison),
  ];

  const { previewText, blurredText } = buildPreviewTexts(items);

  return {
    items,
    previewText,
    blurredText,
  };
}
