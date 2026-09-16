import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { ingestSourceUrl } from "@/lib/research/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const consumer = url.searchParams.get("consumer");
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("research_discoveries")
      .select(
        `
        id,
        correspondent_id,
        run_id,
        source_id,
        title,
        fact_text,
        interpretation,
        hypothesis,
        unknown,
        verification_status,
        region_code,
        country,
        language,
        consumer_targets,
        pricesense_status,
        newfind_status,
        needs_human_review,
        used_ai,
        ai_model,
        created_at,
        research_sources ( url, source_name, published_at, retrieved_at, source_type, language, country, verification_status ),
        research_organizations ( id, name, domain, country ),
        research_brands ( id, name ),
        research_correspondents ( id, name, correspondent_type, region_code )
      `
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (consumer === "pricesense") {
      query = query.contains("consumer_targets", ["pricesense"]);
    }
    if (consumer === "newfind") {
      query = query.contains("consumer_targets", ["newfind"]);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      discoveries: data ?? [],
      count: data?.length ?? 0,
      emptyReason:
        (data?.length ?? 0) === 0
          ? "発見はまだありません。特派員を実行するか、確認済みURLを取り込んでください。架空のニュースは表示しません。"
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load discoveries") },
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
    if (typeof body.url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }
    const result = await ingestSourceUrl({
      url: body.url,
      correspondentId:
        typeof body.correspondent_id === "string" ? body.correspondent_id : null,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to ingest source") },
      { status: 400 }
    );
  }
}
