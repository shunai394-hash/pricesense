export interface JobCategory {
  id: string;
  label: string;
  marketRate: number;
  description: string;
}

export const JOB_CATEGORIES: JobCategory[] = [
  {
    id: "engineer",
    label: "エンジニア",
    marketRate: 85000,
    description: "Web / アプリ開発",
  },
  {
    id: "designer",
    label: "デザイナー",
    marketRate: 70000,
    description: "UI/UX / グラフィック",
  },
  {
    id: "consultant",
    label: "コンサルタント",
    marketRate: 120000,
    description: "戦略 / 業務改善",
  },
  {
    id: "marketer",
    label: "マーケター",
    marketRate: 65000,
    description: "デジタル / ブランド",
  },
  {
    id: "pm",
    label: "プロジェクトマネージャー",
    marketRate: 90000,
    description: "PM / PdM",
  },
  {
    id: "writer",
    label: "ライター / 編集",
    marketRate: 45000,
    description: "コンテンツ制作",
  },
  {
    id: "accounting",
    label: "経理・財務",
    marketRate: 55000,
    description: "会計 / FP&A",
  },
  {
    id: "sales",
    label: "営業 / セールス",
    marketRate: 60000,
    description: "BtoB / 法人営業",
  },
];

export const WORKING_DAYS_PER_YEAR = 220;

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

export function getPercentilePosition(
  userRate: number,
  marketRate: number
): number {
  if (marketRate <= 0) return 50;
  const ratio = userRate / marketRate;
  return Math.min(99, Math.max(1, Math.round(ratio * 70)));
}
