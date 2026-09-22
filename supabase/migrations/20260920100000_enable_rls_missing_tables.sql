-- Fail closed: anon/authenticated cannot read these tables. service_role bypasses RLS.
-- These 14 tables were created in earlier migrations without RLS enabled, unlike every
-- other table in this schema. No policies are added, matching the existing convention
-- (see 20260914152142_initial_ai_sales.sql) where server code always uses the
-- service_role client and anon/authenticated access is denied entirely.
alter table public.leads enable row level security;
alter table public.premium_subscriptions enable row level security;
alter table public.objection_bank enable row level security;
alter table public.objection_events enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.prospects enable row level security;
alter table public.intent_signals enable row level security;
alter table public.research_results enable row level security;
alter table public.sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.campaigns enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.inbox_messages enable row level security;
