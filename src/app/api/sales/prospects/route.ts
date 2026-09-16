import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import {
  ensureProspect,
  promoteProspectToLead,
  syncLeadsIntoSalesOs,
} from "@/lib/server/sales-os";
import { loadSalesOsProspects } from "@/lib/server/sales-workspace";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncLeadsIntoSalesOs();
    const prospects = await loadSalesOsProspects();

    return NextResponse.json({
      prospects,
      count: prospects.length,
      emptyReason:
        prospects.length === 0
          ? "Prospectはありません。Lead同期または企業のProspect化で作成されます。"
          : null,
    });
  } catch (error) {
    console.error("[sales/prospects GET]", error);

    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load prospects") },
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
    if (body.action === "promote") {
      if (typeof body.prospect_id !== "string" || !UUID_RE.test(body.prospect_id)) {
        return NextResponse.json({ error: "prospect_id is required" }, { status: 400 });
      }
      const promoted = await promoteProspectToLead(body.prospect_id);
      return NextResponse.json({ ok: true, ...promoted });
    }

    if (body.action === "japan_update") {
      if (typeof body.prospect_id !== "string" || !UUID_RE.test(body.prospect_id)) {
        return NextResponse.json({ error: "prospect_id is required" }, { status: 400 });
      }
      const { getSupabaseAdmin } = await import("@/lib/server/supabase");
      const supabase = getSupabaseAdmin();
      const { data: existing, error: loadError } = await supabase
        .from("prospects")
        .select("id, metadata")
        .eq("id", body.prospect_id)
        .maybeSingle();
      if (loadError) throw new Error(loadError.message);
      if (!existing) {
        return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
      }
      const metadata = isRecord(existing.metadata) ? existing.metadata : {};
      const japanSales = {
        ...(isRecord(metadata.japan_sales) ? metadata.japan_sales : {}),
        purchase_intent:
          typeof body.purchase_intent === "string" ? body.purchase_intent : undefined,
        adoption_timing:
          typeof body.adoption_timing === "string" ? body.adoption_timing : undefined,
        budget_notes:
          typeof body.budget_notes === "string" ? body.budget_notes : undefined,
        decision_maker:
          typeof body.decision_maker === "string" ? body.decision_maker : undefined,
        competitor: typeof body.competitor === "string" ? body.competitor : undefined,
        existing_relationship:
          typeof body.existing_relationship === "string"
            ? body.existing_relationship
            : undefined,
        meeting_notes_ja:
          typeof body.meeting_notes_ja === "string" ? body.meeting_notes_ja : undefined,
        approval_status:
          typeof body.approval_status === "string" ? body.approval_status : undefined,
        price_negotiation:
          typeof body.price_negotiation === "string" ? body.price_negotiation : undefined,
        delivery_terms:
          typeof body.delivery_terms === "string" ? body.delivery_terms : undefined,
        payment_terms:
          typeof body.payment_terms === "string" ? body.payment_terms : undefined,
        contract_terms:
          typeof body.contract_terms === "string" ? body.contract_terms : undefined,
      };
      const { error: updateError } = await supabase
        .from("prospects")
        .update({
          metadata: { ...metadata, japan_sales: japanSales },
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.prospect_id);
      if (updateError) throw new Error(updateError.message);
      return NextResponse.json({ ok: true, prospectId: body.prospect_id, japan_sales: japanSales });
    }

    const companyId =
      typeof body.company_id === "string" && UUID_RE.test(body.company_id)
        ? body.company_id
        : null;
    const contactId =
      typeof body.contact_id === "string" && UUID_RE.test(body.contact_id)
        ? body.contact_id
        : null;

    if (!companyId) {
      return NextResponse.json({ error: "company_id is required" }, { status: 400 });
    }

    const prospect = await ensureProspect({
      companyId,
      contactId,
    });

    return NextResponse.json({
      ok: true,
      prospect: { id: prospect.id },
      created: prospect.created,
    });
  } catch (error) {
    console.error("[sales/prospects POST]", error);

    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to update prospect") },
      { status: 500 }
    );
  }
}
