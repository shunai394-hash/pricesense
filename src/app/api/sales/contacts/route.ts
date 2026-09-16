import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import {
  createManualContact,
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
    await syncLeadsIntoSalesOs();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("contacts")
      .select(
        `
        id,
        company_id,
        first_name,
        last_name,
        full_name,
        job_title,
        department,
        seniority,
        email,
        phone,
        linkedin_url,
        source,
        source_id,
        created_at,
        updated_at,
        companies (
          id,
          name,
          domain
        )
      `
      )
      .order("full_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      contacts: data ?? [],
      count: data?.length ?? 0,
      emptyReason:
        (data?.length ?? 0) === 0
          ? "Lead由来の担当者も手動登録もないため、Contactsは0件です。"
          : null,
    });
  } catch (error) {
    console.error("[sales/contacts GET]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load contacts") },
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

  const companyId = typeof body.company_id === "string" ? body.company_id : "";
  if (!companyId) {
    return NextResponse.json({ error: "company_id is required" }, { status: 400 });
  }

  try {
    const contact = await createManualContact({
      companyId,
      fullName: typeof body.full_name === "string" ? body.full_name : null,
      email: typeof body.email === "string" ? body.email : null,
      jobTitle: typeof body.job_title === "string" ? body.job_title : null,
      department: typeof body.department === "string" ? body.department : null,
      phone: typeof body.phone === "string" ? body.phone : null,
    });
    return NextResponse.json({ ok: true, contact });
  } catch (error) {
    console.error("[sales/contacts POST]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to save contact") },
      { status: 500 }
    );
  }
}
