import { NextResponse } from "next/server";
import { isUuid, planCancel } from "@/lib/ai/sales-ops";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { publicErrorMessage } from "@/lib/server/public-error";
import {
  apiSalesActionEvent,
  findSalesActionEventById,
  updateSalesActionEvent,
} from "@/lib/server/sales-action-events";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  if (!isRecord(body) || !isUuid(body.eventId)) {
    return NextResponse.json(
      { success: false, error: "Invalid eventId" },
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
    const original = await findSalesActionEventById(body.eventId);
    if (!original) {
      return NextResponse.json(
        { success: false, error: "Action event not found" },
        { status: 404 }
      );
    }

    const planned = planCancel(original);
    if (!planned.ok) {
      return NextResponse.json(
        { success: false, error: planned.error },
        { status: 400 }
      );
    }

    const history = await updateSalesActionEvent(planned.event);
    return NextResponse.json({
      success: true,
      cancelled: true,
      history: apiSalesActionEvent(history),
    });
  } catch (error) {
    const errorMessage = publicErrorMessage(error, "Failed to cancel sales action");
    console.error("[ai/sales-action-cancel] POST failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
