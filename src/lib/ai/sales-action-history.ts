import type { ActionPriority, ActionType } from "@/lib/ai/sales-actions";
import type { DealLostReason, DealStatus } from "@/lib/ai/deal";

export const SALES_ACTION_OPERATIONS = [
  "proposal_ready",
  "proposal_sent",
  "awaiting_response",
  "negotiating",
  "won",
  "lost",
  "manual_stop",
  "followup_created",
  "action_executed",
] as const;

export type SalesActionOperation = (typeof SALES_ACTION_OPERATIONS)[number];
export type SalesActionResult = "executed" | "duplicate";

export interface SalesActionEvent {
  id: string;
  leadId: string;
  dealId: string | null;
  actionType: ActionType | null;
  priority: ActionPriority | null;
  operation: SalesActionOperation;
  actionContent: string | null;
  previousStatus: string | null;
  nextStatus: string | null;
  result: SalesActionResult;
  executedBy: string;
  executedAt: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  idempotencyKey: string;
}

export interface SalesActionEventDraft {
  leadId: string;
  dealId?: string | null;
  actionType?: ActionType | null;
  priority?: ActionPriority | null;
  operation: SalesActionOperation;
  actionContent?: string | null;
  previousStatus?: string | null;
  nextStatus?: string | null;
  result?: SalesActionResult;
  executedBy?: string | null;
  executedAt?: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
  newId?: string;
}

export interface SalesActivityCounts {
  pending: number;
  executedToday: number;
  stoppedToday: number;
  wonToday: number;
  lostToday: number;
}

export function isSalesActionOperation(
  value: unknown
): value is SalesActionOperation {
  return (
    typeof value === "string" &&
    (SALES_ACTION_OPERATIONS as readonly string[]).includes(value)
  );
}

export function normalizeExecutedBy(value: unknown): string {
  if (typeof value !== "string") return "admin";
  const trimmed = value.trim().replace(/[\u0000-\u001f]/g, "").slice(0, 120);
  return trimmed.length > 0 ? trimmed : "admin";
}

export function parseOptionalIdempotencyKey(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 200);
  return trimmed.length > 0 ? trimmed : null;
}

export function buildIdempotencyKey(input: {
  operation: SalesActionOperation;
  previousStatus?: string | null;
  nextStatus?: string | null;
  lostReason?: string | null;
  actionType?: string | null;
  priority?: string | null;
  sequenceNumber?: number | null;
  provided?: string | null;
}): string {
  if (input.provided) return input.provided;
  switch (input.operation) {
    case "manual_stop":
      return "manual_stop";
    case "followup_created":
      return `followup_created:${input.sequenceNumber ?? 1}`;
    case "action_executed":
      return `action_executed:${input.actionType ?? "none"}:${input.priority ?? "none"}:${input.nextStatus ?? "none"}`;
    default:
      return `deal-status:${input.previousStatus ?? "none"}:${input.nextStatus ?? input.operation}:${input.lostReason ?? ""}`;
  }
}

export function isDealSnapshotUnchanged(input: {
  previousStatus: string | null;
  nextStatus: string | null;
  previousLostReason?: string | null;
  nextLostReason?: string | null;
  previousFollowupAt?: string | null;
  nextFollowupAt?: string | null;
}): boolean {
  return (
    input.previousStatus === input.nextStatus &&
    (input.previousLostReason ?? null) === (input.nextLostReason ?? null) &&
    (input.previousFollowupAt ?? null) === (input.nextFollowupAt ?? null)
  );
}

export function buildSalesActionEvent(
  draft: SalesActionEventDraft,
  now: Date = new Date()
): SalesActionEvent {
  const executedAt = draft.executedAt ?? now.toISOString();
  const idempotencyKey = buildIdempotencyKey({
    operation: draft.operation,
    previousStatus: draft.previousStatus,
    nextStatus: draft.nextStatus,
    lostReason:
      typeof draft.metadata?.lostReason === "string"
        ? draft.metadata.lostReason
        : draft.reason,
    actionType: draft.actionType,
    priority: draft.priority,
    sequenceNumber:
      typeof draft.metadata?.sequenceNumber === "number"
        ? draft.metadata.sequenceNumber
        : null,
    provided: draft.idempotencyKey,
  });

  return {
    id: draft.newId ?? crypto.randomUUID(),
    leadId: draft.leadId,
    dealId: draft.dealId ?? null,
    actionType: draft.actionType ?? null,
    priority: draft.priority ?? null,
    operation: draft.operation,
    actionContent: draft.actionContent ?? null,
    previousStatus: draft.previousStatus ?? null,
    nextStatus: draft.nextStatus ?? null,
    result: draft.result ?? "executed",
    executedBy: normalizeExecutedBy(draft.executedBy),
    executedAt,
    reason: draft.reason ?? null,
    metadata: draft.metadata ?? {},
    idempotencyKey,
  };
}

export function findDuplicateEvent(
  existing: SalesActionEvent[],
  draft: Pick<SalesActionEvent, "leadId" | "idempotencyKey">
): SalesActionEvent | null {
  return (
    existing.find(
      (row) =>
        row.leadId === draft.leadId && row.idempotencyKey === draft.idempotencyKey
    ) ?? null
  );
}

export function resolveHistoryWrite(
  existing: SalesActionEvent[],
  draftInput: SalesActionEventDraft,
  now: Date = new Date()
): { event: SalesActionEvent; duplicate: boolean } {
  const event = buildSalesActionEvent(draftInput, now);
  const found = findDuplicateEvent(existing, event);
  if (found) {
    return { event: { ...found, result: "duplicate" }, duplicate: true };
  }
  return { event, duplicate: false };
}

export function utcDayBounds(now: Date = new Date()): {
  fromInclusive: string;
  toExclusive: string;
} {
  const start = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  return {
    fromInclusive: new Date(start).toISOString(),
    toExclusive: new Date(start + 86_400_000).toISOString(),
  };
}

export function isTimestampInUtcDay(
  timestamp: string,
  now: Date = new Date()
): boolean {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return false;
  const { fromInclusive, toExclusive } = utcDayBounds(now);
  return parsed >= Date.parse(fromInclusive) && parsed < Date.parse(toExclusive);
}

export function countSalesActivity(input: {
  pending: number;
  events: Array<Pick<SalesActionEvent, "operation" | "result" | "executedAt">>;
  now?: Date;
}): SalesActivityCounts {
  const now = input.now ?? new Date();
  const today = input.events.filter(
    (event) =>
      event.result === "executed" && isTimestampInUtcDay(event.executedAt, now)
  );
  return {
    pending: input.pending,
    executedToday: today.length,
    stoppedToday: today.filter((event) => event.operation === "manual_stop").length,
    wonToday: today.filter((event) => event.operation === "won").length,
    lostToday: today.filter((event) => event.operation === "lost").length,
  };
}

export function salesActionEventToRow(
  event: SalesActionEvent
): Record<string, unknown> {
  return {
    id: event.id,
    lead_id: event.leadId,
    deal_id: event.dealId,
    action_type: event.actionType,
    priority: event.priority,
    operation: event.operation,
    action_content: event.actionContent,
    previous_status: event.previousStatus,
    next_status: event.nextStatus,
    result: event.result,
    executed_by: event.executedBy,
    executed_at: event.executedAt,
    reason: event.reason,
    metadata: event.metadata,
    idempotency_key: event.idempotencyKey,
  };
}

export function parseSalesActionEventRow(row: unknown): SalesActionEvent | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  if (typeof value.id !== "string" || typeof value.lead_id !== "string") {
    return null;
  }
  if (!isSalesActionOperation(value.operation)) return null;
  const result = value.result === "duplicate" ? "duplicate" : "executed";
  return {
    id: value.id,
    leadId: value.lead_id,
    dealId: typeof value.deal_id === "string" ? value.deal_id : null,
    actionType: isActionType(value.action_type) ? value.action_type : null,
    priority: isPriority(value.priority) ? value.priority : null,
    operation: value.operation,
    actionContent:
      typeof value.action_content === "string" ? value.action_content : null,
    previousStatus:
      typeof value.previous_status === "string" ? value.previous_status : null,
    nextStatus: typeof value.next_status === "string" ? value.next_status : null,
    result,
    executedBy:
      typeof value.executed_by === "string" && value.executed_by.trim()
        ? value.executed_by
        : "admin",
    executedAt:
      typeof value.executed_at === "string"
        ? value.executed_at
        : typeof value.created_at === "string"
          ? value.created_at
          : new Date().toISOString(),
    reason: typeof value.reason === "string" ? value.reason : null,
    metadata:
      value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)
        ? (value.metadata as Record<string, unknown>)
        : {},
    idempotencyKey:
      typeof value.idempotency_key === "string" ? value.idempotency_key : value.id,
  };
}

function isActionType(value: unknown): value is ActionType {
  return (
    value === "HOT_HANDOFF" ||
    value === "PROPOSAL_WAITING" ||
    value === "NEGOTIATION" ||
    value === "FOLLOWUP_DUE" ||
    value === "WARM_REVIEW" ||
    value === "NURTURE"
  );
}

function isPriority(value: unknown): value is ActionPriority {
  return value === "P0" || value === "P1" || value === "P2" || value === "P3";
}

export function apiSalesActionEvent(event: SalesActionEvent) {
  return {
    id: event.id,
    leadId: event.leadId,
    dealId: event.dealId,
    actionType: event.actionType,
    priority: event.priority,
    operation: event.operation,
    actionContent: event.actionContent,
    previousStatus: event.previousStatus,
    nextStatus: event.nextStatus,
    result: event.result,
    executedBy: event.executedBy,
    executedAt: event.executedAt,
    reason: event.reason,
    metadata: event.metadata,
  };
}

export type { DealLostReason, DealStatus };
