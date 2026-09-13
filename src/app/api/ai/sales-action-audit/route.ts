import { NextResponse } from "next/server";
import { isSalesActionStatus, utcDayBounds } from "@/lib/ai/sales-action-history";
import { parseOptionalLeadId } from "@/lib/sales/scoring";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { publicErrorMessage } from "@/lib/server/public-error";
import {
  apiSalesActionEvent,
  countSalesActionEventsByStatus,
  listSalesActionEvents,
  listSalesActionEventsInRange,
} from "@/lib/server/sales-action-events";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  if (!isSupabaseConfigured()) {
    const configError = getSupabaseConfigError() ?? "Lead API is not configured";
    return NextResponse.json(
      { success: false, error: configError },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const statusRaw = url.searchParams.get("status");
  const status =
    statusRaw && isSalesActionStatus(statusRaw) ? statusRaw : null;
  if (statusRaw && !status) {
    return NextResponse.json(
      { success: false, error: "Invalid status" },
      { status: 400 }
    );
  }

  const leadIdRaw = url.searchParams.get("leadId");
  const leadId = leadIdRaw
    ? parseOptionalLeadId({ leadId: leadIdRaw })
    : null;
  if (leadIdRaw && !leadId) {
    return NextResponse.json(
      { success: false, error: "Invalid leadId" },
      { status: 400 }
    );
  }
  const limitRaw = Number(url.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 100;

  try {
    const now = new Date();
    const [events, counts, todayEvents] = await Promise.all([
      listSalesActionEvents({
        status,
        leadId,
        limit,
      }),
      countSalesActionEventsByStatus(),
      listSalesActionEventsInRange(utcDayBounds(now)),
    ]);

    return NextResponse.json({
      success: true,
      events: events.map(apiSalesActionEvent),
      counts,
      failedToday: todayEvents.filter((event) => event.status === "failed")
        .length,
      filter: {
        status,
        leadId,
        limit: Math.min(Math.max(limit, 1), 500),
      },
    });
  } catch (error) {
    const errorMessage = publicErrorMessage(error, "Failed to load sales audit");
    console.error("[ai/sales-action-audit] GET failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
