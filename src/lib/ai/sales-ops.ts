import {
  blocksDuplicateExecution,
  buildSalesActionEvent,
  canCancelAction,
  canRetryAction,
  retryIdempotencyKey,
  type SalesActionEvent,
  type SalesActionEventDraft,
  type SalesActionStatus,
} from "@/lib/ai/sales-action-history";

export const SALES_ACTION_STATUSES: SalesActionStatus[] = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
  "cancelled",
];

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export function existingExecuteOutcome(existing: SalesActionEvent): {
  kind: "blocked" | "failed_retryable";
} {
  if (canRetryAction(existing.status)) {
    return { kind: "failed_retryable" };
  }
  return { kind: "blocked" };
}

export function shouldBlockDuplicateExecution(status: SalesActionStatus): boolean {
  return blocksDuplicateExecution(status) || status === "cancelled";
}

export function followupAlreadyRecorded(input: {
  operation: string;
  sequenceNumber: number | null;
  latestSequence: number | null;
}): boolean {
  if (input.operation !== "followup_created") return false;
  if (input.sequenceNumber === null) return false;
  return (
    input.latestSequence !== null && input.latestSequence >= input.sequenceNumber
  );
}

export function planRetry(input: {
  original: SalesActionEvent;
  executedBy?: string | null;
  now?: Date;
}):
  | { ok: true; draft: SalesActionEventDraft; nextAttempt: number }
  | { ok: false; error: string } {
  if (!canRetryAction(input.original.status)) {
    return { ok: false, error: "Only failed actions can be retried" };
  }
  const nextAttempt = input.original.attempt + 1;
  const originalKey = input.original.idempotencyKey.replace(/:retry:\d+$/, "");
  const draft: SalesActionEventDraft = {
    leadId: input.original.leadId,
    dealId: input.original.dealId,
    actionType: input.original.actionType,
    priority: input.original.priority,
    operation: input.original.operation,
    actionContent: input.original.actionContent,
    previousStatus: input.original.previousStatus,
    nextStatus: input.original.nextStatus,
    executedBy: input.executedBy ?? input.original.executedBy,
    actorKind: "human",
    retryOf: input.original.id,
    attempt: nextAttempt,
    externalDelivery: "none",
    approvalRequired: false,
    reason: input.original.reason,
    metadata: {
      ...input.original.metadata,
      retriedFrom: input.original.id,
      originalIdempotencyKey: input.original.idempotencyKey,
    },
    idempotencyKey: retryIdempotencyKey(originalKey, nextAttempt),
  };
  return { ok: true, draft, nextAttempt };
}

export function planCancel(
  original: SalesActionEvent,
  now: Date = new Date()
):
  | { ok: true; event: SalesActionEvent }
  | { ok: false; error: string } {
  if (!canCancelAction(original.status)) {
    return { ok: false, error: "This action cannot be cancelled" };
  }
  const completedAt = now.toISOString();
  return {
    ok: true,
    event: {
      ...original,
      result: "cancelled",
      status: "cancelled",
      completedAt,
      error: original.error,
    },
  };
}

export function failedExecuteDraft(
  draft: SalesActionEventDraft,
  error: string,
  now: Date = new Date()
): SalesActionEventDraft {
  return {
    ...draft,
    result: "failed",
    status: "failed",
    error,
    completedAt: now.toISOString(),
    actorKind: draft.actorKind ?? "human",
    externalDelivery: "none",
    approvalRequired: false,
  };
}

export function succeededExecuteDraft(
  draft: SalesActionEventDraft
): SalesActionEventDraft {
  return {
    ...draft,
    result: "executed",
    status: "succeeded",
    error: null,
    actorKind: draft.actorKind ?? "human",
    externalDelivery: "none",
    approvalRequired: false,
  };
}

export function emptyStatusCounts(): Record<SalesActionStatus, number> {
  return {
    pending: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
  };
}

export function countStatuses(
  events: Array<Pick<SalesActionEvent, "status">>
): Record<SalesActionStatus, number> {
  const counts = emptyStatusCounts();
  for (const event of events) {
    counts[event.status] += 1;
  }
  return counts;
}

/** Used by self-check to prove a retry key never equals the original. */
export function retryDoesNotReuseOriginalKey(
  original: SalesActionEvent
): boolean {
  const planned = planRetry({ original });
  if (!planned.ok) return false;
  const retryEvent = buildSalesActionEvent(planned.draft);
  return retryEvent.idempotencyKey !== original.idempotencyKey;
}
