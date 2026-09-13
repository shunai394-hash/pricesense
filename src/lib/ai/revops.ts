import { OBJECTION_TYPES, type ObjectionType } from "./objections";
import type { DealLostReason, DealStatus } from "./deal";

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const LOST_REASON_KEYS: DealLostReason[] = [
  "price",
  "competitor",
  "timing",
  "budget",
  "no_need",
  "internal_approval",
  "unknown",
];

export type LeadTemperature = "hot" | "warm" | "nurture";

export interface RevopsDateRange {
  from: string | null;
  to: string | null;
  fromInclusive: string | null;
  toExclusive: string | null;
  timezone: "UTC";
}

export interface RevopsLeadRow {
  id: string;
  lead_source: string | null;
  score: number | null;
  escalation_status: string | null;
  created_at: string;
}

export interface RevopsIdLeadRow {
  id: string;
  lead_id: string;
  created_at: string;
}

export interface RevopsProposalRow extends RevopsIdLeadRow {
  meeting_id: string | null;
}

export interface RevopsDealRow {
  id: string;
  lead_id: string;
  status: string | null;
  expected_value: number | string | null;
  currency: string | null;
  lost_reason: string | null;
  created_at: string;
}

export interface RevopsObjectionRow {
  id: string;
  lead_id: string | null;
  objection_type: string | null;
  response_play: string | null;
  created_at: string;
}

export interface RevopsSnapshot {
  leads: RevopsLeadRow[];
  handoffs: RevopsIdLeadRow[];
  meetings: RevopsIdLeadRow[];
  proposals: RevopsProposalRow[];
  deals: RevopsDealRow[];
  objections: RevopsObjectionRow[];
  /** lead_id → source for rows whose lead was created outside the selected period */
  leadSourceById?: Record<string, string | null | undefined>;
}

export interface RevopsKpis {
  leads: number;
  hotLeads: number;
  warmLeads: number;
  nurtureLeads: number;
  handoffs: number;
  meetings: number;
  proposals: number;
  deals: number;
  won: number;
  lost: number;
  awaitingResponse: number;
  negotiating: number;
  conversionRates: {
    leadToHandoff: number;
    handoffToMeeting: number;
    meetingToProposal: number;
    proposalToWon: number;
    leadToWon: number;
  };
}

export interface RevopsFunnelStage {
  stage: string;
  label: string;
  count: number;
  conversionRate: number;
}

export interface RevopsLossReason {
  reason: DealLostReason;
  count: number;
  share: number;
}

export interface RevopsObjectionStat {
  objectionType: ObjectionType;
  count: number;
  responseCount: number;
}

export interface RevopsLeadSourceStat {
  source: string;
  leads: number;
  handoffs: number;
  meetings: number;
  proposals: number;
  won: number;
  lost: number;
  wonRate: number;
}

export interface RevopsCurrencyValue {
  currency: string;
  totalExpectedValue: number;
  wonExpectedValue: number;
  pipelineExpectedValue: number;
  averageWonValue: number;
}

export interface RevopsDealValue {
  currencies: RevopsCurrencyValue[];
}

export interface RevopsReport {
  kpis: RevopsKpis;
  funnel: RevopsFunnelStage[];
  lossReasons: RevopsLossReason[];
  objections: RevopsObjectionStat[];
  leadSources: RevopsLeadSourceStat[];
  dealValue: RevopsDealValue;
  period: RevopsDateRange;
}

export type ParseRevopsRangeResult =
  | { ok: true; range: RevopsDateRange }
  | { ok: false; error: string };

function utcDayStart(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function isValidUtcDateParts(year: number, month: number, day: number): boolean {
  const date = utcDayStart(year, month, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Calendar dates are UTC.
 * `from=YYYY-MM-DD` → created_at >= YYYY-MM-DDT00:00:00.000Z
 * `to=YYYY-MM-DD`   → created_at <  nextDayT00:00:00.000Z (end of `to` inclusive)
 * Future dates are allowed. Missing from/to = all time.
 */
export function parseRevopsRange(
  fromRaw: string | null | undefined,
  toRaw: string | null | undefined
): ParseRevopsRangeResult {
  const from = fromRaw?.trim() || null;
  const to = toRaw?.trim() || null;

  if (from && !DATE_ONLY_RE.test(from)) {
    return { ok: false, error: "Invalid from date. Use YYYY-MM-DD." };
  }
  if (to && !DATE_ONLY_RE.test(to)) {
    return { ok: false, error: "Invalid to date. Use YYYY-MM-DD." };
  }

  let fromInclusive: string | null = null;
  let toExclusive: string | null = null;

  if (from) {
    const match = from.match(DATE_ONLY_RE);
    if (!match) {
      return { ok: false, error: "Invalid from date. Use YYYY-MM-DD." };
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!isValidUtcDateParts(year, month, day)) {
      return { ok: false, error: "Invalid from date. Use YYYY-MM-DD." };
    }
    fromInclusive = utcDayStart(year, month, day).toISOString();
  }

  if (to) {
    const match = to.match(DATE_ONLY_RE);
    if (!match) {
      return { ok: false, error: "Invalid to date. Use YYYY-MM-DD." };
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!isValidUtcDateParts(year, month, day)) {
      return { ok: false, error: "Invalid to date. Use YYYY-MM-DD." };
    }
    toExclusive = utcDayStart(year, month, day + 1).toISOString();
  }

  return {
    ok: true,
    range: {
      from,
      to,
      fromInclusive,
      toExclusive,
      timezone: "UTC",
    },
  };
}

export function conversionRate(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function classifyLeadTemperature(lead: {
  score?: number | null;
  escalation_status?: string | null;
}): LeadTemperature {
  const score =
    typeof lead.score === "number" && Number.isFinite(lead.score) ? lead.score : null;
  const status = lead.escalation_status ?? null;

  if (status === "handed_off" || (score !== null && score >= 80)) {
    return "hot";
  }
  if (status === "pending_human" || (score !== null && score >= 61)) {
    return "warm";
  }
  return "nurture";
}

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const row of rows) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    unique.push(row);
  }
  return unique;
}

export function isCreatedAtInRange(
  createdAt: string,
  range: RevopsDateRange | null | undefined
): boolean {
  if (!range || (!range.fromInclusive && !range.toExclusive)) {
    return true;
  }
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) return false;
  if (range.fromInclusive) {
    const from = Date.parse(range.fromInclusive);
    if (!Number.isNaN(from) && timestamp < from) return false;
  }
  if (range.toExclusive) {
    const to = Date.parse(range.toExclusive);
    if (!Number.isNaN(to) && timestamp >= to) return false;
  }
  return true;
}

function filterRows<T extends { created_at: string }>(
  rows: T[],
  range: RevopsDateRange | null | undefined
): T[] {
  if (!range || (!range.fromInclusive && !range.toExclusive)) {
    return rows;
  }
  return rows.filter((row) => isCreatedAtInRange(row.created_at, range));
}

function parseExpectedValue(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSource(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "unknown";
}

function isDealStatusValue(value: string | null | undefined): value is DealStatus {
  return (
    value === "proposal_ready" ||
    value === "proposal_sent" ||
    value === "awaiting_response" ||
    value === "negotiating" ||
    value === "won" ||
    value === "lost"
  );
}

function normalizeLostReason(value: string | null | undefined): DealLostReason {
  if (
    value === "price" ||
    value === "competitor" ||
    value === "timing" ||
    value === "budget" ||
    value === "no_need" ||
    value === "internal_approval" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function emptyPeriod(): RevopsDateRange {
  return {
    from: null,
    to: null,
    fromInclusive: null,
    toExclusive: null,
    timezone: "UTC",
  };
}

export function buildRevopsReport(
  snapshot: RevopsSnapshot,
  range?: RevopsDateRange | null
): RevopsReport {
  const period = range ?? emptyPeriod();
  const leads = uniqueById(filterRows(snapshot.leads, period));
  const handoffs = uniqueById(filterRows(snapshot.handoffs, period));
  const meetings = uniqueById(filterRows(snapshot.meetings, period));
  const proposals = uniqueById(filterRows(snapshot.proposals, period));
  const deals = uniqueById(filterRows(snapshot.deals, period));
  const objections = uniqueById(filterRows(snapshot.objections, period));

  let hotLeads = 0;
  let warmLeads = 0;
  let nurtureLeads = 0;
  for (const lead of leads) {
    const band = classifyLeadTemperature(lead);
    if (band === "hot") hotLeads += 1;
    else if (band === "warm") warmLeads += 1;
    else nurtureLeads += 1;
  }

  const wonDeals = deals.filter((deal) => deal.status === "won");
  const lostDeals = deals.filter((deal) => deal.status === "lost");
  const awaitingResponse = deals.filter((deal) => deal.status === "awaiting_response").length;
  const negotiating = deals.filter((deal) => deal.status === "negotiating").length;
  const pipelineOrAwaiting = deals.filter(
    (deal) => deal.status === "negotiating" || deal.status === "awaiting_response"
  ).length;

  const kpis: RevopsKpis = {
    leads: leads.length,
    hotLeads,
    warmLeads,
    nurtureLeads,
    handoffs: handoffs.length,
    meetings: meetings.length,
    proposals: proposals.length,
    deals: deals.length,
    won: wonDeals.length,
    lost: lostDeals.length,
    awaitingResponse,
    negotiating,
    conversionRates: {
      leadToHandoff: conversionRate(handoffs.length, leads.length),
      handoffToMeeting: conversionRate(meetings.length, handoffs.length),
      meetingToProposal: conversionRate(proposals.length, meetings.length),
      proposalToWon: conversionRate(wonDeals.length, proposals.length),
      leadToWon: conversionRate(wonDeals.length, leads.length),
    },
  };

  const funnelCounts = [
    { stage: "lead", label: "Lead", count: leads.length },
    { stage: "handoff", label: "HOT / Human Handoff", count: handoffs.length },
    { stage: "meeting", label: "Meeting", count: meetings.length },
    { stage: "proposal", label: "Proposal", count: proposals.length },
    {
      stage: "negotiating_or_awaiting",
      label: "Negotiating / Awaiting Response",
      count: pipelineOrAwaiting,
    },
    { stage: "won", label: "Won", count: wonDeals.length },
  ];

  const funnel: RevopsFunnelStage[] = funnelCounts.map((stage, index) => {
    if (stage.stage === "won") {
      return {
        ...stage,
        conversionRate: conversionRate(stage.count, proposals.length),
      };
    }
    if (index === 0) {
      return {
        ...stage,
        conversionRate: stage.count > 0 ? 100 : 0,
      };
    }
    return {
      ...stage,
      conversionRate: conversionRate(stage.count, funnelCounts[index - 1].count),
    };
  });

  const lostByReason = new Map<DealLostReason, number>(
    LOST_REASON_KEYS.map((reason) => [reason, 0])
  );
  for (const deal of lostDeals) {
    const reason = normalizeLostReason(deal.lost_reason);
    lostByReason.set(reason, (lostByReason.get(reason) ?? 0) + 1);
  }
  const lossReasons: RevopsLossReason[] = LOST_REASON_KEYS.map((reason) => ({
    reason,
    count: lostByReason.get(reason) ?? 0,
    share: conversionRate(lostByReason.get(reason) ?? 0, lostDeals.length),
  })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));

  const objectionCount = new Map<ObjectionType, { count: number; responseCount: number }>();
  for (const type of OBJECTION_TYPES) {
    objectionCount.set(type, { count: 0, responseCount: 0 });
  }
  for (const event of objections) {
    if (!OBJECTION_TYPES.includes(event.objection_type as ObjectionType)) {
      continue;
    }
    const type = event.objection_type as ObjectionType;
    const current = objectionCount.get(type) ?? { count: 0, responseCount: 0 };
    current.count += 1;
    if (event.response_play && event.response_play.trim()) {
      current.responseCount += 1;
    }
    objectionCount.set(type, current);
  }
  const objectionsStats: RevopsObjectionStat[] = OBJECTION_TYPES.map((objectionType) => {
    const current = objectionCount.get(objectionType) ?? { count: 0, responseCount: 0 };
    return {
      objectionType,
      count: current.count,
      responseCount: current.responseCount,
    };
  }).sort((a, b) => b.count - a.count || a.objectionType.localeCompare(b.objectionType));

  const sourceLookup: Record<string, string> = {};
  for (const [leadId, source] of Object.entries(snapshot.leadSourceById ?? {})) {
    sourceLookup[leadId] = normalizeSource(source);
  }
  for (const lead of leads) {
    sourceLookup[lead.id] = normalizeSource(lead.lead_source);
  }

  function sourceOf(leadId: string | null | undefined): string {
    if (!leadId) return "unknown";
    return sourceLookup[leadId] ?? "unknown";
  }

  const sourceStats = new Map<string, RevopsLeadSourceStat>();
  function sourceBucket(source: string): RevopsLeadSourceStat {
    const existing = sourceStats.get(source);
    if (existing) return existing;
    const created: RevopsLeadSourceStat = {
      source,
      leads: 0,
      handoffs: 0,
      meetings: 0,
      proposals: 0,
      won: 0,
      lost: 0,
      wonRate: 0,
    };
    sourceStats.set(source, created);
    return created;
  }

  for (const lead of leads) {
    sourceBucket(sourceOf(lead.id)).leads += 1;
  }
  for (const row of handoffs) {
    sourceBucket(sourceOf(row.lead_id)).handoffs += 1;
  }
  for (const row of meetings) {
    sourceBucket(sourceOf(row.lead_id)).meetings += 1;
  }
  for (const row of proposals) {
    sourceBucket(sourceOf(row.lead_id)).proposals += 1;
  }
  for (const deal of deals) {
    const bucket = sourceBucket(sourceOf(deal.lead_id));
    if (deal.status === "won") bucket.won += 1;
    if (deal.status === "lost") bucket.lost += 1;
  }

  const leadSources = [...sourceStats.values()]
    .map((row) => ({
      ...row,
      wonRate: conversionRate(row.won, row.leads),
    }))
    .sort((a, b) => b.leads - a.leads || a.source.localeCompare(b.source));

  const valueByCurrency = new Map<
    string,
    { total: number; won: number; pipeline: number; wonCount: number }
  >();

  for (const deal of deals) {
    const amount = parseExpectedValue(deal.expected_value);
    if (amount === null) continue;
    const currency = deal.currency?.trim() ? deal.currency.trim() : "unknown";
    const bucket = valueByCurrency.get(currency) ?? {
      total: 0,
      won: 0,
      pipeline: 0,
      wonCount: 0,
    };
    bucket.total += amount;
    if (deal.status === "won") {
      bucket.won += amount;
      bucket.wonCount += 1;
    } else if (isDealStatusValue(deal.status) && deal.status !== "lost") {
      bucket.pipeline += amount;
    }
    valueByCurrency.set(currency, bucket);
  }

  const currencies: RevopsCurrencyValue[] = [...valueByCurrency.entries()]
    .map(([currency, bucket]) => ({
      currency,
      totalExpectedValue: bucket.total,
      wonExpectedValue: bucket.won,
      pipelineExpectedValue: bucket.pipeline,
      averageWonValue: bucket.wonCount > 0 ? bucket.won / bucket.wonCount : 0,
    }))
    .sort((a, b) => {
      if (a.currency === "unknown") return 1;
      if (b.currency === "unknown") return -1;
      return a.currency.localeCompare(b.currency);
    });

  return {
    kpis,
    funnel,
    lossReasons,
    objections: objectionsStats,
    leadSources,
    dealValue: { currencies },
    period,
  };
}
