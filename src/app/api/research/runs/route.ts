import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("research_runs")
      .select(
        "id, correspondent_id, status, started_at, finished_at, items_fetched, discoveries_created, duplicates_skipped, error_count, used_ai, error_message, current_focus"
      )
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ runs: data ?? [], count: data?.length ?? 0 });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load research runs") },
      { status: 500 }
    );
  }
}
