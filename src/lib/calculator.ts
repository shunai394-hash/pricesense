import {
  JOB_CATEGORIES,
  JOB_CATEGORY_COUNT,
  type JobCategory,
} from "@/data";

export type { JobCategory };
export { JOB_CATEGORIES, JOB_CATEGORY_COUNT };

export const WORKING_DAYS_PER_YEAR = 220;

export const MARKET_DATA_META = {
  updatedAt: "2026年1月",
  sourceLabel: "フリーランス市場調査（参考値）",
  methodology:
    "職種別の日単価（最低・平均・上位25%・上位10%）は、公開されている業界調査および市場データをもとに設定しています。",
  workingDaysNote: `年間換算は${WORKING_DAYS_PER_YEAR}稼働日で計算`,
  disclaimer:
    "表示される相場は参考値です。スキル・経験・案件条件により実際の単価は異なります。",
  positionNote:
    "市場内ポジションは最低・平均・上位25%・上位10%の4段階データに基づく推定値です。",
} as const;

export type DiagnosisLevel =
  | "significantly_low"
  | "below_market"
  | "at_market"
  | "above_market"
  | "premium";

export type NegotiationUrgency = "high" | "medium" | "low" | "optional";

export interface DiagnosisResult {
  level: DiagnosisLevel;
  label: string;
  summary: string;
  gapPercent: number;
  positionLabel: string;
  actionMessage: string;
  negotiationUrgency: NegotiationUrgency;
}

export interface RateComparison {
  dailyDiff: number;
  gapPercent: number;
  direction: "below" | "above" | "at";
  gapLabel: string;
}

export function formatYen(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function calculateAnnualOpportunity(
  userRate: number,
  marketRate: number
): number {
  const dailyDiff = marketRate - userRate;
  return dailyDiff * WORKING_DAYS_PER_YEAR;
}

export function calculateUpgradeImpact(
  currentRate: number,
  targetRate: number
): number {
  return (targetRate - currentRate) * WORKING_DAYS_PER_YEAR;
}

export function calculateAnnualRevenue(dailyRate: number): number {
  return dailyRate * WORKING_DAYS_PER_YEAR;
}

export interface AnnualSimulationRow {
  id: string;
  label: string;
  dailyRate: number;
  annualRevenue: number;
  diffFromCurrent: number;
  highlight?: boolean;
}

export function getAnnualRevenueSimulation(
  currentRate: number,
  category: JobCategory,
  targetRate: number
): AnnualSimulationRow[] {
  if (currentRate <= 0) return [];

  const scenarios = [
    { id: "current", label: "現在の単価", dailyRate: currentRate, highlight: false },
    { id: "avg", label: "市場平均", dailyRate: category.avgRate },
    { id: "top25", label: "上位25%", dailyRate: category.top25Rate },
    { id: "top10", label: "上位10%", dailyRate: category.top10Rate },
    { id: "target", label: "交渉目標", dailyRate: targetRate, highlight: true },
  ];

  return scenarios.map(({ id, label, dailyRate, highlight }) => {
    const annualRevenue = calculateAnnualRevenue(dailyRate);
    return {
      id,
      label,
      dailyRate,
      annualRevenue,
      diffFromCurrent: annualRevenue - calculateAnnualRevenue(currentRate),
      highlight,
    };
  });
}

export function getGapPercent(userRate: number, marketRate: number): number {
  if (userRate <= 0) return 0;
  return Math.round(((marketRate - userRate) / userRate) * 100);
}

export function getRateComparison(
  userRate: number,
  marketRate: number
): RateComparison {
  if (userRate <= 0) {
    return {
      dailyDiff: 0,
      gapPercent: 0,
      direction: "at",
      gapLabel: "—",
    };
  }

  const gapPercent = getGapPercent(userRate, marketRate);
  const dailyDiff = Math.abs(marketRate - userRate);

  if (gapPercent > 0) {
    return {
      dailyDiff,
      gapPercent: Math.abs(gapPercent),
      direction: "below",
      gapLabel: `市場平均より ${Math.abs(gapPercent)}% 低い`,
    };
  }

  if (gapPercent < 0) {
    return {
      dailyDiff,
      gapPercent: Math.abs(gapPercent),
      direction: "above",
      gapLabel: `市場平均より ${Math.abs(gapPercent)}% 高い`,
    };
  }

  return {
    dailyDiff: 0,
    gapPercent: 0,
    direction: "at",
    gapLabel: "市場平均と同水準",
  };
}

function interpolatePercentile(
  rate: number,
  lowRate: number,
  highRate: number,
  lowPercentile: number,
  highPercentile: number
): number {
  if (highRate <= lowRate) return lowPercentile;
  const ratio = (rate - lowRate) / (highRate - lowRate);
  return Math.round(lowPercentile + ratio * (highPercentile - lowPercentile));
}

export function getPercentilePosition(
  userRate: number,
  category: JobCategory
): number {
  const { minRate, avgRate, top25Rate, top10Rate } = category;

  if (userRate <= minRate) {
    return Math.max(1, interpolatePercentile(userRate, 0, minRate, 1, 10));
  }
  if (userRate <= avgRate) {
    return interpolatePercentile(userRate, minRate, avgRate, 10, 50);
  }
  if (userRate <= top25Rate) {
    return interpolatePercentile(userRate, avgRate, top25Rate, 50, 75);
  }
  if (userRate <= top10Rate) {
    return interpolatePercentile(userRate, top25Rate, top10Rate, 75, 90);
  }
  return Math.min(
    99,
    interpolatePercentile(userRate, top10Rate, top10Rate * 1.3, 90, 99)
  );
}

export function getPositionLabel(percentile: number): string {
  if (percentile < 25) return `下位帯（推定 ${percentile}%付近）`;
  if (percentile < 50) return `中下位（推定 ${percentile}%付近）`;
  if (percentile <= 75) return `中上位（推定 ${percentile}%付近）`;
  if (percentile <= 90) return `上位25%圏内（推定 ${percentile}%付近）`;
  return `上位10%圏内（推定 ${percentile}%付近）`;
}

function getActionMessage(
  level: DiagnosisLevel,
  category: JobCategory,
  userRate: number,
  marketRate: number
): { actionMessage: string; negotiationUrgency: NegotiationUrgency } {
  const annualLoss = calculateAnnualOpportunity(userRate, marketRate);

  switch (level) {
    case "significantly_low":
      return {
        actionMessage: `${category.label}として年間${formatYen(Math.abs(annualLoss))}の機会損失が発生している可能性があります。${category.marketTrend}。まずは市場平均との中間地点を目標に交渉を始めましょう。`,
        negotiationUrgency: "high",
      };
    case "below_market":
      return {
        actionMessage: `あと${formatYen(marketRate - userRate)}/日の改定で市場水準に到達できます。${category.skillExamples}の実績を交渉材料に、値上げのタイミングです。`,
        negotiationUrgency: "medium",
      };
    case "at_market":
      return {
        actionMessage: `市場平均に位置していますが、${category.marketTrend}。上位25%（${formatYen(category.top25Rate)}）を目標に段階的な改定を検討しましょう。`,
        negotiationUrgency: "low",
      };
    case "above_market":
      return {
        actionMessage: `すでに市場平均を上回る単価です。${category.skillExamples}の継続的な成果を示し、上位10%（${formatYen(category.top10Rate)}）を目指しましょう。`,
        negotiationUrgency: "optional",
      };
    case "premium":
      return {
        actionMessage: `上位10%圏内（${formatYen(category.top10Rate)}以上）の高単価です。さらなる改定より、長期契約・紹介案件の獲得に注力するのも有効です。`,
        negotiationUrgency: "optional",
      };
    default:
      return {
        actionMessage: "",
        negotiationUrgency: "low",
      };
  }
}

export function getDiagnosis(
  userRate: number,
  marketRate: number,
  category?: JobCategory
): DiagnosisResult {
  const gapPercent = getGapPercent(userRate, marketRate);
  const cat = category ?? JOB_CATEGORIES[0];
  const percentile = getPercentilePosition(userRate, cat);
  const positionLabel = getPositionLabel(percentile);

  if (userRate <= 0) {
    return {
      level: "at_market",
      label: "—",
      summary: "日単価を入力してください",
      gapPercent: 0,
      positionLabel: "—",
      actionMessage: "",
      negotiationUrgency: "low",
    };
  }

  const ratio = userRate / marketRate;

  if (ratio < 0.75) {
    const { actionMessage, negotiationUrgency } = getActionMessage(
      "significantly_low",
      cat,
      userRate,
      marketRate
    );
    return {
      level: "significantly_low",
      label: "大幅に低位",
      summary: `${cat.label}の市場平均（${formatYen(marketRate)}）より約${Math.abs(gapPercent)}%低い水準です。同職種のフリーランスと比較して、単価見直しの余地が大きい状態です。`,
      gapPercent,
      positionLabel,
      actionMessage,
      negotiationUrgency,
    };
  }

  if (ratio < 0.92) {
    const { actionMessage, negotiationUrgency } = getActionMessage(
      "below_market",
      cat,
      userRate,
      marketRate
    );
    return {
      level: "below_market",
      label: "やや低位",
      summary: `市場平均より${formatYen(marketRate - userRate)}/日低く、年間${formatYen(Math.abs(calculateAnnualOpportunity(userRate, marketRate)))}の機会損失が見込まれます。`,
      gapPercent,
      positionLabel,
      actionMessage,
      negotiationUrgency,
    };
  }

  if (ratio <= 1.08) {
    const { actionMessage, negotiationUrgency } = getActionMessage(
      "at_market",
      cat,
      userRate,
      marketRate
    );
    return {
      level: "at_market",
      label: "市場水準",
      summary: `${cat.label}の市場平均付近に位置しています。上位25%（${formatYen(cat.top25Rate)}）を目指した段階的な値上げを検討する余地があります。`,
      gapPercent,
      positionLabel,
      actionMessage,
      negotiationUrgency,
    };
  }

  if (ratio <= 1.25) {
    const { actionMessage, negotiationUrgency } = getActionMessage(
      "above_market",
      cat,
      userRate,
      marketRate
    );
    return {
      level: "above_market",
      label: "やや上位",
      summary: `市場平均を${formatYen(userRate - marketRate)}/日上回っています。${cat.skillExamples}の実績が評価されている状態です。`,
      gapPercent,
      positionLabel,
      actionMessage,
      negotiationUrgency,
    };
  }

  const { actionMessage, negotiationUrgency } = getActionMessage(
    "premium",
    cat,
    userRate,
    marketRate
  );
  return {
    level: "premium",
    label: "上位水準",
    summary: `${cat.label}の上位10%圏内（${formatYen(cat.top10Rate)}付近）に近い高単価です。`,
    gapPercent,
    positionLabel,
    actionMessage,
    negotiationUrgency,
  };
}

export function getMarketRangePosition(
  userRate: number,
  minRate: number,
  maxRate: number
): number {
  if (maxRate <= minRate) return 50;
  const position = ((userRate - minRate) / (maxRate - minRate)) * 100;
  return Math.min(100, Math.max(0, position));
}

export function getComparisonBarWidth(
  userRate: number,
  marketRate: number
): { userWidth: number; marketMarker: number } {
  const max = Math.max(userRate, marketRate, 1);
  return {
    userWidth: (userRate / max) * 100,
    marketMarker: (marketRate / max) * 100,
  };
}

export function getNegotiationCtaLabel(urgency: NegotiationUrgency): string {
  switch (urgency) {
    case "high":
      return "値上げ交渉文を作成する（優先）";
    case "medium":
      return "値上げ交渉文を作成する";
    case "low":
      return "改定交渉文を作成する";
    case "optional":
      return "契約更新の交渉文を作成する";
  }
}

export function getProposedRate(currentRate: number, marketRate: number) {
  if (currentRate <= 0) return marketRate;

  return Math.max(Math.round(currentRate * 1.2), marketRate);
}
