import assert from "node:assert/strict";
import { GET as getSalesActionAudit } from "../../app/api/ai/sales-action-audit/route";
import { POST as postSalesActionCancel } from "../../app/api/ai/sales-action-cancel/route";
import { POST as postSalesActionExecute } from "../../app/api/ai/sales-action-execute/route";
import { POST as postSalesActionRetry } from "../../app/api/ai/sales-action-retry/route";
import { isAdminRequest } from "../server/admin";
import { publicErrorMessage } from "../server/public-error";
import {
  buildSalesActionEvent,
  canCancelAction,
  canRetryAction,
  findDuplicateEvent,
  resolveHistoryWrite,
  retryIdempotencyKey,
  statusFromResult,
} from "./sales-action-history";
import {
  existingExecuteOutcome,
  failedExecuteDraft,
  followupAlreadyRecorded,
  planCancel,
  planRetry,
  retryDoesNotReuseOriginalKey,
  succeededExecuteDraft,
} from "./sales-ops";

const NOW = new Date("2026-09-14T12:00:00.000Z");
const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const EVENT_ID = "22222222-2222-4222-8222-222222222222";

function failedEvent() {
  return buildSalesActionEvent(
    failedExecuteDraft(
      {
        leadId: LEAD_ID,
        operation: "followup_created",
        actionType: "FOLLOWUP_DUE",
        priority: "P0",
        executedBy: "admin",
        metadata: { sequenceNumber: 2 },
        idempotencyKey: "followup_created:2",
        newId: EVENT_ID,
      },
      "Lead API is not configured",
      NOW
    ),
    NOW
  );
}

function testStateMachine() {
  assert.equal(statusFromResult("executed"), "succeeded");
  assert.equal(statusFromResult("duplicate"), "skipped");
  assert.equal(statusFromResult("failed"), "failed");
  assert.equal(statusFromResult("cancelled"), "cancelled");
  const failed = failedEvent();
  assert.equal(failed.status, "failed");
  assert.equal(failed.result, "failed");
  assert.equal(failed.error, "Lead API is not configured");
  assert.equal(failed.actorKind, "human");
  assert.equal(failed.externalDelivery, "none");
  assert.equal(failed.approvalRequired, false);
  assert.equal(canRetryAction(failed.status), true);
  assert.equal(canCancelAction(failed.status), true);
  assert.equal(canRetryAction("succeeded"), false);
  assert.equal(canCancelAction("succeeded"), false);
}

function testFailedStaysAndBlocksSameKey() {
  const failed = failedEvent();
  const sameKey = resolveHistoryWrite(
    [failed],
    {
      leadId: LEAD_ID,
      operation: "followup_created",
      metadata: { sequenceNumber: 2 },
      idempotencyKey: "followup_created:2",
    },
    NOW
  );
  assert.equal(sameKey.duplicate, true);
  assert.equal(sameKey.event.id, EVENT_ID);
  assert.equal(sameKey.event.status, "failed");
  assert.equal(sameKey.event.result, "failed");
  assert.equal(findDuplicateEvent([failed], failed)?.id, EVENT_ID);
  assert.equal(existingExecuteOutcome(failed).kind, "failed_retryable");
  const succeeded = buildSalesActionEvent(
    succeededExecuteDraft({
      leadId: LEAD_ID,
      operation: "action_executed",
      idempotencyKey: "action_executed:HOT_HANDOFF:P0:none",
    }),
    NOW
  );
  assert.equal(existingExecuteOutcome(succeeded).kind, "blocked");
}

function testRetryUsesNewKey() {
  const failed = failedEvent();
  const planned = planRetry({ original: failed, executedBy: "admin", now: NOW });
  assert.equal(planned.ok, true);
  if (!planned.ok) return;
  assert.equal(planned.nextAttempt, 2);
  assert.equal(
    planned.draft.idempotencyKey,
    retryIdempotencyKey("followup_created:2", 2)
  );
  assert.notEqual(planned.draft.idempotencyKey, failed.idempotencyKey);
  assert.equal(planned.draft.retryOf, EVENT_ID);
  assert.equal(retryDoesNotReuseOriginalKey(failed), true);

  const succeeded = buildSalesActionEvent(
    succeededExecuteDraft({
      leadId: LEAD_ID,
      operation: "action_executed",
      newId: "33333333-3333-4333-8333-333333333333",
    }),
    NOW
  );
  const blocked = planRetry({ original: succeeded });
  assert.equal(blocked.ok, false);
}

function testCancelAndFollowupGuard() {
  const failed = failedEvent();
  const cancelled = planCancel(failed, NOW);
  assert.equal(cancelled.ok, true);
  if (!cancelled.ok) return;
  assert.equal(cancelled.event.status, "cancelled");
  assert.equal(cancelled.event.result, "cancelled");
  assert.equal(planCancel(cancelled.event, NOW).ok, false);

  assert.equal(
    followupAlreadyRecorded({
      operation: "followup_created",
      sequenceNumber: 2,
      latestSequence: 2,
    }),
    true
  );
  assert.equal(
    followupAlreadyRecorded({
      operation: "followup_created",
      sequenceNumber: 2,
      latestSequence: 1,
    }),
    false
  );
  assert.equal(
    followupAlreadyRecorded({
      operation: "action_executed",
      sequenceNumber: 1,
      latestSequence: 9,
    }),
    false
  );
}

function testPublicErrors() {
  assert.equal(
    publicErrorMessage(
      new Error("ADMIN_TOKEN=super-secret failed"),
      "Failed to execute sales action"
    ),
    "Failed to execute sales action"
  );
  assert.equal(
    publicErrorMessage(new Error("Lead not found"), "fallback"),
    "Lead not found"
  );
}

async function withAdminToken<T>(run: () => Promise<T>): Promise<T> {
  const previous = process.env.ADMIN_TOKEN;
  process.env.ADMIN_TOKEN = "day11-admin-token";
  try {
    return await run();
  } finally {
    if (previous === undefined) {
      delete process.env.ADMIN_TOKEN;
    } else {
      process.env.ADMIN_TOKEN = previous;
    }
  }
}

async function testUnauthenticatedIs401() {
  await withAdminToken(async () => {
    const audit = await getSalesActionAudit(
      new Request("http://localhost/api/ai/sales-action-audit")
    );
    const retry = await postSalesActionRetry(
      new Request("http://localhost/api/ai/sales-action-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: EVENT_ID }),
      })
    );
    const cancel = await postSalesActionCancel(
      new Request("http://localhost/api/ai/sales-action-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: EVENT_ID }),
      })
    );
    const execute = await postSalesActionExecute(
      new Request("http://localhost/api/ai/sales-action-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: LEAD_ID, operation: "action_executed" }),
      })
    );
    assert.equal(isAdminRequest(new Request("http://localhost/api/ai/sales-action-audit")), false);
    assert.equal(audit.status, 401);
    assert.equal(retry.status, 401);
    assert.equal(cancel.status, 401);
    assert.equal(execute.status, 401);
  });
}

async function testUnsetTokenFailClosed() {
  const previous = process.env.ADMIN_TOKEN;
  process.env.ADMIN_TOKEN = "";
  try {
    const authed = isAdminRequest(
      new Request("http://localhost/api/ai/sales-action-audit", {
        headers: { Authorization: "Bearer day11-admin-token" },
      })
    );
    const response = await getSalesActionAudit(
      new Request("http://localhost/api/ai/sales-action-audit", {
        headers: { Authorization: "Bearer day11-admin-token" },
      })
    );
    assert.equal(authed, false);
    assert.equal(response.status, 401);
  } finally {
    if (previous === undefined) {
      delete process.env.ADMIN_TOKEN;
    } else {
      process.env.ADMIN_TOKEN = previous;
    }
  }
}

export async function runSalesOpsSelfChecks(): Promise<void> {
  testStateMachine();
  testFailedStaysAndBlocksSameKey();
  testRetryUsesNewKey();
  testCancelAndFollowupGuard();
  testPublicErrors();
  await testUnauthenticatedIs401();
  await testUnsetTokenFailClosed();
}

const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1]?.replaceAll("\\", "/").includes("sales-ops.selfcheck");

if (isDirectRun) {
  runSalesOpsSelfChecks()
    .then(() => {
      console.log("sales-ops selfcheck: passed");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
