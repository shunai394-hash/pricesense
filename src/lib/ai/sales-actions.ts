import {
  emptyDealState,
  isDealStatus,
  nextActionForStatus,
  parseDealState,
  probabilityForStatus,
  type DealLostReason,
  type DealStatus,
  type SalesDealState,
} from "@/lib/ai/deal";
import type { ConversationMessage } from "@/lib/ai/respond";

export const ACTION_TYPES = [
  "HOT_HANDOFF",
  "PROPOSAL_WAITING",
  "NEGOTIATION",
  "FOLLOWUP_DUE",
  "WARM_REVIEW",
  "NURTURE",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];
export type ActionPriority = "P0" | "P1" | "P2" | "P3";

export const DEAL_LOST_REASONS: DealLostReason[] = [
  "price",
  "competitor",
  "timing",
  "budget",
  "no_need",
  "internal_approval",
  "unknown",
];

export const ACTION_TYPE_RANK: Record<ActionType, number> = {
  NEGOTIATION: 0,
  FOLLOWUP_DUE: 1,
  HOT_HANDOFF: 2,
  PROPOSAL_WAITING: 3,
  WARM_REVIEW: 4,
  NURTURE: 5,
};

export const PRIORITY_RANK: Record<ActionPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

export const ACTION_REASON: Record<ActionType, string> = {
  HOT_HANDOFF: "HOT / Human Handoff済みで未対応",
  PROPOSAL_WAITING: "提案済みで返信待ち",
  NEGOTIATION: "negotiating中",
  FOLLOWUP_DUE: "follow-up期限到来",
  WARM_REVIEW: "WARM / pending_human の確認が必要",
  NURTURE: "nurture対象",
};

const ACTION_FALLBACK_NEXT: Record<ActionType, string> = {
  HOT_HANDOFF: "HOTリードの引き継ぎに対応する",
  PROPOSAL_WAITING: "提案への返信を確認する",
  NEGOTIATION: "条件・懸念を整理する。値引きや未提示価格は約束しない",
  FOLLOWUP_DUE: "期限到来のフォローを実施する",
  WARM_REVIEW: "WARMリードの状況を確認する",
  NURTURE: "nurtureを継続する",
};

export interface SalesActionSource {
  leadId: string;
  dealId: string | null;
  score: number | null;
  leadStatus: string | null;
  dealStatus: string | null;
  nextAction: string | null;
  nextFollowupAt: string | null;
  lastActivityAt: string | null;
  email?: string | null;
  categoryName?: string | null;
  leadSource?: string | null;
}

export interface SalesAction {
  leadId: string;
  dealId: string | null;
  score: number | null;
  leadStatus: string | null;
  dealStatus: string | null;
  priority: ActionPriority;
  actionType: ActionType;
  nextAction: string;
  nextFollowupAt: string | null;
  lastActivityAt: string | null;
  reason: string;
  email: string | null;
  categoryName: string | null;
  leadSource: string | null;
}

export interface SalesActionCounts {
  total: number;
  P0: number;
  P1: number;
  P2: number;
  P3: number;
}

export function isDealLostReason(value: unknown): value is DealLostReason {
  return (
    value === "price" ||
    value === "competitor" ||
    value === "timing" ||
    value === "budget" ||
    value === "no_need" ||
    value === "internal_approval" ||
    value === "unknown"
  );
}

export function parseDealLostReason(
  value: unknown
): DealLostReason | "invalid" | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isDealLostReason(trimmed) ? trimmed : "invalid";
}

function finiteScore(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function isClosedDealStatus(status: string | null | undefined): boolean {
  return status === "won" || status === "lost";
}

export function isFollowupDueAt(
  nextFollowupAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!nextFollowupAt) return false;
  const due = Date.parse(nextFollowupAt);
  if (Number.isNaN(due)) return false;
  return due <= now.getTime();
}

export function effectiveNextFollowupAt(input: {
  dealNextFollowupAt?: string | null;
  hasDeal: boolean;
  leadNextFollowupAt?: string | null;
  leadFollowupStopped?: boolean;
}): string | null {
  if (input.hasDeal) {
    return input.dealNextFollowupAt ?? null;
  }
  if (input.leadFollowupStopped) return null;
  return input.leadNextFollowupAt ?? null;
}

export function matchingActionTypes(source: {
  score: number | null;
  leadStatus: string | null;
  dealStatus: string | null;
  nextFollowupAt: string | null;
  now?: Date;
}): ActionType[] {
  const score = finiteScore(source.score);
  const leadStatus = source.leadStatus ?? null;
  const dealStatus = source.dealStatus ?? null;
  const matched: ActionType[] = [];

  if (score !== null && score >= 80 && leadStatus === "handed_off") {
    matched.push("HOT_HANDOFF");
  }
  if (dealStatus === "proposal_sent" || dealStatus === "awaiting_response") {
    matched.push("PROPOSAL_WAITING");
  }
  if (dealStatus === "negotiating") {
    matched.push("NEGOTIATION");
  }
  if (isFollowupDueAt(source.nextFollowupAt, source.now ?? new Date())) {
    matched.push("FOLLOWUP_DUE");
  }
  if (
    (score !== null && score >= 61 && score <= 79) ||
    leadStatus === "pending_human"
  ) {
    matched.push("WARM_REVIEW");
  }
  if (score === null || score <= 60 || leadStatus === "ai_handling") {
    matched.push("NURTURE");
  }

  return matched;
}

export function selectPrimaryActionType(types: ActionType[]): ActionType | null {
  if (types.length === 0) return null;
  return [...types].sort(
    (a, b) => ACTION_TYPE_RANK[a] - ACTION_TYPE_RANK[b]
  )[0];
}

export function priorityForActionType(actionType: ActionType): ActionPriority {
  switch (actionType) {
    case "HOT_HANDOFF":
    case "NEGOTIATION":
    case "FOLLOWUP_DUE":
      return "P0";
    case "PROPOSAL_WAITING":
      return "P1";
    case "WARM_REVIEW":
      return "P2";
    case "NURTURE":
      return "P3";
  }
}

export function classifySalesAction(
  source: SalesActionSource,
  now: Date = new Date()
): SalesAction | null {
  if (isClosedDealStatus(source.dealStatus)) return null;

  const types = matchingActionTypes({
    score: source.score,
    leadStatus: source.leadStatus,
    dealStatus: source.dealStatus,
    nextFollowupAt: source.nextFollowupAt,
    now,
  });
  const actionType = selectPrimaryActionType(types);
  if (!actionType) return null;

  const nextAction =
    source.nextAction?.trim() || ACTION_FALLBACK_NEXT[actionType];

  return {
    leadId: source.leadId,
    dealId: source.dealId,
    score: finiteScore(source.score),
    leadStatus: source.leadStatus,
    dealStatus: source.dealStatus,
    priority: priorityForActionType(actionType),
    actionType,
    nextAction,
    nextFollowupAt: source.nextFollowupAt,
    lastActivityAt: source.lastActivityAt,
    reason: ACTION_REASON[actionType],
    email: source.email ?? null,
    categoryName: source.categoryName ?? null,
    leadSource: source.leadSource ?? null,
  };
}

function followupSortKey(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

export function compareSalesActions(a: SalesAction, b: SalesAction): number {
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;
  const aFollow = followupSortKey(a.nextFollowupAt);
  const bFollow = followupSortKey(b.nextFollowupAt);
  if (aFollow !== bFollow) return aFollow - bFollow;
  const aActivity = followupSortKey(a.lastActivityAt);
  const bActivity = followupSortKey(b.lastActivityAt);
  if (aActivity !== bActivity) return aActivity - bActivity;
  return a.leadId.localeCompare(b.leadId);
}

export function buildSalesActions(
  sources: SalesActionSource[],
  now: Date = new Date()
): SalesAction[] {
  const actions: SalesAction[] = [];
  for (const source of sources) {
    const action = classifySalesAction(source, now);
    if (action) actions.push(action);
  }
  return actions.sort(compareSalesActions);
}

export function countSalesActions(actions: SalesAction[]): SalesActionCounts {
  const counts: SalesActionCounts = {
    total: actions.length,
    P0: 0,
    P1: 0,
    P2: 0,
    P3: 0,
  };
  for (const action of actions) {
    counts[action.priority] += 1;
  }
  return counts;
}

export function lastActivityAt(timestamps: Array<string | null | undefined>): string | null {
  let latest: number | null = null;
  let latestIso: string | null = null;
  for (const value of timestamps) {
    if (!value) continue;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) continue;
    if (latest === null || parsed > latest) {
      latest = parsed;
      latestIso = value;
    }
  }
  return latestIso;
}

export function lastConversationAt(conversation: ConversationMessage[]): string | null {
  for (let i = conversation.length - 1; i >= 0; i -= 1) {
    const createdAt = conversation[i]?.createdAt;
    if (createdAt) return createdAt;
  }
  return null;
}

export function applyDealStatusChange(input: {
  existing: SalesDealState | null;
  leadId: string;
  status: DealStatus;
  lostReason?: DealLostReason | null;
  now?: Date;
  newDealId?: string;
}): SalesDealState {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const base =
    input.existing ??
    emptyDealState({
      id: input.newDealId ?? crypto.randomUUID(),
      leadId: input.leadId,
    });

  const status = input.status;
  const lost_reason =
    status === "lost" ? (input.lostReason ?? "unknown") : null;

  return {
    ...base,
    lead_id: input.leadId,
    status,
    probability: probabilityForStatus(status),
    next_action: nextActionForStatus(status),
    next_followup_at:
      status === "won" || status === "lost" ? null : base.next_followup_at,
    lost_reason,
    won_at: status === "won" ? (base.won_at ?? nowIso) : null,
    lost_at: status === "lost" ? (base.lost_at ?? nowIso) : null,
  };
}

export function applyDealStop(deal: SalesDealState): SalesDealState {
  return {
    ...deal,
    next_followup_at: null,
  };
}

export function dealRowFromState(
  deal: SalesDealState,
  updatedAt: string
): Record<string, unknown> {
  return {
    id: deal.id,
    lead_id: deal.lead_id,
    meeting_id: deal.meeting_id,
    proposal_id: deal.proposal_id,
    quote_id: deal.quote_id,
    status: deal.status,
    probability: deal.probability,
    expected_value: deal.expected_value,
    currency: deal.currency,
    next_action: deal.next_action,
    next_followup_at: deal.next_followup_at,
    lost_reason: deal.lost_reason,
    won_at: deal.won_at,
    lost_at: deal.lost_at,
    updated_at: updatedAt,
  };
}

export function parseExistingDeal(
  row: unknown,
  leadId: string
): SalesDealState | null {
  return parseDealState(row, leadId);
}

export { isDealStatus };
