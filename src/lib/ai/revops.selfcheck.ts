import assert from "node:assert/strict";
import { GET as getRevops } from "../../app/api/ai/revops/route";
import { isAdminRequest } from "../server/admin";
import {
  buildRevopsReport,
  classifyLeadTemperature,
  conversionRate,
  parseRevopsRange,
  type RevopsSnapshot,
} from "./revops";

function lead(
  id: string,
  extras: Partial<RevopsSnapshot["leads"][number]> = {}
): RevopsSnapshot["leads"][number] {
  return {
    id,
    lead_source: extras.lead_source ?? "web",
    score: extras.score ?? 38,
    escalation_status: extras.escalation_status ?? "ai_handling",
    created_at: extras.created_at ?? "2026-09-10T12:00:00.000Z",
  };
}

function row(
  id: string,
  leadId: string,
  createdAt = "2026-09-12T12:00:00.000Z"
) {
  return { id, lead_id: leadId, created_at: createdAt };
}

function testA() {
  const leads = [
    lead("l1", { score: 96, escalation_status: "handed_off", lead_source: "web" }),
    lead("l2", { score: 88, escalation_status: "handed_off", lead_source: "web" }),
    lead("l3", { score: 68, escalation_status: "pending_human", lead_source: "instagram" }),
    lead("l4", { score: 70, escalation_status: "pending_human", lead_source: "instagram" }),
    lead("l5", { score: 61, escalation_status: "pending_human", lead_source: "instagram" }),
    lead("l6", { score: 38, escalation_status: "ai_handling", lead_source: "referral" }),
    lead("l7", { score: 20, escalation_status: "ai_handling", lead_source: "referral" }),
    lead("l8", { score: 10, escalation_status: "ai_handling", lead_source: "referral" }),
    lead("l9", { score: 40, escalation_status: "ai_handling", lead_source: "web" }),
    lead("l10", { score: 55, escalation_status: "ai_handling", lead_source: "unknown" as string }),
  ];
  leads[9].lead_source = "";

  const report = buildRevopsReport({
    leads,
    handoffs: [],
    meetings: [],
    proposals: [],
    deals: [],
    objections: [],
  });

  assert.equal(report.kpis.leads, 10);
  assert.equal(report.kpis.hotLeads, 2);
  assert.equal(report.kpis.warmLeads, 3);
  assert.equal(report.kpis.nurtureLeads, 5);
  assert.equal(classifyLeadTemperature({ score: 80, escalation_status: "pending_human" }), "hot");
  assert.equal(classifyLeadTemperature({ score: 60, escalation_status: "ai_handling" }), "nurture");
}

function testB() {
  const report = buildRevopsReport({
    leads: Array.from({ length: 10 }, (_, i) =>
      lead(`l${i + 1}`, {
        score: i < 2 ? 90 : i < 5 ? 68 : 38,
        escalation_status: i < 2 ? "handed_off" : i < 5 ? "pending_human" : "ai_handling",
      })
    ),
    handoffs: [row("h1", "l1"), row("h2", "l2")],
    meetings: [row("m1", "l1"), row("m2", "l2")],
    proposals: [{ id: "p1", lead_id: "l1", meeting_id: "m1", created_at: "2026-09-13T12:00:00.000Z" }],
    deals: [
      {
        id: "d1",
        lead_id: "l1",
        status: "won",
        expected_value: 100000,
        currency: "JPY",
        lost_reason: null,
        created_at: "2026-09-14T12:00:00.000Z",
      },
    ],
    objections: [],
  });

  assert.equal(report.kpis.handoffs, 2);
  assert.equal(report.kpis.meetings, 2);
  assert.equal(report.kpis.proposals, 1);
  assert.equal(report.kpis.won, 1);
  assert.equal(report.kpis.conversionRates.leadToHandoff, 20);
  assert.equal(report.kpis.conversionRates.handoffToMeeting, 100);
  assert.equal(report.kpis.conversionRates.meetingToProposal, 50);
  assert.equal(report.kpis.conversionRates.proposalToWon, 100);
  assert.equal(report.kpis.conversionRates.leadToWon, 10);
  assert.equal(report.funnel[0]?.stage, "lead");
  assert.equal(report.funnel[1]?.count, 2);
  assert.equal(report.funnel[2]?.count, 2);
  assert.equal(report.funnel[3]?.count, 1);
  assert.equal(report.funnel[5]?.count, 1);
  assert.equal(report.funnel[5]?.conversionRate, 100);
}

function testC() {
  const report = buildRevopsReport({
    leads: [lead("a"), lead("b"), lead("c")],
    handoffs: [],
    meetings: [],
    proposals: [],
    deals: [
      {
        id: "d1",
        lead_id: "a",
        status: "lost",
        expected_value: null,
        currency: null,
        lost_reason: "price",
        created_at: "2026-09-14T00:00:00.000Z",
      },
      {
        id: "d2",
        lead_id: "b",
        status: "lost",
        expected_value: null,
        currency: null,
        lost_reason: "competitor",
        created_at: "2026-09-14T00:00:00.000Z",
      },
      {
        id: "d3",
        lead_id: "c",
        status: "lost",
        expected_value: null,
        currency: null,
        lost_reason: null,
        created_at: "2026-09-14T00:00:00.000Z",
      },
    ],
    objections: [],
  });

  assert.equal(report.kpis.lost, 3);
  const byReason = Object.fromEntries(
    report.lossReasons.map((row) => [row.reason, row])
  );
  assert.equal(byReason.price?.count, 1);
  assert.equal(byReason.competitor?.count, 1);
  assert.equal(byReason.unknown?.count, 1);
  assert.equal(byReason.price?.share, conversionRate(1, 3));
}

function testD() {
  const report = buildRevopsReport({
    leads: [lead("l1")],
    handoffs: [],
    meetings: [],
    proposals: [],
    deals: [],
    objections: [
      {
        id: "o1",
        lead_id: "l1",
        objection_type: "too_expensive",
        response_play: "confirm_roi_and_conditions",
        created_at: "2026-09-11T00:00:00.000Z",
      },
      {
        id: "o2",
        lead_id: "l1",
        objection_type: "think_it_over",
        response_play: "clarify_decision_gap",
        created_at: "2026-09-11T00:00:00.000Z",
      },
      {
        id: "o3",
        lead_id: "l1",
        objection_type: "competitor_X",
        response_play: null,
        created_at: "2026-09-11T00:00:00.000Z",
      },
      {
        id: "o4",
        lead_id: "l1",
        objection_type: "invented_type",
        response_play: "x",
        created_at: "2026-09-11T00:00:00.000Z",
      },
    ],
  });

  const byType = Object.fromEntries(
    report.objections.map((row) => [row.objectionType, row])
  );
  assert.equal(byType.too_expensive?.count, 1);
  assert.equal(byType.too_expensive?.responseCount, 1);
  assert.equal(byType.think_it_over?.count, 1);
  assert.equal(byType.competitor_X?.count, 1);
  assert.equal(byType.competitor_X?.responseCount, 0);
  assert.equal(report.objections.some((row) => row.objectionType === ("invented_type" as never)), false);
}

function testE() {
  const report = buildRevopsReport({
    leads: [
      lead("l1", { lead_source: "web", score: 90, escalation_status: "handed_off" }),
      lead("l2", { lead_source: "web" }),
      lead("l3", { lead_source: "instagram" }),
      lead("l4", { lead_source: "referral" }),
    ],
    handoffs: [row("h1", "l1")],
    meetings: [row("m1", "l1")],
    proposals: [{ id: "p1", lead_id: "l1", meeting_id: "m1", created_at: "2026-09-13T00:00:00.000Z" }],
    deals: [
      {
        id: "d1",
        lead_id: "l1",
        status: "won",
        expected_value: null,
        currency: null,
        lost_reason: null,
        created_at: "2026-09-14T00:00:00.000Z",
      },
      {
        id: "d2",
        lead_id: "l3",
        status: "lost",
        expected_value: null,
        currency: null,
        lost_reason: "timing",
        created_at: "2026-09-14T00:00:00.000Z",
      },
    ],
    objections: [],
  });

  const bySource = Object.fromEntries(
    report.leadSources.map((row) => [row.source, row])
  );
  assert.equal(bySource.web?.leads, 2);
  assert.equal(bySource.web?.handoffs, 1);
  assert.equal(bySource.web?.meetings, 1);
  assert.equal(bySource.web?.proposals, 1);
  assert.equal(bySource.web?.won, 1);
  assert.equal(bySource.web?.wonRate, 50);
  assert.equal(bySource.instagram?.leads, 1);
  assert.equal(bySource.instagram?.lost, 1);
  assert.equal(bySource.referral?.leads, 1);
  assert.equal(bySource.referral?.wonRate, 0);
}

function testFG() {
  const report = buildRevopsReport({
    leads: [lead("l1"), lead("l2"), lead("l3"), lead("l4")],
    handoffs: [],
    meetings: [],
    proposals: [],
    deals: [
      {
        id: "d1",
        lead_id: "l1",
        status: "won",
        expected_value: 100000,
        currency: "JPY",
        lost_reason: null,
        created_at: "2026-09-14T00:00:00.000Z",
      },
      {
        id: "d2",
        lead_id: "l2",
        status: "negotiating",
        expected_value: 200000,
        currency: "JPY",
        lost_reason: null,
        created_at: "2026-09-14T00:00:00.000Z",
      },
      {
        id: "d3",
        lead_id: "l3",
        status: "awaiting_response",
        expected_value: 1000,
        currency: "USD",
        lost_reason: null,
        created_at: "2026-09-14T00:00:00.000Z",
      },
      {
        id: "d4",
        lead_id: "l4",
        status: "won",
        expected_value: null,
        currency: "JPY",
        lost_reason: null,
        created_at: "2026-09-14T00:00:00.000Z",
      },
    ],
    objections: [],
  });

  const jpy = report.dealValue.currencies.find((row) => row.currency === "JPY");
  const usd = report.dealValue.currencies.find((row) => row.currency === "USD");
  assert.ok(jpy);
  assert.ok(usd);
  assert.equal(jpy.totalExpectedValue, 300000);
  assert.equal(jpy.wonExpectedValue, 100000);
  assert.equal(jpy.pipelineExpectedValue, 200000);
  assert.equal(jpy.averageWonValue, 100000);
  assert.equal(usd.totalExpectedValue, 1000);
  assert.equal(usd.pipelineExpectedValue, 1000);
  assert.equal(usd.wonExpectedValue, 0);
  assert.equal(
    report.dealValue.currencies.some((row) => row.totalExpectedValue === 301000),
    false
  );
}

function testHI() {
  const snapshot: RevopsSnapshot = {
    leads: [
      lead("in", { created_at: "2026-09-10T00:00:00.000Z" }),
      lead("out", { created_at: "2026-08-01T00:00:00.000Z" }),
    ],
    handoffs: [row("h1", "in", "2026-09-11T00:00:00.000Z")],
    meetings: [],
    proposals: [],
    deals: [],
    objections: [],
  };

  const ranged = parseRevopsRange("2026-09-01", "2026-09-30");
  assert.equal(ranged.ok, true);
  if (!ranged.ok) return;
  assert.equal(ranged.range.fromInclusive, "2026-09-01T00:00:00.000Z");
  assert.equal(ranged.range.toExclusive, "2026-10-01T00:00:00.000Z");

  const september = buildRevopsReport(snapshot, ranged.range);
  assert.equal(september.kpis.leads, 1);
  assert.equal(september.kpis.handoffs, 1);

  const allTime = buildRevopsReport(snapshot);
  assert.equal(allTime.kpis.leads, 2);

  const future = parseRevopsRange("2099-01-01", "2099-01-31");
  assert.equal(future.ok, true);
  if (!future.ok) return;
  const futureReport = buildRevopsReport(snapshot, future.range);
  assert.equal(futureReport.kpis.leads, 0);
  assert.equal(conversionRate(1, 0), 0);

  const duplicated = buildRevopsReport({
    leads: [lead("same"), lead("same")],
    handoffs: [row("h1", "same"), row("h1", "same")],
    meetings: [],
    proposals: [],
    deals: [],
    objections: [],
  });
  assert.equal(duplicated.kpis.leads, 1);
  assert.equal(duplicated.kpis.handoffs, 1);
}

async function testJ() {
  const previous = process.env.ADMIN_TOKEN;
  process.env.ADMIN_TOKEN = "day8-admin-token";

  const missing = isAdminRequest(new Request("http://localhost/api/ai/revops"));
  const wrong = isAdminRequest(
    new Request("http://localhost/api/ai/revops", {
      headers: { Authorization: "Bearer other" },
    })
  );
  const bearer = isAdminRequest(
    new Request("http://localhost/api/ai/revops", {
      headers: { Authorization: "Bearer day8-admin-token" },
    })
  );
  const header = isAdminRequest(
    new Request("http://localhost/api/ai/revops", {
      headers: { "x-admin-token": "day8-admin-token" },
    })
  );

  process.env.ADMIN_TOKEN = "";
  const unset = isAdminRequest(
    new Request("http://localhost/api/ai/revops", {
      headers: { Authorization: "Bearer day8-admin-token" },
    })
  );

  const unauthorizedResponse = await getRevops(
    new Request("http://localhost/api/ai/revops")
  );
  const unauthorizedBody = (await unauthorizedResponse.json()) as Record<
    string,
    unknown
  >;

  if (previous === undefined) {
    delete process.env.ADMIN_TOKEN;
  } else {
    process.env.ADMIN_TOKEN = previous;
  }

  assert.equal(missing, false);
  assert.equal(wrong, false);
  assert.equal(bearer, true);
  assert.equal(header, true);
  assert.equal(unset, false);
  assert.equal(unauthorizedResponse.status, 401);
  assert.equal(unauthorizedBody.success, false);
  assert.equal("kpis" in unauthorizedBody, false);
}

export async function runRevopsSelfChecks(): Promise<void> {
  testA();
  testB();
  testC();
  testD();
  testE();
  testFG();
  testHI();
  await testJ();
}

const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1]?.replaceAll("\\", "/").includes("revops.selfcheck");

if (isDirectRun) {
  runRevopsSelfChecks()
    .then(() => {
      console.log("revops selfcheck: A-J passed");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
