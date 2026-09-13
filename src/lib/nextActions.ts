import type { JobCategory, JobGroupId } from "@/data/types";
import {
  WORKING_DAYS_PER_YEAR,
  formatYen,
  type DiagnosisLevel,
  type DiagnosisResult,
} from "@/lib/calculator";
import { A8_OFFERS } from "@/lib/affiliates";

const IT_GROUPS: JobGroupId[] = ["it", "ai"];
const FREELANCE_PROJECT_GROUPS: JobGroupId[] = ["it", "ai", "design"];

export type NextActionId = "projects" | "career" | "raise_current";

export interface NextActionLink {
  href: string;
  label: string;
  partnerName: string;
}

export interface DiagnosisNextAction {
  id: NextActionId;
  headline: string;
  title: string;
  reason: string;
  kind: "affiliate" | "premium";
  ctaLabel: string;
  links?: NextActionLink[];
}

export interface NextMovePlan {
  primary: DiagnosisNextAction;
  alternatives: DiagnosisNextAction[];
}

function isItCategory(group: JobGroupId): boolean {
  return IT_GROUPS.includes(group);
}

function isFreelanceProjectCategory(group: JobGroupId): boolean {
  return FREELANCE_PROJECT_GROUPS.includes(group);
}

function isBelowMarket(level: DiagnosisLevel): boolean {
  return level === "significantly_low" || level === "below_market";
}

function getPrimaryId(
  level: DiagnosisLevel,
  group: JobGroupId
): NextActionId {
  if (isBelowMarket(level)) {
    return isFreelanceProjectCategory(group) ? "projects" : "career";
  }
  return "raise_current";
}

function projectLinks(): NextActionLink[] {
  return [
    {
      href: A8_OFFERS.techadapt.href,
      label: "高単価案件を見る",
      partnerName: A8_OFFERS.techadapt.name,
    },
  ];
}

function careerLinks(group: JobGroupId): NextActionLink[] {
  if (isItCategory(group)) {
    return [
      {
        href: A8_OFFERS.techGo.href,
        label: `${A8_OFFERS.techGo.name}に相談する`,
        partnerName: A8_OFFERS.techGo.name,
      },
    ];
  }

  return [
    {
      href: A8_OFFERS.agentNavi.href,
      label: "合う仕事を探す",
      partnerName: A8_OFFERS.agentNavi.name,
    },
  ];
}

function buildActions(
  diagnosis: DiagnosisResult,
  category: JobCategory,
  annualOpportunity: number
): Record<NextActionId, DiagnosisNextAction> {
  const below = isBelowMarket(diagnosis.level);
  const dailyGap = Math.round(
    Math.abs(annualOpportunity) / WORKING_DAYS_PER_YEAR
  );

  return {
    projects: {
      id: "projects",
      headline: "まずは高単価案件を探す",
      title: "高単価案件を探す",
      reason: below
        ? `今の単価は市場平均より ${formatYen(dailyGap)} /日 低い状態です。今の単価より高い案件へ移るのが、最短で収入を上げやすい方法です。`
        : `${category.label}として、今より条件の良い案件がないか確認する価値があります。`,
      kind: "affiliate",
      ctaLabel: "高単価案件を見る",
      links: projectLinks(),
    },
    career: {
      id: "career",
      headline: below
        ? "まずは条件の良い仕事を探す"
        : "まずは転職で収入を上げる",
      title: "転職で単価・年収を上げる",
      reason: below
        ? `${category.label}の経験を、今より条件の良い仕事へ移す選択肢があります。`
        : "雇用で年収の上限を上げるルートもあります。",
      kind: "affiliate",
      ctaLabel: isItCategory(category.group)
        ? `${A8_OFFERS.techGo.name}に相談する`
        : "合う仕事を探す",
      links: careerLinks(category.group),
    },
    raise_current: {
      id: "raise_current",
      headline: "まずは今の案件の単価を上げる",
      title: "今の案件の単価を上げる",
      reason: below
        ? "今の仕事を続けるなら、市場との差を根拠にした単価交渉から始められます。"
        : "今の案件を継続したまま、交渉文で次の改定に備えるのが現実的です。",
      kind: "premium",
      ctaLabel: "単価交渉を作る",
    },
  };
}

export function getNextMovePlan({
  diagnosis,
  category,
  annualOpportunity,
}: {
  diagnosis: DiagnosisResult;
  category: JobCategory;
  annualOpportunity: number;
}): NextMovePlan {
  const actions = buildActions(diagnosis, category, annualOpportunity);
  const primaryId = getPrimaryId(diagnosis.level, category.group);
  const alternativeIds: NextActionId[] = [];

  if (primaryId !== "raise_current") {
    alternativeIds.push("raise_current");
  }

  if (primaryId === "projects") {
    alternativeIds.push("career");
  } else if (primaryId === "raise_current") {
    alternativeIds.push(
      isFreelanceProjectCategory(category.group) || isItCategory(category.group)
        ? "projects"
        : "career"
    );
  }

  return {
    primary: actions[primaryId],
    alternatives: alternativeIds.map((id) => actions[id]),
  };
}
