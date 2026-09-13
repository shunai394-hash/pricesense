import { NextResponse } from "next/server";
import {
  buildRevopsReport,
  parseRevopsRange,
  type RevopsDealRow,
  type RevopsIdLeadRow,
  type RevopsLeadRow,
  type RevopsObjectionRow,
  type RevopsProposalRow,
} from "@/lib/ai/revops";
import { isAdminRequest } from "@/lib/server/admin";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

const PAGE_SIZE = 1000;

const LEAD_COLUMNS = "id, lead_source, score, escalation_status, created_at";
const ID_LEAD_COLUMNS = "id, lead_id, created_at";
const PROPOSAL_COLUMNS = "id, lead_id, meeting_id, created_at";
const DEAL_COLUMNS =
  "id, lead_id, status, expected_value, currency, lost_reason, created_at";
const OBJECTION_COLUMNS =
  "id, lead_id, objection_type, response_play, created_at";

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

async function fetchAllRows<T>(
  table: string,
  columns: string,
  range: { fromInclusive: string | null; toExclusive: string | null }
): Promise<T[]> {
  const supabase = getSupabaseAdmin();
  const rows: T[] = [];
  let offset = 0;

  for (;;) {
    let query = supabase
      .from(table)
      .select(columns)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (range.fromInclusive) {
      query = query.gte("created_at", range.fromInclusive);
    }
    if (range.toExclusive) {
      query = query.lt("created_at", range.toExclusive);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

async function fetchLeadSourcesByIds(
  ids: string[]
): Promise<Record<string, string | null>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};

  const supabase = getSupabaseAdmin();
  const lookup: Record<string, string | null> = {};

  for (let i = 0; i < unique.length; i += PAGE_SIZE) {
    const chunk = unique.slice(i, i + PAGE_SIZE);
    const { data, error } = await supabase
      .from("leads")
      .select("id, lead_source")
      .in("id", chunk);

    if (error) {
      throw new Error(`leads(source): ${error.message}`);
    }

    for (const row of data ?? []) {
      lookup[row.id] = typeof row.lead_source === "string" ? row.lead_source : null;
    }
  }

  return lookup;
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
  const parsed = parseRevopsRange(
    url.searchParams.get("from"),
    url.searchParams.get("to")
  );

  if (!parsed.ok) {
    return NextResponse.json(
      { success: false, error: parsed.error },
      { status: 400 }
    );
  }

  try {
    const range = {
      fromInclusive: parsed.range.fromInclusive,
      toExclusive: parsed.range.toExclusive,
    };

    const [leads, handoffs, meetings, proposals, deals, objections] =
      await Promise.all([
        fetchAllRows<RevopsLeadRow>("leads", LEAD_COLUMNS, range),
        fetchAllRows<RevopsIdLeadRow>("sales_handoffs", ID_LEAD_COLUMNS, range),
        fetchAllRows<RevopsIdLeadRow>("sales_meetings", ID_LEAD_COLUMNS, range),
        fetchAllRows<RevopsProposalRow>(
          "proposal_drafts",
          PROPOSAL_COLUMNS,
          range
        ),
        fetchAllRows<RevopsDealRow>("sales_deals", DEAL_COLUMNS, range),
        fetchAllRows<RevopsObjectionRow>(
          "objection_events",
          OBJECTION_COLUMNS,
          range
        ),
      ]);

    const knownLeadIds = new Set(leads.map((lead) => lead.id));
    const missingLeadIds = [
      ...handoffs.map((row) => row.lead_id),
      ...meetings.map((row) => row.lead_id),
      ...proposals.map((row) => row.lead_id),
      ...deals.map((row) => row.lead_id),
      ...objections
        .map((row) => row.lead_id)
        .filter((id): id is string => Boolean(id)),
    ].filter((id) => !knownLeadIds.has(id));

    const extraSources = await fetchLeadSourcesByIds(missingLeadIds);
    const leadSourceById: Record<string, string | null> = { ...extraSources };
    for (const lead of leads) {
      leadSourceById[lead.id] = lead.lead_source;
    }

    const report = buildRevopsReport(
      {
        leads,
        handoffs,
        meetings,
        proposals,
        deals,
        objections,
        leadSourceById,
      },
      parsed.range
    );

    return NextResponse.json({
      success: true,
      kpis: report.kpis,
      funnel: report.funnel,
      lossReasons: report.lossReasons,
      objections: report.objections,
      leadSources: report.leadSources,
      dealValue: report.dealValue,
      period: report.period,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load RevOps";
    console.error("[ai/revops] GET failed:", errorMessage, error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
