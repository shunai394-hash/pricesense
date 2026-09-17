-- AI New Business OS
-- Reuses companies (Account), prospects, leads, intent_signals, research_*.
-- Adds Offering/ICP, signal lifecycle, Why Now, qualification, engagement, learning.

create table if not exists public.offerings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  problem_solved text,
  target_industries jsonb not null default '[]'::jsonb,
  target_company_size jsonb not null default '{}'::jsonb,
  target_regions jsonb not null default '[]'::jsonb,
  target_departments jsonb not null default '[]'::jsonb,
  target_roles jsonb not null default '[]'::jsonb,
  qualification_conditions jsonb not null default '[]'::jsonb,
  exclusion_conditions jsonb not null default '[]'::jsonb,
  icp jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists offerings_one_active_idx
  on public.offerings (is_active)
  where is_active = true;

alter table public.companies
  add column if not exists normalized_name text,
  add column if not exists normalized_domain text,
  add column if not exists country text,
  add column if not exists registration_id text,
  add column if not exists account_status text not null default 'NEW_ACCOUNT',
  add column if not exists last_researched_at timestamptz,
  add column if not exists offering_id uuid references public.offerings (id) on delete set null;

create index if not exists companies_normalized_name_idx
  on public.companies (normalized_name);
create index if not exists companies_normalized_domain_idx
  on public.companies (normalized_domain);
create index if not exists companies_registration_id_idx
  on public.companies (registration_id);
create index if not exists companies_account_status_idx
  on public.companies (account_status);

alter table public.intent_signals
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists evidence text,
  add column if not exists confidence numeric,
  add column if not exists recency text,
  add column if not exists fact_text text,
  add column if not exists hypothesis text,
  add column if not exists offering_id uuid references public.offerings (id) on delete set null;

update public.intent_signals
set
  first_seen_at = coalesce(first_seen_at, detected_at, created_at),
  last_seen_at = coalesce(last_seen_at, detected_at, created_at)
where first_seen_at is null or last_seen_at is null;

create table if not exists public.why_now_briefs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  prospect_id uuid references public.prospects (id) on delete set null,
  offering_id uuid references public.offerings (id) on delete set null,
  intent_signal_id uuid references public.intent_signals (id) on delete set null,
  discovery_id uuid,
  fact_text text not null,
  source_url text,
  source_name text,
  detected_at timestamptz,
  business_change text,
  potential_need text,
  why_now text,
  recommended_action text,
  recommended_contact text,
  confidence numeric,
  model text,
  used_ai boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists why_now_briefs_company_idx
  on public.why_now_briefs (company_id, created_at desc);
create index if not exists why_now_briefs_prospect_idx
  on public.why_now_briefs (prospect_id, created_at desc);

create table if not exists public.qualification_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  prospect_id uuid references public.prospects (id) on delete set null,
  offering_id uuid references public.offerings (id) on delete set null,
  discovery_id uuid,
  icp_fit integer not null default 0,
  intent integer not null default 0,
  timing integer not null default 0,
  recent_change integer not null default 0,
  need_hypothesis integer not null default 0,
  evidence_quality integer not null default 0,
  contactability integer not null default 0,
  why_this_company text,
  decision text not null default 'investigate',
  explanation jsonb not null default '{}'::jsonb,
  model text,
  used_ai boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists qualification_assessments_company_idx
  on public.qualification_assessments (company_id, created_at desc);
create index if not exists qualification_assessments_decision_idx
  on public.qualification_assessments (decision, created_at desc);

alter table public.prospects
  add column if not exists offering_id uuid references public.offerings (id) on delete set null,
  add column if not exists pursue_decision text,
  add column if not exists target_department text,
  add column if not exists target_role text,
  add column if not exists contactability text not null default 'unknown',
  add column if not exists research_ready boolean not null default false,
  add column if not exists contact_ready boolean not null default false,
  add column if not exists why_now_ready boolean not null default false,
  add column if not exists message_ready boolean not null default false,
  add column if not exists approval_ready boolean not null default false,
  add column if not exists ready_to_contact boolean not null default false,
  add column if not exists outreach_approved_at timestamptz,
  add column if not exists outreach_approved_by text;

create index if not exists prospects_offering_id_idx
  on public.prospects (offering_id);
create index if not exists prospects_ready_to_contact_idx
  on public.prospects (ready_to_contact)
  where ready_to_contact = true;
create index if not exists prospects_pursue_decision_idx
  on public.prospects (pursue_decision);

alter table public.research_discoveries
  add column if not exists offering_id uuid references public.offerings (id) on delete set null,
  add column if not exists nbos_status text not null default 'pending',
  add column if not exists pursue_decision text,
  add column if not exists qualification_id uuid;

create index if not exists research_discoveries_nbos_status_idx
  on public.research_discoveries (nbos_status, created_at desc);

alter table public.research_results
  add column if not exists incremental boolean not null default false,
  add column if not exists based_on_research_id uuid references public.research_results (id) on delete set null;

alter table public.leads
  alter column email drop not null;

create table if not exists public.sales_learning_feedback (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid references public.offerings (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  prospect_id uuid references public.prospects (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  discovery_id uuid,
  label text not null,
  note text,
  applied_to_icp boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sales_learning_feedback_label_idx
  on public.sales_learning_feedback (label, created_at desc);
create index if not exists sales_learning_feedback_offering_idx
  on public.sales_learning_feedback (offering_id, created_at desc);

alter table public.contacts
  add column if not exists contactability text,
  add column if not exists is_public_profile boolean not null default false;

alter table public.outreach_messages
  add column if not exists metadata jsonb not null default '{}'::jsonb;

insert into public.offerings (
  name,
  description,
  problem_solved,
  target_industries,
  target_company_size,
  target_regions,
  target_departments,
  target_roles,
  qualification_conditions,
  exclusion_conditions,
  icp,
  is_active
)
select
  'PriceSense AI新規開拓営業OS',
  '公開情報から「今その課題が起きている未接触企業」を見つけ、調査・適合判断・営業準備まで行う。',
  '新規開拓の対象企業が見つからない。今アプローチすべき理由を事実と仮説を分けて説明できない。既存顧客へ誤って新規営業してしまう。',
  '["IT", "SaaS", "製造業", "商社", "人材", "専門サービス"]'::jsonb,
  '{"labels":["中堅","成長企業"],"employee_min":30,"employee_max":5000}'::jsonb,
  '["japan","north_america","asia"]'::jsonb,
  '["経営企画","事業開発","営業企画","海外事業","マーケティング"]'::jsonb,
  '["事業責任者","営業責任者","経営企画","CFO","海外事業責任者"]'::jsonb,
  '["公開された企業変化がある","Offeringの解決課題と変化が一致する","既存顧客・進行中案件ではない"]'::jsonb,
  '["既存顧客","進行中Deal","個人事業のみ","公開シグナルがない"]'::jsonb,
  '{
    "firmographic":{"industries":["IT","SaaS","製造業","商社","人材","専門サービス"],"employee_min":30,"employee_max":5000,"notes":"業種一致は必要条件だが十分条件ではない"},
    "business_model":{"include":["B2B","法人向けサービス","海外展開中"],"exclude":["純粋なC2C"],"notes":"法人の新規開拓・提案活動があること"},
    "problem":{"triggers":["新規事業","海外進出","資金調達","採用増加","新製品","拠点開設","営業強化"],"notes":"公開された変化とPriceSenseが解く課題が一致していること"},
    "technology":{"include":["CRM","営業支援","SaaS利用"],"exclude":[],"notes":"未確認の技術スタックは事実にしない"},
    "geography":{"regions":["japan","north_america","asia"],"countries":["JP","US"],"notes":"日本の営業実務と海外公開情報の両方を対象にする"},
    "organization":{"departments":["経営企画","事業開発","営業企画","海外事業"],"roles":["事業責任者","営業責任者","経営企画"],"notes":"人物が確認できない場合は部署・役職までにとどめる"},
    "negative":{"industries":[],"conditions":["既存顧客","失注直後の同一担当者","公開変化なし","個人向けのみ"],"notes":"Negative ICPに該当したら新規Lead化しない"}
  }'::jsonb,
  true
where not exists (select 1 from public.offerings);

alter table public.offerings enable row level security;
alter table public.why_now_briefs enable row level security;
alter table public.qualification_assessments enable row level security;
alter table public.sales_learning_feedback enable row level security;

grant all on table public.offerings to service_role;
grant all on table public.why_now_briefs to service_role;
grant all on table public.qualification_assessments to service_role;
grant all on table public.sales_learning_feedback to service_role;
