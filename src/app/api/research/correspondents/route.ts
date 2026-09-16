import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { runCorrespondent, runDueCorrespondents } from "@/lib/research/engine";

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
      .from("research_correspondents")
      .select(
        "id, slug, name, role, correspondent_type, region_code, country_code, industries, topics, search_query, cadence_minutes, sources, status, current_focus, last_run_at, last_error, created_at, updated_at"
      )
      .order("name");
    if (error) throw error;
    return NextResponse.json({
      correspondents: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load correspondents") },
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
    const action = typeof body.action === "string" ? body.action : "run_due";

    if (action === "run_due") {
      const result = await runDueCorrespondents(3);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "run") {
      if (typeof body.id !== "string" || !UUID_RE.test(body.id)) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }
      const result = await runCorrespondent(body.id);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "set_status") {
      if (typeof body.id !== "string" || !UUID_RE.test(body.id)) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }
      const status = body.status === "paused" ? "paused" : "active";
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from("research_correspondents")
        .update({
          status,
          last_error: status === "active" ? null : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, id: body.id, status });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to update correspondent") },
      { status: 500 }
    );
  }
}
