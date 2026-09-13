import {
  apiSalesActionEvent,
  isSalesActionStatus,
  parseSalesActionEventRow,
  resolveHistoryWrite,
  salesActionEventToRow,
  type SalesActionEvent,
  type SalesActionEventDraft,
  type SalesActionStatus,
} from "@/lib/ai/sales-action-history";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const EVENT_COLUMNS =
  "id, lead_id, deal_id, action_type, priority, operation, action_content, previous_status, next_status, result, status, executed_by, executed_at, completed_at, created_at, error, actor_kind, retry_of, attempt, external_delivery, approval_required, reason, metadata, idempotency_key";

export function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return /duplicate key|unique constraint/i.test(error.message ?? "");
}

function parseRows(data: unknown): SalesActionEvent[] {
  if (!Array.isArray(data)) return [];
  return data
    .map(parseSalesActionEventRow)
    .filter((row): row is SalesActionEvent => Boolean(row));
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
  return parseRows(data);
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
    const batch = parseRows(data);
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

export async function listSalesActionEvents(input: {
  status?: SalesActionStatus | null;
  leadId?: string | null;
  limit?: number;
}): Promise<SalesActionEvent[]> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  let query = supabase
    .from("sales_action_events")
    .select(EVENT_COLUMNS)
    .order("executed_at", { ascending: false })
    .limit(limit);
  if (input.status && isSalesActionStatus(input.status)) {
    query = query.eq("status", input.status);
  }
  if (input.leadId) {
    query = query.eq("lead_id", input.leadId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return parseRows(data);
}

export async function countSalesActionEventsByStatus(): Promise<
  Record<SalesActionStatus, number>
> {
  const supabase = getSupabaseAdmin();
  const statuses: SalesActionStatus[] = [
    "pending",
    "running",
    "succeeded",
    "failed",
    "skipped",
    "cancelled",
  ];
  const counts = {
    pending: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
  } satisfies Record<SalesActionStatus, number>;

  for (const status of statuses) {
    const { count, error } = await supabase
      .from("sales_action_events")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    if (error) throw new Error(error.message);
    counts[status] = count ?? 0;
  }
  return counts;
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

export async function findSalesActionEventById(
  eventId: string
): Promise<SalesActionEvent | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sales_action_events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
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
      if (existing.status === "failed" || existing.status === "cancelled") {
        return { event: existing, duplicate: true };
      }
      return {
        event: { ...existing, result: "duplicate", status: "skipped" },
        duplicate: true,
      };
    }
  }

  if (inserted.error) throw new Error(inserted.error.message);
  return { event: resolved.event, duplicate: false };
}

export async function updateSalesActionEvent(
  event: SalesActionEvent
): Promise<SalesActionEvent> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sales_action_events")
    .update({
      result: event.result,
      status: event.status,
      completed_at: event.completedAt,
      error: event.error,
      reason: event.reason,
      metadata: event.metadata,
    })
    .eq("id", event.id)
    .select(EVENT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parseSalesActionEventRow(data) ?? event;
}

export { apiSalesActionEvent };
