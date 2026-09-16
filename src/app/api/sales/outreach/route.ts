import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { generateOutreachDraft, type OutreachKind } from "@/lib/ai/sales-outreach";
import { isInstantlyConnected } from "@/lib/server/integrations";
import { loadProspectContext, syncLeadsIntoSalesOs } from "@/lib/server/sales-os";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isOutreachKind(value: unknown): value is OutreachKind {
  return (
    value === "initial" ||
    value === "followup" ||
    value === "refollow" ||
    value === "objection"
  );
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("outreach_messages")
      .select(
        `
        id,
        campaign_id,
        sequence_id,
        sequence_step_id,
        prospect_id,
        contact_id,
        channel,
        direction,
        subject,
        body,
        status,
        scheduled_at,
        sent_at,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      outreach: data ?? [],
      count: data?.length ?? 0,
      emptyReason:
        (data?.length ?? 0) === 0
          ? "送信済みメールはありません。Prospectから下書きを作成できます。Instantly未接続のため外部送信はしません。"
          : null,
      instantly: isInstantlyConnected()
        ? { connected: true, statusLabel: "接続済み" }
        : { connected: false, statusLabel: "未接続", detail: "APIキー未設定" },
    });
  } catch (error) {
    console.error("[sales/outreach GET]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load outreach messages") },
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

  if (!isRecord(body) || typeof body.prospect_id !== "string" || !UUID_RE.test(body.prospect_id)) {
    return NextResponse.json({ error: "prospect_id is required" }, { status: 400 });
  }

  const kind: OutreachKind = isOutreachKind(body.kind) ? body.kind : "initial";

  try {
    await syncLeadsIntoSalesOs();
    const context = await loadProspectContext(body.prospect_id);
    if (!context) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const idempotencyKey = `outreach:${context.prospectId}:${kind}`;
    const { data: existingRows, error: existingError } = await supabase
      .from("outreach_messages")
      .select("id, subject, body, status, created_at")
      .eq("prospect_id", context.prospectId);
    if (existingError) throw new Error(existingError.message);
    const existing = (existingRows ?? []).find((row) =>
      typeof row.body === "string" && row.body.includes(`[idempotency:${idempotencyKey}]`)
    );

    if (existing?.id) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        outreach: existing,
        externalDelivery: "none",
        instantly: isInstantlyConnected()
          ? { connected: true, statusLabel: "接続済み" }
          : { connected: false, statusLabel: "未接続", detail: "APIキー未設定" },
      });
    }

    const draft = await generateOutreachDraft({
      kind,
      companyName: context.companyName,
      domain: context.domain,
      industry: context.industry,
      contactName: context.contactName,
      jobTitle: context.jobTitle,
      email: context.email,
      score: context.score,
      nextAction: context.nextAction,
      conversation: context.conversation,
      objection: typeof body.objection === "string" ? body.objection : null,
    });

    const { data, error } = await supabase
      .from("outreach_messages")
      .insert({
        prospect_id: context.prospectId,
        contact_id: context.contactId,
        channel: "email",
        direction: "outbound",
        subject: draft.subject,
        body: `${draft.body}\n\n[idempotency:${idempotencyKey}]`,
        status: "draft",
      })
      .select(
        "id, prospect_id, contact_id, channel, direction, subject, body, status, scheduled_at, sent_at, created_at"
      )
      .single();

    if (error) throw error;

    await supabase
      .from("prospects")
      .update({
        next_action: draft.nextAction,
        last_activity_at: new Date().toISOString(),
        status: "contacted_draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.prospectId);

    return NextResponse.json({
      ok: true,
      duplicate: false,
      outreach: data,
      usedAi: draft.usedAi,
      externalDelivery: "none",
      instantly: isInstantlyConnected()
        ? { connected: true, statusLabel: "接続済み" }
        : { connected: false, statusLabel: "未接続", detail: "APIキー未設定" },
    });
  } catch (error) {
    console.error("[sales/outreach POST]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to create outreach draft") },
      { status: 500 }
    );
  }
}
