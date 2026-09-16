-- PriceSense Sales OS
-- Model sources:
-- companies / contacts : Apollo + Sansan
-- prospects            : Apollo
-- intent_signals       : Sales Marker
-- research_results     : Clay
-- sequences             : Apollo + Instantly
-- campaigns             : Instantly + Sales Marker
-- outreach_messages     : Instantly
-- inbox_messages        : Instantly

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  industry text,
  location text,
  employee_count integer,
  revenue_range text,
  description text,
  website_url text,
  source text,
  source_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_name_idx
  on public.companies (name);
create index if not exists companies_domain_idx
  on public.companies (domain);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  first_name text,
  last_name text,
  full_name text,
  job_title text,
  department text,
  seniority text,
  email text,
  phone text,
  linkedin_url text,
  source text,
  source_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_company_id_idx
  on public.contacts (company_id);
create index if not exists contacts_email_idx
  on public.contacts (email);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  status text not null default 'new',
  score integer,
  fit_score integer,
  intent_score integer,
  priority text,
  owner text,
  source text,
  source_id text,
  last_activity_at timestamptz,
  next_action text,
  next_action_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospects_company_id_idx
  on public.prospects (company_id);
create index if not exists prospects_contact_id_idx
  on public.prospects (contact_id);
create index if not exists prospects_score_idx
  on public.prospects (score desc);
create index if not exists prospects_status_idx
  on public.prospects (status);

create table if not exists public.intent_signals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  prospect_id uuid references public.prospects (id) on delete cascade,
  signal_type text not null,
  signal_strength integer,
  title text,
  description text,
  source text,
  source_url text,
  detected_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists intent_signals_company_id_idx
  on public.intent_signals (company_id);
create index if not exists intent_signals_prospect_id_idx
  on public.intent_signals (prospect_id);
create index if not exists intent_signals_detected_at_idx
  on public.intent_signals (detected_at desc);

create table if not exists public.research_results (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  prospect_id uuid references public.prospects (id) on delete cascade,
  research_type text not null,
  summary text,
  findings jsonb not null default '{}'::jsonb,
  score integer,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_results_company_id_idx
  on public.research_results (company_id);
create index if not exists research_results_prospect_id_idx
  on public.research_results (prospect_id);

create table if not exists public.sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'draft',
  channel text not null default 'email',
  owner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences (id) on delete cascade,
  step_number integer not null,
  channel text not null default 'email',
  delay_hours integer not null default 24,
  subject_template text,
  body_template text,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists sequence_steps_sequence_number_idx
  on public.sequence_steps (sequence_id, step_number);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sequence_id uuid references public.sequences (id) on delete set null,
  status text not null default 'draft',
  target_filter jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns (id) on delete cascade,
  sequence_id uuid references public.sequences (id) on delete set null,
  sequence_step_id uuid references public.sequence_steps (id) on delete set null,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  channel text not null default 'email',
  direction text not null default 'outbound',
  subject text,
  body text,
  status text not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists outreach_messages_prospect_id_idx
  on public.outreach_messages (prospect_id);
create index if not exists outreach_messages_campaign_id_idx
  on public.outreach_messages (campaign_id);

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  outreach_message_id uuid references public.outreach_messages (id) on delete set null,
  channel text not null default 'email',
  direction text not null default 'inbound',
  subject text,
  body text,
  sentiment text,
  ai_classification text,
  ai_reply text,
  status text not null default 'unread',
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists inbox_messages_prospect_id_idx
  on public.inbox_messages (prospect_id);
create index if not exists inbox_messages_status_idx
  on public.inbox_messages (status);
create index if not exists inbox_messages_received_at_idx
  on public.inbox_messages (received_at desc);

-- Bridge Sales OS prospects into the existing sales funnel.
-- Prospect remains the new acquisition object.
-- Lead remains the compatibility bridge for Meetings / Proposals / Deals.

alter table public.prospects
  add column if not exists lead_id uuid
  references public.leads (id) on delete set null;

create index if not exists prospects_lead_id_idx
  on public.prospects (lead_id);

alter table public.leads
  drop constraint if exists leads_lead_source_check;

alter table public.leads
  add constraint leads_lead_source_check
  check (lead_source in ('pdf_export', 'premium_waitlist', 'prospect'));

alter table public.leads
  add column if not exists prospect_id uuid
  references public.prospects (id) on delete set null;

create unique index if not exists leads_prospect_id_idx
  on public.leads (prospect_id)
  where prospect_id is not null;
