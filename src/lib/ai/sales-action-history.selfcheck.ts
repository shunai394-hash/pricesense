import assert from "node:assert/strict";
import { GET as getSalesActionHistory } from "../../app/api/ai/sales-action-history/[leadId]/route";
import { POST as postDealStatus } from "../../app/api/ai/deal-status/route";
import { POST as postSalesActionExecute } from "../../app/api/ai/sales-action-execute/route";
import { isAdminRequest } from "../server/admin";
import {
  buildIdempotencyKey,
  buildSalesActionEvent,
  countSalesActivity,
  findDuplicateEvent,
  isDealSnapshotUnchanged,
  normalizeExecutedBy,
  resolveHistoryWrite,
} from "./sales-action-history";

const NOW = new Date("2026-09-13T12:00:00.000Z");
const LEAD_ID = "11111111-1111-4111-8111-111111111111";

function testA() {
  const event = buildSalesActionEvent(
    {
      leadId: LEAD_ID,
      dealId: "deal-1",
      actionType: "HOT_HANDOFF",
      priority: "P0",
      operation: "action_executed",
      actionContent: "HOTリードの引き継ぎに対応する",
      executedBy: "sales-a",
      metadata: { note: "handled" },
      newId: "evt-a",
    },
    NOW
  );
  assert.equal(event.leadId, LEAD_ID);
  assert.equal(event.actionType, "HOT_HANDOFF");
  assert.equal(event.priority, "P0");
  assert.equal(event.actionContent, "HOTリードの引き継ぎに対応する");
  assert.equal(event.result, "executed");
  assert.equal(event.executedBy, "sales-a");
  assert.equal(event.executedAt, NOW.toISOString());
  assert.equal(event.metadata.note, "handled");
}

function testB() {
  const event = buildSalesActionEvent(
    {
      leadId: LEAD_ID,
      operation: "negotiating",
      previousStatus: "proposal_sent",
      nextStatus: "negotiating",
      executedBy: "sales-b",
      newId: "evt-b",
    },
    NOW
  );
  assert.equal(event.operation, "negotiating");
  assert.equal(event.previousStatus, "proposal_sent");
  assert.equal(event.nextStatus, "negotiating");
  assert.equal(
    event.idempotencyKey,
    buildIdempotencyKey({
      operation: "negotiating",
      previousStatus: "proposal_sent",
      nextStatus: "negotiating",
    })
  );
}

function testC() {
  const event = buildSalesActionEvent(
    {
      leadId: LEAD_ID,
      operation: "won",
      previousStatus: "negotiating",
      nextStatus: "won",
      executedBy: "sales-c",
      newId: "evt-c",
    },
    NOW
  );
  assert.equal(event.operation, "won");
  assert.equal(event.nextStatus, "won");
  assert.equal(event.executedAt, NOW.toISOString());
}

function testD() {
  const event = buildSalesActionEvent(
    {
      leadId: LEAD_ID,
      operation: "lost",
      previousStatus: "negotiating",
      nextStatus: "lost",
      reason: "price",
      executedBy: "sales-d",
      metadata: { lostReason: "price" },
      newId: "evt-d",
    },
    NOW
  );
  assert.equal(event.operation, "lost");
  assert.equal(event.reason, "price");
  assert.equal(event.metadata.lostReason, "price");
}

function testE() {
  const event = buildSalesActionEvent(
    {
      leadId: LEAD_ID,
      operation: "manual_stop",
      previousStatus: "negotiating",
      nextStatus: "negotiating",
      reason: "manual_stop",
      executedBy: "sales-e",
      newId: "evt-e",
    },
    NOW
  );
  assert.equal(event.operation, "manual_stop");
  assert.equal(event.nextStatus, "negotiating");
  assert.equal(event.idempotencyKey, "manual_stop");
}

function testF() {
  const event = buildSalesActionEvent(
    {
      leadId: LEAD_ID,
      operation: "followup_created",
      actionType: "FOLLOWUP_DUE",
      priority: "P0",
      executedBy: "sales-f",
      metadata: { sequenceNumber: 1 },
      newId: "evt-f",
    },
    NOW
  );
  assert.equal(event.operation, "followup_created");
  assert.equal(event.idempotencyKey, "followup_created:1");
}

function testG() {
  const event = buildSalesActionEvent(
    {
      leadId: LEAD_ID,
      operation: "proposal_sent",
      previousStatus: "proposal_ready",
      nextStatus: "proposal_sent",
      newId: "evt-g",
    },
    NOW
  );
  assert.equal(event.leadId, LEAD_ID);
}

function testH() {
  assert.equal(normalizeExecutedBy("  agent-1  "), "agent-1");
  assert.equal(normalizeExecutedBy(""), "admin");
  assert.equal(normalizeExecutedBy(null), "admin");
  const event = buildSalesActionEvent(
    {
      leadId: LEAD_ID,
      operation: "awaiting_response",
      executedBy: "rep-42",
      newId: "evt-h",
    },
    NOW
  );
  assert.equal(event.executedBy, "rep-42");
}

function testI() {
  const event = buildSalesActionEvent(
    {
      leadId: LEAD_ID,
      operation: "proposal_ready",
      newId: "evt-i",
    },
    NOW
  );
  assert.equal(event.executedAt, "2026-09-13T12:00:00.000Z");
  assert.ok(Date.parse(event.executedAt));
}

function testJ() {
  const first = buildSalesActionEvent(
    {
      leadId: LEAD_ID,
      operation: "won",
      previousStatus: "negotiating",
      nextStatus: "won",
      executedBy: "sales-j",
      newId: "evt-j1",
    },
    NOW
  );
  const second = resolveHistoryWrite(
    [first],
    {
      leadId: LEAD_ID,
      operation: "won",
      previousStatus: "negotiating",
      nextStatus: "won",
      executedBy: "sales-j",
    },
    NOW
  );
  assert.equal(second.duplicate, true);
  assert.equal(second.event.id, "evt-j1");
  assert.equal(findDuplicateEvent([first], first)?.id, "evt-j1");
  assert.equal(
    isDealSnapshotUnchanged({
      previousStatus: "won",
      nextStatus: "won",
      previousLostReason: null,
      nextLostReason: null,
      previousFollowupAt: null,
      nextFollowupAt: null,
    }),
    true
  );

  const activity = countSalesActivity({
    pending: 3,
    events: [first, { ...second.event, result: "duplicate" }],
    now: NOW,
  });
  assert.equal(activity.pending, 3);
  assert.equal(activity.executedToday, 1);
  assert.equal(activity.wonToday, 1);
  assert.equal(activity.lostToday, 0);
  assert.equal(activity.stoppedToday, 0);
}

async function withAdminToken<T>(run: () => Promise<T>): Promise<T> {
  const previous = process.env.ADMIN_TOKEN;
  process.env.ADMIN_TOKEN = "day10-admin-token";
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

async function testK() {
  await withAdminToken(async () => {
    const missing = isAdminRequest(
      new Request("http://localhost/api/ai/sales-action-history/" + LEAD_ID)
    );
    const response = await getSalesActionHistory(
      new Request("http://localhost/api/ai/sales-action-history/" + LEAD_ID),
      { params: Promise.resolve({ leadId: LEAD_ID }) }
    );
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(missing, false);
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal("history" in body, false);

    const execute = await postSalesActionExecute(
      new Request("http://localhost/api/ai/sales-action-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: LEAD_ID, operation: "action_executed" }),
      })
    );
    assert.equal(execute.status, 401);

    const status = await postDealStatus(
      new Request("http://localhost/api/ai/deal-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: LEAD_ID, status: "won" }),
      })
    );
    assert.equal(status.status, 401);
  });
}

async function testL() {
  const previous = process.env.ADMIN_TOKEN;
  process.env.ADMIN_TOKEN = "";
  try {
    const authed = isAdminRequest(
      new Request("http://localhost/api/ai/sales-action-history/" + LEAD_ID, {
        headers: { Authorization: "Bearer day10-admin-token" },
      })
    );
    const response = await getSalesActionHistory(
      new Request("http://localhost/api/ai/sales-action-history/" + LEAD_ID, {
        headers: { Authorization: "Bearer day10-admin-token" },
      }),
      { params: Promise.resolve({ leadId: LEAD_ID }) }
    );
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(authed, false);
    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  } finally {
    if (previous === undefined) {
      delete process.env.ADMIN_TOKEN;
    } else {
      process.env.ADMIN_TOKEN = previous;
    }
  }
}

export async function runSalesActionHistorySelfChecks(): Promise<void> {
  testA();
  testB();
  testC();
  testD();
  testE();
  testF();
  testG();
  testH();
  testI();
  testJ();
  await testK();
  await testL();
}

const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1]?.replaceAll("\\", "/").includes("sales-action-history.selfcheck");

if (isDirectRun) {
  runSalesActionHistorySelfChecks()
    .then(() => {
      console.log("sales-action-history selfcheck: A-L passed");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
