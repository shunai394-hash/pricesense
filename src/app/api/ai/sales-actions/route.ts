import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { publicErrorMessage } from "@/lib/server/public-error";
import {
  loadSalesWorkspaceSnapshot,
  lookupDealLeadId,
} from "@/lib/server/sales-workspace";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isDealId(value: string): boolean {
  return UUID_RE.test(value);
}

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
  const dealId = url.searchParams.get("dealId")?.trim() || "";
  const include = url.searchParams.get("include")?.trim() || "";

  try {
    if (dealId) {
      if (!isDealId(dealId)) {
        return NextResponse.json(
          { success: false, error: "Invalid dealId" },
          { status: 400 }
        );
      }
      const found = await lookupDealLeadId(dealId);
      if (!found) {
        return NextResponse.json(
          { success: false, error: "Deal not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        dealId: found.dealId,
        leadId: found.leadId,
      });
    }

    const snapshot = await loadSalesWorkspaceSnapshot({
      includeWorkspace: include === "workspace",
    });

    return NextResponse.json({
      success: true,
      actions: snapshot.actions,
      counts: snapshot.counts,
      activity: snapshot.activity,
      ...(snapshot.workspace ? { workspace: snapshot.workspace } : {}),
    });
  } catch (error) {
    const errorMessage = publicErrorMessage(error, "Failed to load sales actions");
    console.error("[ai/sales-actions] GET failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
