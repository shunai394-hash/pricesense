import type { JobCategory, JobGroupId } from "@/data/types";
import {
  formatYen,
  type DiagnosisLevel,
  type DiagnosisResult,
} from "@/lib/calculator";
import { A8_OFFERS } from "@/lib/affiliates";

const IT_GROUPS: JobGroupId[] = ["it", "ai"];

export type NextActionId = "projects" | "career" | "raise_current";

export interface NextActionLink {
  href: string;
  label: string;
  partnerName: string;
}

export interface DiagnosisNextAction {
  id: NextActionId;
  title: string;
  reason: string;
  recommended: boolean;
  kind: "affiliate" | "premium";
  ctaLabel: string;
  links?: NextActionLink[];
}

function isItCategory(group: JobGroupId): boolean {
  return IT_GROUPS.includes(group);
}

function recommendSet(level: DiagnosisLevel): {
  projects: boolean;
  career: boolean;
  raiseCurrent: boolean;
} {
  switch (level) {
    case "significantly_low":
      return { projects: true, career: true, raiseCurrent: true };
    case "below_market":
      return { projects: true, career: false, raiseCurrent: true };
    case "at_market":
      return { projects: false, career: false, raiseCurrent: true };
    case "above_market":
      return { projects: true, career: false, raiseCurrent: false };
    case "premium":
      return { projects: true, career: true, raiseCurrent: false };
    default:
      return { projects: false, career: false, raiseCurrent: true };
  }
}

function projectsReason(
  diagnosis: DiagnosisResult,
  category: JobCategory,
  annualOpportunity: number
): string {
  if (diagnosis.level === "significantly_low" || diagnosis.level === "below_market") {
    return `${category.label}は市場平均より低い水準です。今の契約を見直すだけでなく、より高い単価の案件へ移る選択肢もあります。`;
  }
  if (diagnosis.level === "premium") {
    return `すでに高単価帯です。長期契約や紹介案件など、単価を維持しやすい仕事の探し方が有効です。`;
  }
  if (annualOpportunity > 0) {
    return `市場平均との差は年間 ${formatYen(annualOpportunity)}（参考値）。条件の合う案件を比較すると、単価を上げやすいです。`;
  }
  return `${category.label}として、今より条件の良い案件がないか確認する価値があります。`;
}

function careerReason(
  diagnosis: DiagnosisResult,
  category: JobCategory,
  isIt: boolean
): string {
  if (isIt) {
    if (diagnosis.level === "significantly_low" || diagnosis.level === "below_market") {
      return `フリーランス案件だけでなく、IT転職で年収を上げるルートも有効です。`;
    }
    return `上流・ハイクラス寄りのIT職へ移ると、単価や年収の上限が上がることがあります。`;
  }
  return `${category.label}の経験を活かし、転職で年収条件を上げる方法もあります。`;
}

function raiseCurrentReason(
  diagnosis: DiagnosisResult,
  targetLabel: string
): string {
  if (diagnosis.negotiationUrgency === "high") {
    return `まず今の契約で値上げ交渉する余地が大きい状態です。${targetLabel}向けの交渉文から始められます。`;
  }
  if (diagnosis.negotiationUrgency === "optional") {
    return `大幅な改定より、契約更新・応募文・面談での伝え方を整える方が現実的です。`;
  }
  return `今の仕事のまま単価を上げるなら、交渉文・応募文・職務経歴書の改善が最短です。`;
}

export function getDiagnosisNextActions({
  diagnosis,
  category,
  annualOpportunity,
}: {
  diagnosis: DiagnosisResult;
  category: JobCategory;
  annualOpportunity: number;
}): DiagnosisNextAction[] {
  const recommended = recommendSet(diagnosis.level);
  const isIt = isItCategory(category.group);

  const careerLinks: NextActionLink[] = isIt
    ? [
        {
          href: A8_OFFERS.techGo.href,
          label: `${A8_OFFERS.techGo.name}に相談する`,
          partnerName: A8_OFFERS.techGo.name,
        },
        {
          href: A8_OFFERS.agentNavi.href,
          label: `${A8_OFFERS.agentNavi.name}で探す`,
          partnerName: A8_OFFERS.agentNavi.name,
        },
      ]
    : [
        {
          href: A8_OFFERS.agentNavi.href,
          label: `${A8_OFFERS.agentNavi.name}で探す`,
          partnerName: A8_OFFERS.agentNavi.name,
        },
      ];

  return [
    {
      id: "projects",
      title: "高単価案件を探す",
      reason: projectsReason(diagnosis, category, annualOpportunity),
      recommended: recommended.projects,
      kind: "affiliate",
      ctaLabel: `${A8_OFFERS.techadapt.name}で案件を見る`,
      links: [
        {
          href: A8_OFFERS.techadapt.href,
          label: `${A8_OFFERS.techadapt.name}で案件を見る`,
          partnerName: A8_OFFERS.techadapt.name,
        },
      ],
    },
    {
      id: "career",
      title: "転職で単価・年収を上げる",
      reason: careerReason(diagnosis, category, isIt),
      recommended: recommended.career,
      kind: "affiliate",
      ctaLabel: careerLinks[0].label,
      links: careerLinks,
    },
    {
      id: "raise_current",
      title: "今の仕事で単価を上げる",
      reason: raiseCurrentReason(diagnosis, category.label),
      recommended: recommended.raiseCurrent,
      kind: "premium",
      ctaLabel: "交渉文・応募文を作成する",
    },
  ];
}
