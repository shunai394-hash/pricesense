export type JobGroupId =
  | "it"
  | "design"
  | "marketing"
  | "writing"
  | "video"
  | "ai"
  | "consulting"
  | "professional"
  | "admin"
  | "sales";

export interface JobGroup {
  id: JobGroupId;
  label: string;
}

export interface JobCategory {
  id: string;
  label: string;
  group: JobGroupId;
  groupLabel: string;
  minRate: number;
  avgRate: number;
  top25Rate: number;
  top10Rate: number;
  /** @deprecated Use avgRate — kept for backward compatibility */
  marketRate: number;
  /** @deprecated Use top10Rate — kept for backward compatibility */
  maxRate: number;
  description: string;
  tags: string[];
  skillExamples: string;
  marketTrend: string;
  keywords: string[];
}

export interface JobCategoryInput {
  id: string;
  label: string;
  min: number;
  avg: number;
  top25: number;
  top10: number;
  description: string;
  tags: string[];
  skillExamples: string;
  marketTrend: string;
  keywords?: string[];
}
