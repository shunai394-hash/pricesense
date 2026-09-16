import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import {
  enrollProspectInSequence,
  ensureDefaultSequence,
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
    const { data: sequences, error: sequenceError } = await supabase
      .from("sequences")
      .select("id,name,description,status,channel,owner,created_at,updated_at")
      .order("updated_at", { ascending: false });

    if (sequenceError) throw sequenceError;

    const ids = (sequences ?? []).map((sequence) => sequence.id);
    let steps: Array<{ sequence_id: string }> = [];

    if (ids.length > 0) {
      const { data: stepData, error: stepError } = await supabase
        .from("sequence_steps")
        .select(
          "id,sequence_id,step_number,channel,delay_hours,subject_template,body_template,ai_generated,created_at"
        )
        .in("sequence_id", ids)
        .order("step_number", { ascending: true });

      if (stepError) throw stepError;
      steps = (stepData ?? []) as Array<{ sequence_id: string }>;
    }

    const stepsBySequence = new Map<string, unknown[]>();
    for (const step of steps) {
      const existing = stepsBySequence.get(step.sequence_id) ?? [];
      existing.push(step);
      stepsBySequence.set(step.sequence_id, existing);
    }

    const result = (sequences ?? []).map((sequence) => ({
      ...sequence,
      steps: stepsBySequence.get(sequence.id) ?? [],
    }));

    return NextResponse.json({
      sequences: result,
      count: result.length,
      emptyReason:
        result.length === 0
          ? "シーケンスはまだありません。テンプレートを作成できます。自動送信はしません。"
          : null,
    });
  } catch (error) {
    console.error("[sales/sequences GET]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load sequences") },
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

  const action = body.action === "enroll" ? "enroll" : "ensure_default";

  try {
    if (action === "ensure_default") {
      const sequence = await ensureDefaultSequence();
      return NextResponse.json({ ok: true, sequence, externalDelivery: "none" });
    }

    if (typeof body.prospect_id !== "string" || !UUID_RE.test(body.prospect_id)) {
      return NextResponse.json({ error: "prospect_id is required" }, { status: 400 });
    }

    const enrolled = await enrollProspectInSequence({
      prospectId: body.prospect_id,
      sequenceId:
        typeof body.sequence_id === "string" && UUID_RE.test(body.sequence_id)
          ? body.sequence_id
          : undefined,
    });

    return NextResponse.json({
      ok: true,
      ...enrolled,
      externalDelivery: "none",
    });
  } catch (error) {
    console.error("[sales/sequences POST]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to update sequence") },
      { status: 500 }
    );
  }
}
