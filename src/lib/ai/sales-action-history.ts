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
export type SalesActionResult = "executed" | "duplicate" | "failed" | "cancelled";
export type SalesActionStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "cancelled";
export type SalesActorKind = "human" | "ai";
export type ExternalDelivery = "none";

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
  status: SalesActionStatus;
  executedBy: string;
  executedAt: string;
  completedAt: string | null;
  createdAt: string;
  error: string | null;
  actorKind: SalesActorKind;
  retryOf: string | null;
  attempt: number;
  externalDelivery: ExternalDelivery;
  approvalRequired: boolean;
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
  status?: SalesActionStatus;
  executedBy?: string | null;
  executedAt?: string;
  completedAt?: string | null;
  error?: string | null;
  actorKind?: SalesActorKind | null;
  retryOf?: string | null;
  attempt?: number;
  externalDelivery?: ExternalDelivery | null;
  approvalRequired?: boolean;
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
  failedToday: number;
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

export function statusFromResult(result: SalesActionResult): SalesActionStatus {
  switch (result) {
    case "duplicate":
      return "skipped";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "succeeded";
  }
}

export function resultFromStatus(status: SalesActionStatus): SalesActionResult {
  switch (status) {
    case "skipped":
      return "duplicate";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "executed";
  }
}

export function isSalesActionStatus(value: unknown): value is SalesActionStatus {
  return (
    value === "pending" ||
    value === "running" ||
    value === "succeeded" ||
    value === "failed" ||
    value === "skipped" ||
    value === "cancelled"
  );
}

export function blocksDuplicateExecution(status: SalesActionStatus): boolean {
  return status === "succeeded" || status === "skipped" || status === "running";
}

export function canRetryAction(status: SalesActionStatus): boolean {
  return status === "failed";
}

export function canCancelAction(status: SalesActionStatus): boolean {
  return status === "failed" || status === "pending" || status === "running";
}

export function retryIdempotencyKey(baseKey: string, nextAttempt: number): string {
  return `${baseKey}:retry:${nextAttempt}`.slice(0, 200);
}

export function normalizeActorKind(value: unknown): SalesActorKind {
  return value === "ai" ? "ai" : "human";
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
  const status =
    draft.status ??
    statusFromResult(draft.result ?? "executed");
  const result = draft.result ?? resultFromStatus(status);
  const terminal =
    status === "pending" || status === "running" ? null : (draft.completedAt ?? executedAt);
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
    result,
    status,
    executedBy: normalizeExecutedBy(draft.executedBy),
    executedAt,
    completedAt: terminal,
    createdAt: executedAt,
    error: draft.error ?? null,
    actorKind: normalizeActorKind(draft.actorKind),
    retryOf: draft.retryOf ?? null,
    attempt: typeof draft.attempt === "number" && draft.attempt > 0 ? draft.attempt : 1,
    externalDelivery: "none",
    approvalRequired: draft.approvalRequired === true,
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
    if (found.status === "failed" || found.status === "cancelled") {
      return { event: found, duplicate: true };
    }
    return {
      event: { ...found, result: "duplicate", status: "skipped" },
      duplicate: true,
    };
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
  events: Array<
    Pick<SalesActionEvent, "operation" | "result" | "executedAt"> &
      Partial<Pick<SalesActionEvent, "status">>
  >;
  now?: Date;
}): SalesActivityCounts {
  const now = input.now ?? new Date();
  const today = input.events.filter(
    (event) =>
      event.result === "executed" && isTimestampInUtcDay(event.executedAt, now)
  );
  const failedToday = input.events.filter(
    (event) =>
      (event.result === "failed" ||
        ("status" in event && event.status === "failed")) &&
      isTimestampInUtcDay(event.executedAt, now)
  ).length;
  return {
    pending: input.pending,
    executedToday: today.length,
    stoppedToday: today.filter((event) => event.operation === "manual_stop").length,
    wonToday: today.filter((event) => event.operation === "won").length,
    lostToday: today.filter((event) => event.operation === "lost").length,
    failedToday,
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
    status: event.status,
    executed_by: event.executedBy,
    executed_at: event.executedAt,
    completed_at: event.completedAt,
    created_at: event.createdAt,
    error: event.error,
    actor_kind: event.actorKind,
    retry_of: event.retryOf,
    attempt: event.attempt,
    external_delivery: event.externalDelivery,
    approval_required: event.approvalRequired,
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
  const result: SalesActionResult =
    value.result === "duplicate"
      ? "duplicate"
      : value.result === "failed"
        ? "failed"
        : value.result === "cancelled"
          ? "cancelled"
          : "executed";
  const status = isSalesActionStatus(value.status)
    ? value.status
    : statusFromResult(result);
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
    status,
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
    createdAt:
      typeof value.created_at === "string"
        ? value.created_at
        : typeof value.executed_at === "string"
          ? value.executed_at
          : new Date().toISOString(),
    completedAt:
      typeof value.completed_at === "string"
        ? value.completed_at
        : status === "pending" || status === "running"
          ? null
          : typeof value.executed_at === "string"
            ? value.executed_at
            : null,
    error: typeof value.error === "string" ? value.error : null,
    actorKind: value.actor_kind === "ai" ? "ai" : "human",
    retryOf: typeof value.retry_of === "string" ? value.retry_of : null,
    attempt:
      typeof value.attempt === "number" && value.attempt > 0 ? value.attempt : 1,
    externalDelivery: "none",
    approvalRequired: value.approval_required === true,
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
    status: event.status,
    executedBy: event.executedBy,
    executedAt: event.executedAt,
    completedAt: event.completedAt,
    createdAt: event.createdAt,
    error: event.error,
    idempotencyKey: event.idempotencyKey,
    actorKind: event.actorKind,
    retryOf: event.retryOf,
    attempt: event.attempt,
    externalDelivery: event.externalDelivery,
    approvalRequired: event.approvalRequired,
    reason: event.reason,
    metadata: event.metadata,
    audit: salesActionAuditTrail(event),
  };
}

export function salesActionAuditTrail(event: SalesActionEvent) {
  return {
    judgment: event.reason ?? event.actionType,
    selectedAction: event.operation,
    approvalRequired: event.approvalRequired,
    actorKind: event.actorKind,
    executed: event.status === "succeeded" || event.status === "skipped",
    status: event.status,
    result: event.result,
    error: event.error,
    retried: Boolean(event.retryOf),
    attempt: event.attempt,
    externalDelivery: event.externalDelivery,
  };
}

export type { DealLostReason, DealStatus };
