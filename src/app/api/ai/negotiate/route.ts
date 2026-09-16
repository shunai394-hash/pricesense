import { NextResponse } from "next/server";
import { analyzeNegotiation } from "@/lib/ai/negotiation";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { parseOptionalLeadId } from "@/lib/sales/scoring";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

  const message = text(body.message);
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  let leadId: string | null = null;
  try {
    leadId = parseOptionalLeadId(body);
  } catch {
    return NextResponse.json({ error: "Invalid leadId" }, { status: 400 });
  }
  const prospectId =
    typeof body.prospect_id === "string" && UUID_RE.test(body.prospect_id)
      ? body.prospect_id
      : null;

  try {
    const supabase = getSupabaseAdmin();
    const knownFacts: string[] = [];
    let companyName: string | null = null;
    let contactName: string | null = null;
    let jobTitle: string | null = null;
    let department: string | null = null;
    let email: string | null = null;
    let industry: string | null = null;

    if (leadId) {
      const { data: lead, error } = await supabase
        .from("leads")
        .select(
          "id, email, company_name, industry, job_title, department, category_name, score, next_action"
        )
        .eq("id", leadId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }
      email = text(lead.email);
      companyName = text(lead.company_name);
      industry = text(lead.industry) ?? text(lead.category_name);
      jobTitle = text(lead.job_title);
      department = text(lead.department);
      if (companyName) knownFacts.push(`会社名: ${companyName}`);
      if (email) knownFacts.push(`メール: ${email}`);
      if (jobTitle) knownFacts.push(`役職: ${jobTitle}`);
      if (department) knownFacts.push(`部署: ${department}`);
      if (industry) knownFacts.push(`業種/カテゴリ: ${industry}`);
      if (typeof lead.score === "number") knownFacts.push(`Leadスコア: ${lead.score}`);
      if (text(lead.next_action)) knownFacts.push(`次アクション: ${lead.next_action}`);
    }

    if (prospectId) {
      const { data: prospect, error } = await supabase
        .from("prospects")
        .select(
          `
          id,
          status,
          next_action,
          metadata,
          companies ( name, industry, domain ),
          contacts ( full_name, job_title, department, email )
        `
        )
        .eq("id", prospectId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!prospect) {
        return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
      }
      const company = isRecord(prospect.companies) ? prospect.companies : null;
      const contact = isRecord(prospect.contacts) ? prospect.contacts : null;
      const metadata = isRecord(prospect.metadata) ? prospect.metadata : {};
      const japan = isRecord(metadata.japan_sales) ? metadata.japan_sales : metadata;
      companyName = companyName ?? text(company?.name);
      industry = industry ?? text(company?.industry);
      contactName = text(contact?.full_name);
      jobTitle = jobTitle ?? text(contact?.job_title);
      department = department ?? text(contact?.department);
      email = email ?? text(contact?.email);
      if (companyName) knownFacts.push(`Prospect企業: ${companyName}`);
      if (contactName) knownFacts.push(`担当者: ${contactName}`);
      if (text(prospect.status)) knownFacts.push(`営業ステータス: ${prospect.status}`);
      if (text(japan.purchase_intent)) {
        knownFacts.push(`購買意向: ${japan.purchase_intent}`);
      }
      if (text(japan.approval_status)) {
        knownFacts.push(`稟議/決裁状況: ${japan.approval_status}`);
      }
      if (text(japan.competitor)) knownFacts.push(`競合: ${japan.competitor}`);
    }

    const advice = await analyzeNegotiation({
      companyName,
      contactName,
      jobTitle,
      department,
      email,
      industry,
      knownFacts: Array.from(new Set(knownFacts)),
      customerMessage: message,
    });

    return NextResponse.json({
      ok: true,
      advice,
      usedAi: advice.usedAi,
      amountConfirmed: false,
      sendConfirmed: false,
    });
  } catch (error) {
    console.error("[ai/negotiate]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to analyze negotiation") },
      { status: 500 }
    );
  }
}
