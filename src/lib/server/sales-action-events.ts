import {
  apiSalesActionEvent,
  parseSalesActionEventRow,
  resolveHistoryWrite,
  salesActionEventToRow,
  type SalesActionEvent,
  type SalesActionEventDraft,
} from "@/lib/ai/sales-action-history";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const EVENT_COLUMNS =
  "id, lead_id, deal_id, action_type, priority, operation, action_content, previous_status, next_status, result, executed_by, executed_at, reason, metadata, idempotency_key, created_at";

export function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return /duplicate key|unique constraint/i.test(error.message ?? "");
}

export async function listSalesActionEventsForLead(
  leadId: string
): Promise<SalesActionEvent[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sales_action_events")
    .select(EVENT_COLUMNS)
    .eq("lead_id", leadId)
    .order("executed_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map(parseSalesActionEventRow)
    .filter((row): row is SalesActionEvent => Boolean(row));
}

export async function listSalesActionEventsInRange(input: {
  fromInclusive: string;
  toExclusive: string;
}): Promise<SalesActionEvent[]> {
  const supabase = getSupabaseAdmin();
  const rows: SalesActionEvent[] = [];
  const pageSize = 1000;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("sales_action_events")
      .select(EVENT_COLUMNS)
      .gte("executed_at", input.fromInclusive)
      .lt("executed_at", input.toExclusive)
      .order("executed_at", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? [])
      .map(parseSalesActionEventRow)
      .filter((row): row is SalesActionEvent => Boolean(row));
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

export async function findLatestSalesActionEvent(
  leadId: string,
  operation: string
): Promise<SalesActionEvent | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sales_action_events")
    .select(EVENT_COLUMNS)
    .eq("lead_id", leadId)
    .eq("operation", operation)
    .order("executed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parseSalesActionEventRow(data);
}

export async function findSalesActionEventByKey(
  leadId: string,
  idempotencyKey: string
): Promise<SalesActionEvent | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sales_action_events")
    .select(EVENT_COLUMNS)
    .eq("lead_id", leadId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parseSalesActionEventRow(data);
}

export async function recordSalesActionEvent(
  draft: SalesActionEventDraft,
  now: Date = new Date()
): Promise<{ event: SalesActionEvent; duplicate: boolean }> {
  const supabase = getSupabaseAdmin();
  const resolved = resolveHistoryWrite([], draft, now);
  const row = salesActionEventToRow(resolved.event);

  const inserted = await supabase
    .from("sales_action_events")
    .insert(row)
    .select(EVENT_COLUMNS)
    .maybeSingle();

  if (!inserted.error && inserted.data) {
    const parsed = parseSalesActionEventRow(inserted.data);
    return {
      event: parsed ?? resolved.event,
      duplicate: false,
    };
  }

  if (inserted.error && isUniqueViolation(inserted.error)) {
    const { data, error } = await supabase
      .from("sales_action_events")
      .select(EVENT_COLUMNS)
      .eq("lead_id", resolved.event.leadId)
      .eq("idempotency_key", resolved.event.idempotencyKey)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const existing = parseSalesActionEventRow(data);
    if (existing) {
      return { event: { ...existing, result: "duplicate" }, duplicate: true };
    }
  }

  if (inserted.error) throw new Error(inserted.error.message);
  return { event: resolved.event, duplicate: false };
}

export { apiSalesActionEvent };
