import type { JobCategory } from "@/data/types";
import {
  formatYen,
  getPercentilePosition,
  type DiagnosisLevel,
  type RateComparison,
} from "@/lib/calculator";

export interface PremiumPositionInput {
  category: JobCategory;
  userRate: number;
  marketRate: number;
  comparison: RateComparison;
  diagnosisLevel: DiagnosisLevel;
  positionLabel: string;
}

export interface PremiumPositionItem {
  id:
    | "experience_band"
    | "band_market_position"
    | "top25_gap"
    | "improvement_direction";
  label: string;
  preview: string;
  detail: string;
}

export interface PremiumExperiencePositionAnalysis {
  items: PremiumPositionItem[];
  previewText: string;
  blurredText: string;
}

interface ExperienceBandEstimate {
  label: string;
  referenceRate: number;
}

function getExperienceBandFromPercentile(
  percentile: number,
  category: JobCategory
): ExperienceBandEstimate {
  const { minRate, avgRate, top25Rate, top10Rate } = category;

  if (percentile < 20) {
    return {
      label: "1〜3年（参考）",
      referenceRate: Math.round(minRate + (avgRate - minRate) * 0.35),
    };
  }

  if (percentile < 35) {
    return {
      label: "3〜5年（参考）",
      referenceRate: Math.round(minRate + (avgRate - minRate) * 0.65),
    };
  }

  if (percentile < 55) {
    return {
      label: "5〜7年（参考）",
      referenceRate: avgRate,
    };
  }

  if (percentile < 72) {
    return {
      label: "7〜10年（参考）",
      referenceRate: Math.round(avgRate + (top25Rate - avgRate) * 0.5),
    };
  }

  if (percentile < 88) {
    return {
      label: "10〜15年（参考）",
      referenceRate: top25Rate,
    };
  }

  return {
    label: "15年以上（参考）",
    referenceRate: Math.round(top25Rate + (top10Rate - top25Rate) * 0.5),
  };
}

function getBandPositionLabel(
  userRate: number,
  bandReferenceRate: number,
  marketRate: number
): string {
  const bandRatio = userRate / bandReferenceRate;

  if (bandRatio < 0.92) {
    return "同経験帯では市場平均（参考値）と比較して中位〜やや低位です";
  }

  if (bandRatio <= 1.08) {
    if (userRate < marketRate * 0.95) {
      return "同経験帯では市場平均（参考値）と比較して中位付近です";
    }

    if (userRate > marketRate * 1.05) {
      return "同経験帯では市場平均（参考値）と比較して中位〜やや上位です";
    }

    return "同経験帯では市場平均（参考値）と概ね同水準です";
  }

  return "同経験帯では市場平均（参考値）と比較して中位〜やや上位です";
}

function buildExperienceBandItem(band: ExperienceBandEstimate): PremiumPositionItem {
  return {
    id: "experience_band",
    label: "経験年数帯",
    preview: `あなたの経験年数帯：${band.label}`,
    detail: `参考市場データ上の推定経験帯です。同一${band.label}帯の参考単価目安は ${formatYen(band.referenceRate)}/日（参考値）です。`,
  };
}

function buildBandMarketPositionItem(
  positionSummary: string,
  positionLabel: string,
  band: ExperienceBandEstimate,
  userRate: number,
  marketRate: number
): PremiumPositionItem {
  return {
    id: "band_market_position",
    label: "同経験帯での市場ポジション",
    preview: positionSummary,
    detail: `市場内ポジション ${positionLabel}。同経験帯（${band.label}）の参考単価 ${formatYen(band.referenceRate)}/日に対し、現在 ${formatYen(userRate)}/日、参考市場平均 ${formatYen(marketRate)}/日（参考値）です。`,
  };
}

function buildTop25GapItem(
  category: JobCategory,
  userRate: number
): PremiumPositionItem {
  const gap = Math.max(0, category.top25Rate - userRate);

  if (gap <= 0) {
    return {
      id: "top25_gap",
      label: "上位25%との差",
      preview: "上位25%単価（参考値）に到達済み、またはそれに近い水準です。",
      detail: `参考上位25%単価 ${formatYen(category.top25Rate)}/日。参考上位10% ${formatYen(category.top10Rate)}/日との差分も確認できます（参考値）。`,
    };
  }

  return {
    id: "top25_gap",
    label: "上位25%との差",
    preview: `上位25%単価（参考値）まであと${formatYen(gap)}/日です。`,
    detail: `参考上位25% ${formatYen(category.top25Rate)}/日、参考市場平均 ${formatYen(category.avgRate)}/日との位置関係から、段階的な改定余地を確認できます（参考値）。`,
  };
}

function buildImprovementDirectionItem(
  category: JobCategory,
  diagnosisLevel: DiagnosisLevel
): PremiumPositionItem {
  const basePreview =
    "経験年数だけでなく、対応範囲・成果提示による単価改善余地があります。";

  if (
    diagnosisLevel === "significantly_low" ||
    diagnosisLevel === "below_market"
  ) {
    return {
      id: "improvement_direction",
      label: "改善方向",
      preview: basePreview,
      detail: `${category.skillExamples}の対応実績や${category.description}における成果の可視化が、経験年数に加えた改定の参考材料になります（参考値）。`,
    };
  }

  if (diagnosisLevel === "at_market") {
    return {
      id: "improvement_direction",
      label: "改善方向",
      preview: basePreview,
      detail: `参考市場平均付近の水準です。対応範囲の整理と成果の定量化により、上位25%（参考値 ${formatYen(category.top25Rate)}/日）への段階的な接近が考えられます。`,
    };
  }

  return {
    id: "improvement_direction",
    label: "改善方向",
    preview:
      "経験年数に加え、継続成果と対応範囲の整理が単価維持・改善の参考材料になります。",
    detail: `${category.skillExamples}の継続的な成果、${category.marketTrend}（参考値）を踏まえた更新時の説明が有効です。`,
  };
}

function buildPreviewTexts(items: PremiumPositionItem[]): {
  previewText: string;
  blurredText: string;
} {
  const [first, ...rest] = items;

  return {
    previewText: `${first.label}: ${first.preview}`,
    blurredText: [
      first.detail,
      ...rest.map((item) => `${item.label}: ${item.preview}${item.detail}`),
    ].join(" "),
  };
}

export function getPremiumExperiencePositionAnalysis(
  input: PremiumPositionInput
): PremiumExperiencePositionAnalysis {
  const {
    category,
    userRate,
    marketRate,
    diagnosisLevel,
    positionLabel,
  } = input;

  const percentile = getPercentilePosition(userRate, category);
  const band = getExperienceBandFromPercentile(percentile, category);
  const bandPositionSummary = getBandPositionLabel(
    userRate,
    band.referenceRate,
    marketRate
  );

  const items: PremiumPositionItem[] = [
    buildExperienceBandItem(band),
    buildBandMarketPositionItem(
      bandPositionSummary,
      positionLabel,
      band,
      userRate,
      marketRate
    ),
    buildTop25GapItem(category, userRate),
    buildImprovementDirectionItem(category, diagnosisLevel),
  ];

  const { previewText, blurredText } = buildPreviewTexts(items);

  return {
    items,
    previewText,
    blurredText,
  };
}
