-- Additive Day-11 ops columns for existing production DBs.
-- Safe to re-run. Do NOT drop or recreate tables.
-- If you already ran the full supabase/schema.sql after Day-11, this is a no-op.

-- AI sales (Day-11 additive — do not drop or recreate sales_action_events)
alter table public.sales_action_events add column if not exists status text not null default 'succeeded';
alter table public.sales_action_events add column if not exists error text;
alter table public.sales_action_events add column if not exists completed_at timestamptz;
alter table public.sales_action_events add column if not exists actor_kind text not null default 'human';
alter table public.sales_action_events add column if not exists retry_of uuid;
alter table public.sales_action_events add column if not exists attempt integer not null default 1;
alter table public.sales_action_events add column if not exists external_delivery text not null default 'none';
alter table public.sales_action_events add column if not exists approval_required boolean not null default false;

update public.sales_action_events
set status = 'skipped'
where result = 'duplicate' and status = 'succeeded';

update public.sales_action_events
set completed_at = coalesce(completed_at, executed_at, created_at)
where completed_at is null;

create index if not exists sales_action_events_status_idx
  on public.sales_action_events (status);
create index if not exists sales_action_events_retry_of_idx
  on public.sales_action_events (retry_of);

-- Fail closed: anon/authenticated cannot read sales ops tables. service_role bypasses RLS.
alter table public.sales_action_events enable row level security;
alter table public.sales_deals enable row level security;
alter table public.deal_followup_events enable row level security;
alter table public.sales_followups enable row level security;
alter table public.lead_followups enable row level security;
alter table public.followup_events enable row level security;
alter table public.sales_handoffs enable row level security;
alter table public.sales_meetings enable row level security;
alter table public.proposal_drafts enable row level security;
alter table public.quote_drafts enable row level security;
