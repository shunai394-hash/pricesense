import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import {
  createManualCompany,
  syncLeadsIntoSalesOs,
} from "@/lib/server/sales-os";
import { getSupabaseAdmin } from "@/lib/server/supabase";

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
    const sync = await syncLeadsIntoSalesOs();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id,name,domain,industry,location,employee_count,revenue_range,description,website_url,source,source_id,data,created_at,updated_at"
      )
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      companies: data ?? [],
      count: data?.length ?? 0,
      sync,
      emptyReason:
        (data?.length ?? 0) === 0
          ? "Leadも手動登録企業もないため、Companiesは0件です。架空の企業は表示しません。"
          : null,
    });
  } catch (error) {
    console.error("[sales/companies GET]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load companies") },
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

  const action = body.action === "sync" ? "sync" : "create";

  try {
    if (action === "sync") {
      const sync = await syncLeadsIntoSalesOs();
      return NextResponse.json({ ok: true, sync });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const company = await createManualCompany({
      name,
      domain: typeof body.domain === "string" ? body.domain : null,
      industry: typeof body.industry === "string" ? body.industry : null,
      location: typeof body.location === "string" ? body.location : null,
      employeeCount:
        typeof body.employee_count === "number" ? body.employee_count : null,
      websiteUrl: typeof body.website_url === "string" ? body.website_url : null,
    });

    return NextResponse.json({ ok: true, company });
  } catch (error) {
    console.error("[sales/companies POST]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to save company") },
      { status: 500 }
    );
  }
}
