export const ACCOUNT_STATUSES = [
  "NEW_ACCOUNT",
  "UNCONTACTED",
  "CONTACTED",
  "ENGAGED",
  "MEETING",
  "OPPORTUNITY",
  "CUSTOMER",
  "DISQUALIFIED",
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const PURSUE_DECISIONS = [
  "pursue",
  "watch",
  "investigate",
  "disqualify",
] as const;
export type PursueDecision = (typeof PURSUE_DECISIONS)[number];

export const CONTACTABILITY = [
  "official_contact",
  "contact_form",
  "public_executive",
  "department_identified",
  "role_identified",
  "public_professional_profile",
  "unknown",
] as const;
export type Contactability = (typeof CONTACTABILITY)[number];

export const LEARNING_LABELS = [
  "GOOD_PROSPECT",
  "WRONG_COMPANY",
  "WRONG_DEPARTMENT",
  "WRONG_PERSONA",
  "BAD_TIMING",
  "WRONG_NEED",
  "COMPETITOR",
  "ALREADY_CUSTOMER",
  "ALREADY_CONTACTED",
] as const;
export type LearningLabel = (typeof LEARNING_LABELS)[number];

export const SIGNAL_RECENCY = ["hot", "warm", "stale"] as const;
export type SignalRecency = (typeof SIGNAL_RECENCY)[number];

export interface IcpProfile {
  firmographic: {
    industries: string[];
    employee_min: number | null;
    employee_max: number | null;
    notes: string;
  };
  business_model: {
    include: string[];
    exclude: string[];
    notes: string;
  };
  problem: {
    triggers: string[];
    notes: string;
  };
  technology: {
    include: string[];
    exclude: string[];
    notes: string;
  };
  geography: {
    regions: string[];
    countries: string[];
    notes: string;
  };
  organization: {
    departments: string[];
    roles: string[];
    notes: string;
  };
  negative: {
    industries: string[];
    conditions: string[];
    notes: string;
  };
}

export interface Offering {
  id: string;
  name: string;
  description: string | null;
  problem_solved: string | null;
  target_industries: string[];
  target_company_size: {
    labels?: string[];
    employee_min?: number | null;
    employee_max?: number | null;
  };
  target_regions: string[];
  target_departments: string[];
  target_roles: string[];
  qualification_conditions: string[];
  exclusion_conditions: string[];
  icp: IcpProfile;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QualificationScores {
  icpFit: number;
  intent: number;
  timing: number;
  recentChange: number;
  needHypothesis: number;
  evidenceQuality: number;
  contactability: number;
}

export interface OutreachReadiness {
  researchReady: boolean;
  contactReady: boolean;
  whyNowReady: boolean;
  messageReady: boolean;
  approvalReady: boolean;
  readyToContact: boolean;
}

export function emptyIcp(): IcpProfile {
  return {
    firmographic: {
      industries: [],
      employee_min: null,
      employee_max: null,
      notes: "",
    },
    business_model: { include: [], exclude: [], notes: "" },
    problem: { triggers: [], notes: "" },
    technology: { include: [], exclude: [], notes: "" },
    geography: { regions: [], countries: [], notes: "" },
    organization: { departments: [], roles: [], notes: "" },
    negative: { industries: [], conditions: [], notes: "" },
  };
}

export function isAccountStatus(value: unknown): value is AccountStatus {
  return (
    typeof value === "string" &&
    (ACCOUNT_STATUSES as readonly string[]).includes(value)
  );
}

export function isPursueDecision(value: unknown): value is PursueDecision {
  return (
    typeof value === "string" &&
    (PURSUE_DECISIONS as readonly string[]).includes(value)
  );
}

export function isLearningLabel(value: unknown): value is LearningLabel {
  return (
    typeof value === "string" &&
    (LEARNING_LABELS as readonly string[]).includes(value)
  );
}

export function isContactability(value: unknown): value is Contactability {
  return (
    typeof value === "string" &&
    (CONTACTABILITY as readonly string[]).includes(value)
  );
}
