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
      .from("quote_drafts")
      .select(
        "id, lead_id, meeting_id, items, subtotal, discount, total, currency, assumptions, valid_until, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      quotes: data ?? [],
      count: data?.length ?? 0,
      emptyReason:
        (data?.length ?? 0) === 0
          ? "見積ドラフトはありません。商談メモから作成できます。金額は人間が確定します。"
          : null,
    });
  } catch (error) {
    console.error("[sales/quotes GET]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load quote drafts") },
      { status: 500 }
    );
  }
}
