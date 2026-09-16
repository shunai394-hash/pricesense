import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { generateCompanyResearch } from "@/lib/ai/sales-research";
import {
  loadCompanyResearchContext,
  syncLeadsIntoSalesOs,
} from "@/lib/server/sales-os";
import { getSupabaseAdmin } from "@/lib/server/supabase";

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
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("research_results")
      .select(
        `
        id,
        company_id,
        contact_id,
        prospect_id,
        research_type,
        summary,
        findings,
        score,
        model,
        created_at,
        updated_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      research: data ?? [],
      count: data?.length ?? 0,
      emptyReason:
        (data?.length ?? 0) === 0
          ? "リサーチ結果はまだありません。企業を選んでAIリサーチを実行してください。"
          : null,
    });
  } catch (error) {
    console.error("[sales/research GET]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load research results") },
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

  try {
    await syncLeadsIntoSalesOs();
    let companyId =
      typeof body.company_id === "string" && UUID_RE.test(body.company_id)
        ? body.company_id
        : null;

    if (!companyId && typeof body.lead_id === "string" && UUID_RE.test(body.lead_id)) {
      const supabase = getSupabaseAdmin();
      const { data: prospect } = await supabase
        .from("prospects")
        .select("company_id")
        .eq("lead_id", body.lead_id)
        .maybeSingle();
      companyId = prospect?.company_id ?? null;
    }

    if (!companyId) {
      return NextResponse.json({ error: "company_id is required" }, { status: 400 });
    }

    const context = await loadCompanyResearchContext(companyId);
    if (!context) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const draft = await generateCompanyResearch(context);
    const supabase = getSupabaseAdmin();
    const prospectId = context.prospects[0]?.id ?? null;
    const contactId = context.contacts[0]?.id ?? null;

    const { data, error } = await supabase
      .from("research_results")
      .insert({
        company_id: context.company.id,
        contact_id: contactId,
        prospect_id: prospectId,
        research_type: draft.researchType,
        summary: draft.summary,
        findings: draft,
        score: draft.score,
        model: draft.model,
      })
      .select(
        "id, company_id, contact_id, prospect_id, research_type, summary, findings, score, model, created_at, updated_at"
      )
      .single();

    if (error) throw error;

    if (prospectId && draft.nextAction) {
      await supabase
        .from("prospects")
        .update({
          next_action: draft.nextAction,
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", prospectId);
    }

    return NextResponse.json({
      ok: true,
      research: data,
      usedAi: draft.usedAi,
      failureKind: draft.failureKind ?? null,
    });
  } catch (error) {
    console.error("[sales/research POST]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to run research") },
      { status: 500 }
    );
  }
}
