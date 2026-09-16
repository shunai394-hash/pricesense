import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { analyzeInboxMessage } from "@/lib/ai/sales-outreach";
import {
  loadProspectContext,
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
    await syncLeadsIntoSalesOs();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("inbox_messages")
      .select(
        `
        id,
        prospect_id,
        contact_id,
        outreach_message_id,
        channel,
        direction,
        subject,
        body,
        sentiment,
        ai_classification,
        ai_reply,
        status,
        received_at,
        created_at
      `
      )
      .order("received_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      messages: data ?? [],
      count: data?.length ?? 0,
      emptyReason:
        (data?.length ?? 0) === 0
          ? "受信メールはありません。Lead会話の返信、または手動記録があるとここに表示されます。"
          : null,
    });
  } catch (error) {
    console.error("[sales/inbox GET]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load inbox messages") },
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

  const action =
    body.action === "analyze" || body.action === "handoff" || body.action === "record"
      ? body.action
      : "record";

  try {
    const supabase = getSupabaseAdmin();

    if (action === "record") {
      if (typeof body.prospect_id !== "string" || !UUID_RE.test(body.prospect_id)) {
        return NextResponse.json({ error: "prospect_id is required" }, { status: 400 });
      }
      const text = typeof body.body === "string" ? body.body.trim() : "";
      if (!text) {
        return NextResponse.json({ error: "body is required" }, { status: 400 });
      }

      const context = await loadProspectContext(body.prospect_id);
      if (!context) {
        return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
      }

      const analysis = await analyzeInboxMessage({
        body: text,
        subject: typeof body.subject === "string" ? body.subject : null,
        companyName: context.companyName,
        conversation: context.conversation,
      });

      const { data: existing } = await supabase
        .from("inbox_messages")
        .select("id")
        .eq("prospect_id", context.prospectId)
        .eq("body", text)
        .maybeSingle();

      if (existing?.id) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          messageId: existing.id,
        });
      }

      const { data, error } = await supabase
        .from("inbox_messages")
        .insert({
          prospect_id: context.prospectId,
          contact_id: context.contactId,
          channel: "email",
          direction: "inbound",
          subject: typeof body.subject === "string" ? body.subject : "手動記録の返信",
          body: text,
          sentiment: analysis.sentiment,
          ai_classification: analysis.classification,
          ai_reply: analysis.replyDraft,
          status: analysis.recommendHandoff ? "needs_handoff" : "unread",
          received_at: new Date().toISOString(),
        })
        .select(
          "id, prospect_id, contact_id, subject, body, sentiment, ai_classification, ai_reply, status, received_at"
        )
        .single();

      if (error) throw error;

      await supabase
        .from("prospects")
        .update({
          next_action: analysis.nextAction,
          last_activity_at: new Date().toISOString(),
          status: analysis.recommendHandoff ? "handoff_recommended" : "replied",
          updated_at: new Date().toISOString(),
        })
        .eq("id", context.prospectId);

      return NextResponse.json({
        ok: true,
        duplicate: false,
        message: data,
        analysis,
        usedAi: analysis.usedAi,
      });
    }

    if (typeof body.message_id !== "string" || !UUID_RE.test(body.message_id)) {
      return NextResponse.json({ error: "message_id is required" }, { status: 400 });
    }

    const { data: message, error: messageError } = await supabase
      .from("inbox_messages")
      .select("id, prospect_id, subject, body, status")
      .eq("id", body.message_id)
      .maybeSingle();
    if (messageError) throw new Error(messageError.message);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (action === "analyze") {
      const context = message.prospect_id
        ? await loadProspectContext(message.prospect_id)
        : null;
      const analysis = await analyzeInboxMessage({
        body: message.body ?? "",
        subject: message.subject,
        companyName: context?.companyName ?? null,
        conversation: context?.conversation ?? [],
      });

      const { error: updateError } = await supabase
        .from("inbox_messages")
        .update({
          sentiment: analysis.sentiment,
          ai_classification: analysis.classification,
          ai_reply: analysis.replyDraft,
          status: analysis.recommendHandoff ? "needs_handoff" : "reviewed",
        })
        .eq("id", message.id);
      if (updateError) throw new Error(updateError.message);

      return NextResponse.json({
        ok: true,
        analysis,
        usedAi: analysis.usedAi,
        recommendHandoff: analysis.recommendHandoff,
      });
    }

    if (message.status === "handed_off") {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        handoff: true,
      });
    }

    const { error: updateError } = await supabase
      .from("inbox_messages")
      .update({ status: "handed_off" })
      .eq("id", message.id);
    if (updateError) throw new Error(updateError.message);

    if (message.prospect_id) {
      const context = await loadProspectContext(message.prospect_id);
      await supabase
        .from("prospects")
        .update({
          status: "handoff_requested",
          next_action: "human_handoff_requested",
          updated_at: new Date().toISOString(),
        })
        .eq("id", message.prospect_id);

      if (context?.leadId) {
        const handoffRequest = new Request(request.url, {
          method: "POST",
          headers: request.headers,
          body: JSON.stringify({ leadId: context.leadId }),
        });
        const { POST: postHandoff } = await import("@/app/api/ai/handoff/route");
        await postHandoff(handoffRequest);
      }
    }

    return NextResponse.json({
      ok: true,
      duplicate: false,
      handoff: true,
    });
  } catch (error) {
    console.error("[sales/inbox POST]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to update inbox") },
      { status: 500 }
    );
  }
}
