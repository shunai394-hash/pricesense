-- PriceSense Sales OS
-- Extend the existing Lead compatibility bridge with Japanese sales context.

alter table public.leads
  add column if not exists company_name text,
  add column if not exists industry text,
  add column if not exists employee_count integer,
  add column if not exists job_title text,
  add column if not exists department text,
  add column if not exists seniority text,
  add column if not exists decision_maker boolean,
  add column if not exists decision_maker_distance integer,
  add column if not exists existing_relationship boolean,
  add column if not exists reply_received boolean,
  add column if not exists meeting_requested boolean,
  add column if not exists meeting_scheduled boolean,
  add column if not exists relationship_signals jsonb not null default '[]'::jsonb,
  add column if not exists engagement_signals jsonb not null default '[]'::jsonb,
  add column if not exists research_findings jsonb not null default '[]'::jsonb;

create index if not exists leads_company_name_idx
  on public.leads (company_name);

create index if not exists leads_job_title_idx
  on public.leads (job_title);

create index if not exists leads_department_idx
  on public.leads (department);

create index if not exists leads_decision_maker_idx
  on public.leads (decision_maker);
