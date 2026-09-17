import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { isLearningLabel, isPursueDecision } from "@/lib/nbos/types";
import { recordSalesLearning, loadLearningSummary } from "@/lib/nbos/learning";
import { computeOutreachReadiness } from "@/lib/nbos/readiness";
import {
  approveOutreach,
  decideDiscovery,
  ingestDiscoveryIntoNewBusiness,
  loadNewBusinessWorkspace,
  processPendingDiscoveries,
  promoteQualifiedProspect,
  runNewBusinessCycle,
} from "@/lib/nbos/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const workspace = await loadNewBusinessWorkspace();
    const learning = await loadLearningSummary(workspace.offering?.id ?? null);
    return NextResponse.json({
      ...workspace,
      learning,
      autoEmail: false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load new business OS") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";

  try {
    if (action === "run_cycle") {
      const result = await runNewBusinessCycle();
      return NextResponse.json({ ok: true, autoEmail: false, ...result });
    }

    if (action === "process_pending") {
      const result = await processPendingDiscoveries(8);
      return NextResponse.json({ ok: true, autoEmail: false, ...result });
    }

    if (action === "ingest_discovery") {
      if (typeof body.discovery_id !== "string" || !UUID_RE.test(body.discovery_id)) {
        return NextResponse.json({ error: "discovery_id is required" }, { status: 400 });
      }
      const result = await ingestDiscoveryIntoNewBusiness(body.discovery_id);
      return NextResponse.json({ ok: true, autoEmail: false, ...result });
    }

    if (action === "decide") {
      const decision = body.decision;
      if (!isPursueDecision(decision)) {
        return NextResponse.json({ error: "invalid decision" }, { status: 400 });
      }
      const result = await decideDiscovery({
        discoveryId:
          typeof body.discovery_id === "string" && UUID_RE.test(body.discovery_id)
            ? body.discovery_id
            : undefined,
        prospectId:
          typeof body.prospect_id === "string" && UUID_RE.test(body.prospect_id)
            ? body.prospect_id
            : undefined,
        decision,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "promote_lead") {
      if (typeof body.prospect_id !== "string" || !UUID_RE.test(body.prospect_id)) {
        return NextResponse.json({ error: "prospect_id is required" }, { status: 400 });
      }
      const result = await promoteQualifiedProspect(body.prospect_id);
      return NextResponse.json({ ok: true, autoEmail: false, ...result });
    }

    if (action === "prepare" || action === "recompute_readiness") {
      if (typeof body.prospect_id !== "string" || !UUID_RE.test(body.prospect_id)) {
        return NextResponse.json({ error: "prospect_id is required" }, { status: 400 });
      }
      const readiness = await computeOutreachReadiness(body.prospect_id);
      return NextResponse.json({ ok: true, readiness });
    }

    if (action === "approve_outreach") {
      if (typeof body.prospect_id !== "string" || !UUID_RE.test(body.prospect_id)) {
        return NextResponse.json({ error: "prospect_id is required" }, { status: 400 });
      }
      const result = await approveOutreach(body.prospect_id, "human");
      return NextResponse.json({
        ok: true,
        ...result,
        autoEmail: false,
        notice: "承認しました。外部送信はしていません。",
      });
    }

    if (action === "feedback") {
      if (!isLearningLabel(body.label)) {
        return NextResponse.json({ error: "invalid label" }, { status: 400 });
      }
      const result = await recordSalesLearning({
        label: body.label,
        note: typeof body.note === "string" ? body.note : null,
        offeringId:
          typeof body.offering_id === "string" && UUID_RE.test(body.offering_id)
            ? body.offering_id
            : null,
        companyId:
          typeof body.company_id === "string" && UUID_RE.test(body.company_id)
            ? body.company_id
            : null,
        prospectId:
          typeof body.prospect_id === "string" && UUID_RE.test(body.prospect_id)
            ? body.prospect_id
            : null,
        leadId:
          typeof body.lead_id === "string" && UUID_RE.test(body.lead_id)
            ? body.lead_id
            : null,
        discoveryId:
          typeof body.discovery_id === "string" && UUID_RE.test(body.discovery_id)
            ? body.discovery_id
            : null,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to run new business action") },
      { status: 400 }
    );
  }
}
