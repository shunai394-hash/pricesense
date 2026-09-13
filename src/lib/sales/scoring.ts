export const MODEL_VERSION = "ps-lead-scoring-v1";

export const SCORE_WEIGHTS = {
  budget: 25,
  decisionMaker: 25,
  decisionTimelineDays: 20,
  painSpecificity: 15,
  competitor: 10,
  priceAdvantage: 5,
} as const;

export type BudgetStatus = "confirmed" | "unknown" | "small" | "none";
export type PainSpecificity = "high" | "medium" | "low";
export type EscalationStatus =
  | "ai_handling"
  | "pending_human"
  | "handed_off";

export interface LeadScoreInput {
  budget: BudgetStatus;
  decisionMaker: boolean;
  decisionTimelineDays: number;
  painSpecificity: PainSpecificity;
  competitor: string[];
  priceAdvantage: number;
}

export interface IntentSignals {
  budget: BudgetStatus;
  decisionMaker: boolean;
  decisionTimelineDays: number;
  painSpecificity: PainSpecificity;
  competitor: string[];
  priceAdvantage: number;
  points: {
    budget: number;
    decisionMaker: number;
    decisionTimelineDays: number;
    painSpecificity: number;
    competitor: number;
    priceAdvantage: number;
  };
}

export interface ScoreResult {
  score: number;
  intentSignals: IntentSignals;
  primaryObjection: string;
  escalationStatus: EscalationStatus;
  nextAction: string;
  modelVersion: string;
  reason: string;
}

const BUDGET_VALUES = new Set<BudgetStatus>([
  "confirmed",
  "unknown",
  "small",
  "none",
]);

const PAIN_VALUES = new Set<PainSpecificity>(["high", "medium", "low"]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clampScore(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function scoreBudget(budget: BudgetStatus): number {
  switch (budget) {
    case "confirmed":
      return SCORE_WEIGHTS.budget;
    case "unknown":
      return 15;
    case "small":
      return 8;
    case "none":
      return 0;
  }
}

export function scoreDecisionMaker(decisionMaker: boolean): number {
  return decisionMaker ? SCORE_WEIGHTS.decisionMaker : 0;
}

export function scoreDecisionTimelineDays(days: number): number {
  if (!Number.isFinite(days) || days < 0) return 0;
  if (days <= 7) return SCORE_WEIGHTS.decisionTimelineDays;
  if (days <= 14) return 18;
  if (days <= 30) return 14;
  if (days <= 60) return 8;
  if (days <= 90) return 4;
  return 0;
}

export function scorePainSpecificity(pain: PainSpecificity): number {
  switch (pain) {
    case "high":
      return SCORE_WEIGHTS.painSpecificity;
    case "medium":
      return 8;
    case "low":
      return 0;
  }
}

export function scoreCompetitor(competitor: string[]): number {
  const named = competitor.filter((item) => item.trim().length > 0);
  return named.length > 0 ? SCORE_WEIGHTS.competitor : 6;
}

export function scorePriceAdvantage(priceAdvantage: number): number {
  if (!Number.isFinite(priceAdvantage) || priceAdvantage <= 0) return 0;
  if (priceAdvantage >= 30_000) return SCORE_WEIGHTS.priceAdvantage;
  if (priceAdvantage >= 10_000) return 3;
  return 1;
}

function resolvePrimaryObjection(input: LeadScoreInput): string {
  if (input.budget === "none" || input.budget === "small") return "budget";
  if (!input.decisionMaker) return "authority";
  if (input.decisionTimelineDays > 30) return "timing";
  if (input.budget === "unknown") return "budget";
  if (input.competitor.some((item) => item.trim().length > 0)) {
    return "competitor";
  }
  if (!Number.isFinite(input.priceAdvantage) || input.priceAdvantage <= 0) {
    return "price";
  }
  return "none";
}

function resolveEscalationStatus(
  score: number,
  input: LeadScoreInput
): EscalationStatus {
  if (score >= 80) {
    if (
      input.budget === "confirmed" &&
      input.decisionMaker &&
      input.decisionTimelineDays <= 14
    ) {
      return "handed_off";
    }
    return "pending_human";
  }

  if (score >= 61) return "pending_human";
  return "ai_handling";
}

function resolveNextAction(
  escalationStatus: EscalationStatus,
  score: number
): string {
  if (escalationStatus === "handed_off") return "handoff_to_human";
  if (escalationStatus === "pending_human") return "queue_human_followup";
  if (score <= 40) return "continue_ai_nurture";
  return "continue_ai_qualification";
}

function buildReason(
  score: number,
  points: IntentSignals["points"],
  escalationStatus: EscalationStatus
): string {
  const breakdown = [
    `budget=${points.budget}/${SCORE_WEIGHTS.budget}`,
    `decisionMaker=${points.decisionMaker}/${SCORE_WEIGHTS.decisionMaker}`,
    `decisionTimelineDays=${points.decisionTimelineDays}/${SCORE_WEIGHTS.decisionTimelineDays}`,
    `painSpecificity=${points.painSpecificity}/${SCORE_WEIGHTS.painSpecificity}`,
    `competitor=${points.competitor}/${SCORE_WEIGHTS.competitor}`,
    `priceAdvantage=${points.priceAdvantage}/${SCORE_WEIGHTS.priceAdvantage}`,
  ].join(", ");

  const rule =
    escalationStatus === "handed_off"
      ? "score>=80 and budget=confirmed and decisionMaker=true and decisionTimelineDays<=14"
      : escalationStatus === "pending_human"
        ? score >= 80
          ? "score>=80 without immediate handoff conditions"
          : "score 61-79"
        : "score<=60";

  return `ps-lead-scoring-v1 score=${score} (${breakdown}); escalation=${escalationStatus} because ${rule}`;
}

export function scoreLead(input: LeadScoreInput): ScoreResult {
  const points = {
    budget: scoreBudget(input.budget),
    decisionMaker: scoreDecisionMaker(input.decisionMaker),
    decisionTimelineDays: scoreDecisionTimelineDays(input.decisionTimelineDays),
    painSpecificity: scorePainSpecificity(input.painSpecificity),
    competitor: scoreCompetitor(input.competitor),
    priceAdvantage: scorePriceAdvantage(input.priceAdvantage),
  };

  const score = clampScore(
    points.budget +
      points.decisionMaker +
      points.decisionTimelineDays +
      points.painSpecificity +
      points.competitor +
      points.priceAdvantage,
    100
  );

  const escalationStatus = resolveEscalationStatus(score, input);
  const primaryObjection = resolvePrimaryObjection(input);
  const nextAction = resolveNextAction(escalationStatus, score);

  const intentSignals: IntentSignals = {
    budget: input.budget,
    decisionMaker: input.decisionMaker,
    decisionTimelineDays: input.decisionTimelineDays,
    painSpecificity: input.painSpecificity,
    competitor: [...input.competitor],
    priceAdvantage: input.priceAdvantage,
    points,
  };

  return {
    score,
    intentSignals,
    primaryObjection,
    escalationStatus,
    nextAction,
    modelVersion: MODEL_VERSION,
    reason: buildReason(score, points, escalationStatus),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseBudget(value: unknown): BudgetStatus {
  if (typeof value !== "string" || !BUDGET_VALUES.has(value as BudgetStatus)) {
    throw new Error("Invalid budget");
  }
  return value as BudgetStatus;
}

function parsePain(value: unknown): PainSpecificity {
  if (typeof value !== "string" || !PAIN_VALUES.has(value as PainSpecificity)) {
    throw new Error("Invalid painSpecificity");
  }
  return value as PainSpecificity;
}

function parseCompetitor(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Invalid competitor");
  }

  return value.map((item) => {
    if (typeof item !== "string") {
      throw new Error("Invalid competitor");
    }
    return item;
  });
}

function parseFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

export function parseLeadScoreInput(body: unknown): LeadScoreInput {
  if (!isRecord(body)) {
    throw new Error("Invalid request body");
  }

  if (typeof body.decisionMaker !== "boolean") {
    throw new Error("Invalid decisionMaker");
  }

  return {
    budget: parseBudget(body.budget),
    decisionMaker: body.decisionMaker,
    decisionTimelineDays: parseFiniteNumber(
      body.decisionTimelineDays,
      "decisionTimelineDays"
    ),
    painSpecificity: parsePain(body.painSpecificity),
    competitor: parseCompetitor(body.competitor),
    priceAdvantage:
      body.priceAdvantage === undefined || body.priceAdvantage === null
        ? 0
        : parseFiniteNumber(body.priceAdvantage, "priceAdvantage"),
  };
}

export function parseOptionalLeadId(body: unknown): string | null {
  if (!isRecord(body)) return null;

  const leadId = body.leadId;
  if (leadId === undefined || leadId === null || leadId === "") return null;
  if (typeof leadId !== "string" || !UUID_RE.test(leadId)) return null;

  return leadId;
}
