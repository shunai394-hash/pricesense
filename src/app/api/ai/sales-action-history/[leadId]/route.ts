import { NextResponse } from "next/server";
import { apiSalesActionEvent } from "@/lib/ai/sales-action-history";
import { parseOptionalLeadId } from "@/lib/sales/scoring";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { listSalesActionEventsForLead } from "@/lib/server/sales-action-events";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ leadId: string }> }
) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  const params = await context.params;
  const leadId = parseOptionalLeadId({ leadId: params.leadId });
  if (!leadId) {
    return NextResponse.json(
      { success: false, error: "Invalid leadId" },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    const configError = getSupabaseConfigError() ?? "Lead API is not configured";
    return NextResponse.json(
      { success: false, error: configError },
      { status: 503 }
    );
  }

  try {
    const history = await listSalesActionEventsForLead(leadId);
    return NextResponse.json({
      success: true,
      leadId,
      history: history.map(apiSalesActionEvent),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load action history";
    console.error("[ai/sales-action-history] GET failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
