import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { getSalesIntegration } from "@/lib/server/integrations";
import { syncLeadsIntoSalesOs } from "@/lib/server/sales-os";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncLeadsIntoSalesOs();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("intent_signals")
      .select(
        `
        id,
        company_id,
        prospect_id,
        signal_type,
        signal_strength,
        title,
        description,
        source,
        source_url,
        detected_at,
        metadata,
        created_at,
        companies (
          id,
          name,
          domain
        )
      `
      )
      .order("detected_at", { ascending: false });

    if (error) throw error;

    const salesMarker = getSalesIntegration("sales_marker");
    return NextResponse.json({
      signals: data ?? [],
      count: data?.length ?? 0,
      salesMarker: {
        connected: salesMarker.connected,
        statusLabel: salesMarker.statusLabel,
        detail: salesMarker.detail,
      },
      emptyReason:
        (data?.length ?? 0) === 0
          ? salesMarker.connected
            ? "Intent Signalはありません。Leadスコアや確認済みシグナルがあるとここに表示されます。"
            : "Sales Markerは未接続（APIキー未設定）です。架空の営業シグナルは表示しません。"
          : null,
    });
  } catch (error) {
    console.error("[sales/signals GET]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load intent signals") },
      { status: 500 }
    );
  }
}
