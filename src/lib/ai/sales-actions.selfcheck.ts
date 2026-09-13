import assert from "node:assert/strict";
import { POST as postDealStatus } from "../../app/api/ai/deal-status/route";
import { GET as getSalesActions } from "../../app/api/ai/sales-actions/route";
import { isAdminRequest } from "../server/admin";
import { emptyDealState } from "./deal";
import {
  applyDealStatusChange,
  applyDealStop,
  buildSalesActions,
  classifySalesAction,
  matchingActionTypes,
  type SalesActionSource,
} from "./sales-actions";

const NOW = new Date("2026-09-13T12:00:00.000Z");
const PAST = "2026-09-12T09:00:00.000Z";
const FUTURE = "2026-09-20T09:00:00.000Z";

function source(
  leadId: string,
  extras: Partial<SalesActionSource> = {}
): SalesActionSource {
  return {
    leadId,
    dealId: extras.dealId ?? null,
    score: extras.score ?? null,
    leadStatus: extras.leadStatus ?? null,
    dealStatus: extras.dealStatus ?? null,
    nextAction: extras.nextAction ?? null,
    nextFollowupAt: extras.nextFollowupAt ?? null,
    lastActivityAt: extras.lastActivityAt ?? null,
    email: extras.email ?? `${leadId}@example.com`,
    categoryName: extras.categoryName ?? null,
    leadSource: extras.leadSource ?? "pdf_export",
  };
}

function testA() {
  const action = classifySalesAction(
    source("hot-handoff", {
      score: 96,
      leadStatus: "handed_off",
      nextAction: "handoff_to_human",
    }),
    NOW
  );
  assert.ok(action);
  assert.equal(action?.actionType, "HOT_HANDOFF");
  assert.equal(action?.priority, "P0");
}

function testB() {
  const action = classifySalesAction(
    source("negotiating", {
      score: 40,
      leadStatus: "ai_handling",
      dealId: "d-neg",
      dealStatus: "negotiating",
      nextAction: "条件・懸念を整理する",
    }),
    NOW
  );
  assert.ok(action);
  assert.equal(action?.actionType, "NEGOTIATION");
  assert.equal(action?.priority, "P0");
}

function testC() {
  const action = classifySalesAction(
    source("proposal-sent", {
      score: 50,
      leadStatus: "ai_handling",
      dealId: "d-prop",
      dealStatus: "proposal_sent",
      nextFollowupAt: FUTURE,
    }),
    NOW
  );
  assert.ok(action);
  assert.equal(action?.actionType, "PROPOSAL_WAITING");
  assert.equal(action?.priority, "P1");
}

function testD() {
  const action = classifySalesAction(
    source("awaiting", {
      score: 88,
      leadStatus: "pending_human",
      dealId: "d-wait",
      dealStatus: "awaiting_response",
      nextFollowupAt: FUTURE,
    }),
    NOW
  );
  assert.ok(action);
  assert.equal(action?.actionType, "PROPOSAL_WAITING");
  assert.equal(action?.priority, "P1");
}

function testE() {
  const action = classifySalesAction(
    source("followup-due", {
      score: 40,
      leadStatus: "ai_handling",
      nextFollowupAt: PAST,
    }),
    NOW
  );
  assert.ok(action);
  assert.equal(action?.actionType, "FOLLOWUP_DUE");
  assert.equal(action?.priority, "P0");
}

function testF() {
  const action = classifySalesAction(
    source("warm", {
      score: 70,
      leadStatus: "pending_human",
    }),
    NOW
  );
  assert.ok(action);
  assert.equal(action?.actionType, "WARM_REVIEW");
  assert.equal(action?.priority, "P2");
}

function testG() {
  const action = classifySalesAction(
    source("nurture", {
      score: 38,
      leadStatus: "ai_handling",
    }),
    NOW
  );
  assert.ok(action);
  assert.equal(action?.actionType, "NURTURE");
  assert.equal(action?.priority, "P3");
}

function testH() {
  const src = source("multi", {
    score: 96,
    leadStatus: "handed_off",
    dealId: "d-multi",
    dealStatus: "negotiating",
    nextFollowupAt: PAST,
  });
  const types = matchingActionTypes({
    score: src.score,
    leadStatus: src.leadStatus,
    dealStatus: src.dealStatus,
    nextFollowupAt: src.nextFollowupAt,
    now: NOW,
  });
  assert.ok(types.length > 1);
  const actions = buildSalesActions([src], NOW);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].leadId, "multi");
  assert.equal(actions[0].actionType, "NEGOTIATION");
}

function testI() {
  const action = classifySalesAction(
    source("won", {
      score: 96,
      leadStatus: "handed_off",
      dealStatus: "won",
      nextFollowupAt: PAST,
    }),
    NOW
  );
  assert.equal(action, null);
}

function testJ() {
  const action = classifySalesAction(
    source("lost", {
      score: 70,
      leadStatus: "pending_human",
      dealStatus: "lost",
      nextFollowupAt: PAST,
    }),
    NOW
  );
  assert.equal(action, null);
}

function testK() {
  const deal = emptyDealState({
    id: "deal-stop",
    leadId: "lead-stop",
  });
  deal.status = "negotiating";
  deal.probability = 70;
  deal.next_followup_at = PAST;

  const stopped = applyDealStop(deal);
  assert.equal(stopped.status, "negotiating");
  assert.equal(stopped.next_followup_at, null);
  assert.equal(stopped.probability, 70);

  const action = classifySalesAction(
    source("lead-stop", {
      score: 40,
      leadStatus: "ai_handling",
      dealId: stopped.id,
      dealStatus: stopped.status,
      nextFollowupAt: stopped.next_followup_at,
    }),
    NOW
  );
  assert.ok(action);
  assert.notEqual(action?.actionType, "FOLLOWUP_DUE");
}

function testStatusChange() {
  const existing = emptyDealState({
    id: "deal-status",
    leadId: "lead-status",
  });
  existing.next_followup_at = FUTURE;
  existing.expected_value = 120000;
  existing.currency = "JPY";

  const won = applyDealStatusChange({
    existing,
    leadId: "lead-status",
    status: "won",
    now: NOW,
  });
  assert.equal(won.status, "won");
  assert.equal(won.probability, 100);
  assert.equal(won.won_at, NOW.toISOString());
  assert.equal(won.next_followup_at, null);
  assert.equal(won.expected_value, 120000);
  assert.equal(won.lost_reason, null);

  const lost = applyDealStatusChange({
    existing,
    leadId: "lead-status",
    status: "lost",
    lostReason: "price",
    now: NOW,
  });
  assert.equal(lost.status, "lost");
  assert.equal(lost.probability, 0);
  assert.equal(lost.lost_at, NOW.toISOString());
  assert.equal(lost.lost_reason, "price");
  assert.equal(lost.next_followup_at, null);

  const lostUnknown = applyDealStatusChange({
    existing,
    leadId: "lead-status",
    status: "lost",
    now: NOW,
  });
  assert.equal(lostUnknown.lost_reason, "unknown");

  const negotiating = applyDealStatusChange({
    existing,
    leadId: "lead-status",
    status: "negotiating",
    now: NOW,
  });
  assert.equal(negotiating.status, "negotiating");
  assert.equal(negotiating.probability, 70);
  assert.equal(negotiating.next_followup_at, FUTURE);
}

function testSort() {
  const later = "2026-09-19T09:00:00.000Z";
  const sooner = "2026-09-18T09:00:00.000Z";
  const actions = buildSalesActions(
    [
      source("p3", { score: 20, leadStatus: "ai_handling" }),
      source("p0-newer", {
        score: 96,
        leadStatus: "handed_off",
        nextFollowupAt: later,
      }),
      source("p0-older", {
        score: 90,
        leadStatus: "handed_off",
        nextFollowupAt: sooner,
      }),
      source("p1", {
        score: 50,
        leadStatus: "ai_handling",
        dealStatus: "proposal_sent",
        dealId: "d-p1",
        nextFollowupAt: FUTURE,
      }),
    ],
    NOW
  );
  assert.deepEqual(
    actions.map((item) => item.leadId),
    ["p0-older", "p0-newer", "p1", "p3"]
  );
}

async function testL() {
  const previous = process.env.ADMIN_TOKEN;
  process.env.ADMIN_TOKEN = "day9-admin-token";

  const missing = isAdminRequest(
    new Request("http://localhost/api/ai/sales-actions")
  );
  const unauthorizedResponse = await getSalesActions(
    new Request("http://localhost/api/ai/sales-actions")
  );
  const unauthorizedBody = (await unauthorizedResponse.json()) as Record<
    string,
    unknown
  >;

  const unsetToken = "";
  process.env.ADMIN_TOKEN = unsetToken;
  const unset = isAdminRequest(
    new Request("http://localhost/api/ai/sales-actions", {
      headers: { Authorization: "Bearer day9-admin-token" },
    })
  );

  if (previous === undefined) {
    delete process.env.ADMIN_TOKEN;
  } else {
    process.env.ADMIN_TOKEN = previous;
  }

  assert.equal(missing, false);
  assert.equal(unset, false);
  assert.equal(unauthorizedResponse.status, 401);
  assert.equal(unauthorizedBody.success, false);
  assert.equal("actions" in unauthorizedBody, false);
}

async function testM() {
  const previous = process.env.ADMIN_TOKEN;
  process.env.ADMIN_TOKEN = "day9-admin-token";

  const invalid = await postDealStatus(
    new Request("http://localhost/api/ai/deal-status", {
      method: "POST",
      headers: {
        Authorization: "Bearer day9-admin-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leadId: "11111111-1111-4111-8111-111111111111",
        status: "closed",
      }),
    })
  );
  const invalidBody = (await invalid.json()) as Record<string, unknown>;

  const unauth = await postDealStatus(
    new Request("http://localhost/api/ai/deal-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: "11111111-1111-4111-8111-111111111111",
        status: "won",
      }),
    })
  );

  if (previous === undefined) {
    delete process.env.ADMIN_TOKEN;
  } else {
    process.env.ADMIN_TOKEN = previous;
  }

  assert.equal(invalid.status, 400);
  assert.equal(invalidBody.success, false);
  assert.equal(unauth.status, 401);
}

export async function runSalesActionsSelfChecks(): Promise<void> {
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
  testK();
  testStatusChange();
  testSort();
  await testL();
  await testM();
}

const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1]?.replaceAll("\\", "/").includes("sales-actions.selfcheck");

if (isDirectRun) {
  runSalesActionsSelfChecks()
    .then(() => {
      console.log("sales-actions selfcheck: A-M passed");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
