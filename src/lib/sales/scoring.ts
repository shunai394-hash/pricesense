export const MODEL_VERSION = "ps-sales-os-scoring-v1";

export const SCORE_WEIGHTS = {
  fit: 25,
  intent: 25,
  engagement: 15,
  relationship: 15,
  salesReadiness: 20,
} as const;

export type EscalationStatus =
  | "ai_handling"
  | "pending_human"
  | "handed_off";

export interface LeadScoreInput {
  fitScore: number;
  intentScore: number;
  engagementScore: number;
  relationshipScore: number;
  salesReadinessScore: number;

  companyName?: string;
  industry?: string | null;
  employeeCount?: number | null;
  jobTitle?: string | null;
  department?: string | null;
  seniority?: string | null;

  intentSignals?: unknown;
  researchFindings?: unknown;
  relationshipSignals?: unknown;
  engagementSignals?: unknown;

  decisionMaker?: boolean;
  decisionMakerDistance?: number;
  existingRelationship?: boolean;
  replyReceived?: boolean;
  meetingRequested?: boolean;
  meetingScheduled?: boolean;

  primaryObjection?: string | null;
  nextAction?: string | null;
}

export interface IntentSignals {
  fitScore: number;
  intentScore: number;
  engagementScore: number;
  relationshipScore: number;
  salesReadinessScore: number;
  priorityScore: number;
  points: {
    fit: number;
    intent: number;
    engagement: number;
    relationship: number;
    salesReadiness: number;
  };
  signals: string[];
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseScore(value: unknown, field: string): number {
  if (typeof value === "number") return clampScore(value);

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return clampScore(parsed);
  }

  throw new Error(`${field} must be a number between 0 and 100`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function buildSignals(input: LeadScoreInput): string[] {
  const signals: string[] = [];

  if (input.fitScore >= 70) {
    signals.push("target_company_fit");
  }

  if (input.intentScore >= 70) {
    signals.push("strong_buying_intent");
  }

  if (input.engagementScore >= 70) {
    signals.push("strong_engagement");
  }

  if (input.relationshipScore >= 70) {
    signals.push("existing_relationship");
  }

  if (input.salesReadinessScore >= 70) {
    signals.push("sales_ready");
  }

  if (input.decisionMaker === true) {
    signals.push("decision_maker");
  }

  if (
    typeof input.decisionMakerDistance === "number" &&
    input.decisionMakerDistance > 0
  ) {
    signals.push("decision_maker_not_direct");
  }

  if (input.replyReceived === true) {
    signals.push("reply_received");
  }

  if (input.meetingRequested === true) {
    signals.push("meeting_requested");
  }

  if (input.meetingScheduled === true) {
    signals.push("meeting_scheduled");
  }

  if (input.existingRelationship === true) {
    signals.push("existing_contact");
  }

  return signals;
}

function resolvePrimaryObjection(input: LeadScoreInput): string {
  if (input.primaryObjection?.trim()) {
    return input.primaryObjection.trim();
  }

  if (input.intentScore < 30) {
    return "low_intent";
  }

  if (input.fitScore < 40) {
    return "low_fit";
  }

  if (input.engagementScore < 30) {
    return "no_engagement";
  }

  if (
    input.decisionMaker === false &&
    typeof input.decisionMakerDistance === "number" &&
    input.decisionMakerDistance >= 2
  ) {
    return "decision_maker_distance";
  }

  return "none";
}

function resolveEscalationStatus(
  score: number,
  input: LeadScoreInput
): EscalationStatus {
  // Scoring never auto-handoffs. High intent only recommends human review.
  if (
    input.meetingScheduled ||
    input.meetingRequested ||
    input.replyReceived ||
    score >= 65
  ) {
    return "pending_human";
  }

  return "ai_handling";
}

function resolveNextAction(
  score: number,
  input: LeadScoreInput
): string {
  if (input.meetingScheduled) {
    return "prepare_meeting";
  }

  if (input.meetingRequested) {
    return "schedule_meeting";
  }

  if (input.replyReceived) {
    return "review_reply_and_follow_up";
  }

  if (score >= 75) {
    return "personalized_outreach";
  }

  if (score >= 55) {
    return "research_and_contact";
  }

  if (input.intentScore >= 60) {
    return "monitor_signal_and_contact";
  }

  return "continue_prospecting";
}

function buildReason(
  score: number,
  input: LeadScoreInput,
  signals: string[]
): string {
  const parts: string[] = [
    `priority=${score}`,
    `fit=${input.fitScore}`,
    `intent=${input.intentScore}`,
    `engagement=${input.engagementScore}`,
    `relationship=${input.relationshipScore}`,
    `readiness=${input.salesReadinessScore}`,
  ];

  if (signals.length > 0) {
    parts.push(`signals=${signals.join(",")}`);
  }

  return parts.join(" | ");
}

export function scoreLead(input: LeadScoreInput): ScoreResult {
  const fitScore = clampScore(input.fitScore);
  const intentScore = clampScore(input.intentScore);
  const engagementScore = clampScore(input.engagementScore);
  const relationshipScore = clampScore(input.relationshipScore);
  const salesReadinessScore = clampScore(input.salesReadinessScore);

  const score = clampScore(
    fitScore * (SCORE_WEIGHTS.fit / 100) +
      intentScore * (SCORE_WEIGHTS.intent / 100) +
      engagementScore * (SCORE_WEIGHTS.engagement / 100) +
      relationshipScore * (SCORE_WEIGHTS.relationship / 100) +
      salesReadinessScore * (SCORE_WEIGHTS.salesReadiness / 100)
  );

  const signals = buildSignals({
    ...input,
    fitScore,
    intentScore,
    engagementScore,
    relationshipScore,
    salesReadinessScore,
  });

  const intentSignals: IntentSignals = {
    fitScore,
    intentScore,
    engagementScore,
    relationshipScore,
    salesReadinessScore,
    priorityScore: score,
    points: {
      fit: Math.round(fitScore * (SCORE_WEIGHTS.fit / 100)),
      intent: Math.round(intentScore * (SCORE_WEIGHTS.intent / 100)),
      engagement: Math.round(
        engagementScore * (SCORE_WEIGHTS.engagement / 100)
      ),
      relationship: Math.round(
        relationshipScore * (SCORE_WEIGHTS.relationship / 100)
      ),
      salesReadiness: Math.round(
        salesReadinessScore * (SCORE_WEIGHTS.salesReadiness / 100)
      ),
    },
    signals,
  };

  return {
    score,
    intentSignals,
    primaryObjection: resolvePrimaryObjection(input),
    escalationStatus: resolveEscalationStatus(score, input),
    nextAction: resolveNextAction(score, input),
    modelVersion: MODEL_VERSION,
    reason: buildReason(score, input, signals),
  };
}

export function parseLeadScoreInput(body: unknown): LeadScoreInput {
  if (!isRecord(body)) {
    throw new Error("Request body must be an object");
  }

  return {
    fitScore: parseScore(body.fitScore ?? 0, "fitScore"),
    intentScore: parseScore(body.intentScore ?? 0, "intentScore"),
    engagementScore: parseScore(
      body.engagementScore ?? 0,
      "engagementScore"
    ),
    relationshipScore: parseScore(
      body.relationshipScore ?? 0,
      "relationshipScore"
    ),
    salesReadinessScore: parseScore(
      body.salesReadinessScore ?? 0,
      "salesReadinessScore"
    ),

    companyName: stringValue(body.companyName) ?? undefined,
    industry: stringValue(body.industry),
    employeeCount:
      typeof body.employeeCount === "number" ? body.employeeCount : null,
    jobTitle: stringValue(body.jobTitle),
    department: stringValue(body.department),
    seniority: stringValue(body.seniority),

    intentSignals: body.intentSignals,
    researchFindings: body.researchFindings,
    relationshipSignals: body.relationshipSignals,
    engagementSignals: body.engagementSignals,

    decisionMaker: boolValue(body.decisionMaker) ?? undefined,
    decisionMakerDistance:
      typeof body.decisionMakerDistance === "number"
        ? body.decisionMakerDistance
        : undefined,
    existingRelationship:
      boolValue(body.existingRelationship) ?? undefined,
    replyReceived: boolValue(body.replyReceived) ?? undefined,
    meetingRequested: boolValue(body.meetingRequested) ?? undefined,
    meetingScheduled: boolValue(body.meetingScheduled) ?? undefined,

    primaryObjection: stringValue(body.primaryObjection),
    nextAction: stringValue(body.nextAction),
  };
}

export function parseOptionalLeadId(body: unknown): string | null {
  if (!isRecord(body)) return null;

  const value = body.leadId;

  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new Error("leadId must be a valid UUID");
  }

  return value;
}
