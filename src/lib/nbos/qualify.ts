import type { Offering } from "@/lib/nbos/types";
import type { EngagementEvidence } from "@/lib/nbos/engagement";
import type {
  Contactability,
  PursueDecision,
  QualificationScores,
} from "@/lib/nbos/types";

export interface QualifyInput {
  offering: Offering;
  company: {
    name: string;
    industry: string | null;
    location: string | null;
    country: string | null;
    employeeCount: number | null;
    domain: string | null;
  };
  factText: string;
  hypothesis: string | null;
  unknown: string | null;
  signalType: string | null;
  verificationStatus: string | null;
  sourceUrl: string | null;
  detectedAt: string | null;
  regionCode: string | null;
  contactability: Contactability;
  engagement: EngagementEvidence;
  hasPersonName: boolean;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const SIGNAL_ALIASES: Record<string, string[]> = {
  海外進出: ["海外", "進出", "expansion", "global", "international", "海外展開"],
  新規事業: ["新事業", "new business", "新規"],
  資金調達: ["調達", "funding", "series", "raise"],
  新製品: ["新商品", "product launch", "発売"],
  拠点開設: ["拠点", "office", "開設"],
  採用増加: ["採用", "hiring", "募集"],
};

function includesAny(haystack: string, needles: string[]): string[] {
  const text = haystack.toLowerCase();
  return needles.filter((item) => {
    if (!item) return false;
    const needle = item.toLowerCase();
    if (text.includes(needle)) return true;
    const aliases = SIGNAL_ALIASES[item] ?? SIGNAL_ALIASES[needle] ?? [];
    if (aliases.some((alias) => text.includes(alias.toLowerCase()))) return true;
    const parts = needle.split(/[\s/・]+/).filter((part) => part.length >= 2);
    return parts.some((part) => text.includes(part));
  });
}

function recencyScore(detectedAt: string | null): number {
  if (!detectedAt) return 35;
  const ageDays = (Date.now() - Date.parse(detectedAt)) / (24 * 60 * 60 * 1000);
  if (!Number.isFinite(ageDays)) return 35;
  if (ageDays <= 14) return 90;
  if (ageDays <= 45) return 70;
  if (ageDays <= 90) return 50;
  return 25;
}

export function contactabilityScore(value: Contactability): number {
  switch (value) {
    case "official_contact":
      return 90;
    case "public_executive":
    case "public_professional_profile":
      return 70;
    case "contact_form":
      return 55;
    case "role_identified":
      return 45;
    case "department_identified":
      return 35;
    default:
      return 15;
  }
}

export function scoreQualification(input: QualifyInput): {
  scores: QualificationScores;
  decision: PursueDecision;
  whyThisCompany: string;
  explanation: Record<string, string[]>;
} {
  const offering = input.offering;
  const icp = offering.icp;
  const corpus = [
    input.factText,
    input.hypothesis ?? "",
    input.signalType ?? "",
    input.company.industry ?? "",
    input.company.location ?? "",
  ].join(" ");

  const matchedIndustries = includesAny(corpus, [
    ...offering.target_industries,
    ...icp.firmographic.industries,
  ]);
  const matchedTriggers = includesAny(corpus, icp.problem.triggers);
  const matchedNegative = includesAny(corpus, [
    ...icp.negative.industries,
    ...icp.negative.conditions,
    ...offering.exclusion_conditions,
  ]);
  const matchedRegions = includesAny(
    `${input.regionCode ?? ""} ${input.company.country ?? ""} ${input.company.location ?? ""}`,
    [...offering.target_regions, ...icp.geography.regions, ...icp.geography.countries]
  );

  let icpFit = 20;
  if (matchedIndustries.length > 0) icpFit += 25;
  if (matchedRegions.length > 0) icpFit += 15;
  const min = offering.target_company_size.employee_min ?? icp.firmographic.employee_min;
  const max = offering.target_company_size.employee_max ?? icp.firmographic.employee_max;
  if (
    typeof input.company.employeeCount === "number" &&
    (min == null || input.company.employeeCount >= min) &&
    (max == null || input.company.employeeCount <= max)
  ) {
    icpFit += 15;
  } else if (input.company.employeeCount == null) {
    icpFit += 5;
  }
  if (matchedTriggers.length > 0) icpFit += 20;
  if (matchedNegative.length > 0) icpFit -= 40;
  if (input.engagement.existingCustomer) icpFit -= 50;
  icpFit = clamp(icpFit);

  const recentChange = clamp(
    (matchedTriggers.length > 0 ? 55 : 20) +
      (input.factText.length > 20 ? 20 : 0) +
      (input.sourceUrl ? 15 : 0)
  );
  const intent = clamp(
    (matchedTriggers.length > 0 ? 40 : 15) +
      (input.hypothesis ? 20 : 0) +
      recentChange * 0.25
  );
  const timing = recencyScore(input.detectedAt);
  const needHypothesis = clamp(
    (input.hypothesis ? 45 : 10) +
      (matchedTriggers.length > 0 ? 30 : 0) +
      (offering.problem_solved &&
      includesAny(input.hypothesis ?? "", offering.problem_solved.split(/[、。\s]/)).length >
        0
        ? 20
        : 0)
  );
  const evidenceQuality = clamp(
    (input.verificationStatus === "source_confirmed" ? 50 : 20) +
      (input.sourceUrl ? 25 : 0) +
      (input.unknown ? -10 : 10) +
      (input.factText.length > 40 ? 15 : 0)
  );
  const contactability = contactabilityScore(input.contactability);

  const scores: QualificationScores = {
    icpFit,
    intent: clamp(intent),
    timing,
    recentChange,
    needHypothesis,
    evidenceQuality,
    contactability,
  };

  let decision: PursueDecision = "investigate";
  if (
    input.engagement.existingCustomer ||
    matchedNegative.length > 0 ||
    icpFit < 30
  ) {
    decision = "disqualify";
  } else if (!input.company.name || evidenceQuality < 35) {
    decision = "investigate";
  } else if (timing < 40 || needHypothesis < 35) {
    decision = "watch";
  } else if (
    icpFit >= 55 &&
    (intent >= 50 || recentChange >= 55) &&
    evidenceQuality >= 45 &&
    !input.engagement.hasOpenDeal
  ) {
    decision = "pursue";
  } else {
    decision = "investigate";
  }

  const whyParts = [
    matchedTriggers.length > 0
      ? `公開変化「${matchedTriggers.join(" / ")}」が確認された`
      : "業種一致だけでは不十分で、今回の変化との接点を評価した",
    offering.problem_solved
      ? `Offeringの課題: ${offering.problem_solved.slice(0, 80)}`
      : null,
    input.engagement.existingCustomer
      ? "既存顧客のため新規開拓対象から除外"
      : input.engagement.hasOpenDeal
        ? "進行中Dealがあるため新規Lead化しない"
        : isUncontactedLabel(input.engagement.status)
          ? "CRM上は未接触"
          : `営業状態は ${input.engagement.status}`,
  ].filter(Boolean);

  return {
    scores,
    decision,
    whyThisCompany: whyParts.join("。") + "。",
    explanation: {
      matchedIndustries,
      matchedTriggers,
      matchedNegative,
      matchedRegions,
      engagement: input.engagement.reasons,
    },
  };
}

function isUncontactedLabel(status: string): boolean {
  return status === "NEW_ACCOUNT" || status === "UNCONTACTED";
}

export function inferTargetContact(
  offering: Offering,
  signalType: string | null,
  factText: string,
  hypothesis: string | null
): { department: string | null; role: string | null; contactability: Contactability } {
  const text = `${signalType ?? ""} ${factText} ${hypothesis ?? ""}`.toLowerCase();
  const departments = offering.target_departments;
  const roles = offering.target_roles;

  let department = departments[0] ?? offering.icp.organization.departments[0] ?? null;
  let role = roles[0] ?? offering.icp.organization.roles[0] ?? null;

  if (/海外|進出|expand|global|international/.test(text)) {
    department = departments.find((item) => /海外|国際/.test(item)) ?? "海外事業";
    role = roles.find((item) => /海外/.test(item)) ?? "海外事業責任者";
  } else if (/採用|hiring|recruit/.test(text)) {
    department = "人事";
    role = "人事責任者";
  } else if (/資金調達|funding|series/.test(text)) {
    department = departments.find((item) => /経営企画/.test(item)) ?? "経営企画";
    role = roles.find((item) => /CFO|経営企画/.test(item)) ?? "経営企画";
  } else if (/新製品|product|新商品/.test(text)) {
    department = departments.find((item) => /事業/.test(item)) ?? "事業開発";
    role = roles.find((item) => /事業/.test(item)) ?? "事業責任者";
  }

  const contactability: Contactability = role
    ? "role_identified"
    : department
      ? "department_identified"
      : "unknown";

  return { department, role, contactability };
}
