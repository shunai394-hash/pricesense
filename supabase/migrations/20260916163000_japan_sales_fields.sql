-- Japan B2B sales fields and service_role grants.
-- Additive only. Do not disable RLS.

alter table public.companies
  add column if not exists legal_name text,
  add column if not exists postal_address text,
  add column if not exists existing_services text,
  add column if not exists target_category text,
  add column if not exists contact_route text;

alter table public.contacts
  add column if not exists is_decision_maker boolean not null default false;

alter table public.prospects
  add column if not exists purchase_intent text,
  add column if not exists adoption_timing text,
  add column if not exists budget_notes text,
  add column if not exists decision_maker text,
  add column if not exists competitor text,
  add column if not exists existing_relationship text,
  add column if not exists meeting_notes_ja text,
  add column if not exists approval_status text,
  add column if not exists price_negotiation text,
  add column if not exists delivery_terms text,
  add column if not exists payment_terms text,
  add column if not exists contract_terms text,
  add column if not exists followup_due_at timestamptz;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant all on table public.quote_drafts to service_role;
grant all on table public.lead_followups to service_role;
grant all on table public.companies to service_role;
grant all on table public.contacts to service_role;
grant all on table public.prospects to service_role;
grant all on table public.intent_signals to service_role;
grant all on table public.research_results to service_role;
grant all on table public.sequences to service_role;
grant all on table public.sequence_steps to service_role;
grant all on table public.campaigns to service_role;
grant all on table public.outreach_messages to service_role;
grant all on table public.inbox_messages to service_role;
grant all on table public.leads to service_role;
grant all on table public.sales_meetings to service_role;
grant all on table public.proposal_drafts to service_role;
grant all on table public.sales_deals to service_role;
