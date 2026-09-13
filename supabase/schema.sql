-- PriceSense P0 schema (run in Supabase SQL editor)

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_source text not null check (lead_source in ('pdf_export', 'premium_waitlist')),
  email text not null,
  category_id text,
  category_name text,
  user_rate integer,
  market_rate integer,
  diagnosis_level text,
  target_rate integer,
  created_at timestamptz not null
);

create index if not exists leads_email_idx on public.leads (email);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

create table if not exists public.premium_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists premium_subscriptions_status_idx
  on public.premium_subscriptions (status);

-- AI sales (Day-1 additive — safe to re-run; does not replace leads or premium_subscriptions)
alter table public.leads add column if not exists score integer;
alter table public.leads add column if not exists intent_signals jsonb;
alter table public.leads add column if not exists primary_objection text;
alter table public.leads add column if not exists escalation_status text default 'ai_handling';
alter table public.leads add column if not exists handed_off_at timestamptz;
alter table public.leads add column if not exists handoff_channel text;
alter table public.leads add column if not exists conversation jsonb default '[]'::jsonb;
alter table public.leads add column if not exists next_action text;
alter table public.leads add column if not exists model_version text;

create index if not exists leads_escalation_status_idx
  on public.leads (escalation_status);
create index if not exists leads_score_idx
  on public.leads (score desc);

create table if not exists public.objection_bank (
  id uuid primary key default gen_random_uuid(),
  objection_key text not null,
  label text not null,
  description text,
  recommended_response text,
  severity integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists objection_bank_objection_key_idx
  on public.objection_bank (objection_key);

create table if not exists public.objection_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  objection_key text,
  source text,
  raw_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists objection_events_lead_id_idx
  on public.objection_events (lead_id);
create index if not exists objection_events_created_at_idx
  on public.objection_events (created_at desc);

create table if not exists public.sales_followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  next_action text not null,
  channel text,
  status text not null default 'pending',
  due_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_followups_lead_id_idx
  on public.sales_followups (lead_id);
create index if not exists sales_followups_status_idx
  on public.sales_followups (status);
create index if not exists sales_followups_due_at_idx
  on public.sales_followups (due_at);

-- AI sales (Day-3 additive — do not drop objection_bank / objection_events / leads)
alter table public.objection_bank add column if not exists objection_type text;
alter table public.objection_bank add column if not exists keywords jsonb default '[]'::jsonb;
alter table public.objection_bank add column if not exists detection_rules jsonb default '{}'::jsonb;
alter table public.objection_bank add column if not exists response_strategy text;
alter table public.objection_bank add column if not exists enabled boolean default true;
alter table public.objection_bank add column if not exists model_version text;

update public.objection_bank
set objection_type = objection_key
where objection_type is null and objection_key is not null;

create unique index if not exists objection_bank_objection_type_idx
  on public.objection_bank (objection_type);

alter table public.objection_events add column if not exists objection_type text;
alter table public.objection_events add column if not exists customer_message text;
alter table public.objection_events add column if not exists response_play text;

create index if not exists objection_events_objection_type_idx
  on public.objection_events (objection_type);

insert into public.objection_bank (
  objection_key,
  objection_type,
  label,
  description,
  keywords,
  detection_rules,
  response_strategy,
  recommended_response,
  enabled,
  is_active,
  model_version
) values
  (
    'too_expensive',
    'too_expensive',
    '価格が高い',
    '価格への抵抗',
    '["高い","高すぎ","ちょっと高い","高いです","高いので"]'::jsonb,
    '{"any":["高い","高すぎ","ちょっと高い"],"priority":3}'::jsonb,
    '価格だけを押し切らず、費用対効果・期待できる成果・導入条件を確認する。',
    '期待成果と費用対効果、導入条件を確認する。',
    true,
    true,
    'ps-objection-bank-v1'
  ),
  (
    'think_it_over',
    'think_it_over',
    '一度検討する',
    '先延ばし・保留',
    '["検討します","一度検討","考えてみ","検討させて","検討したい"]'::jsonb,
    '{"any":["検討します","一度検討","考えてみ"],"priority":5}'::jsonb,
    '無理にクロージングせず、判断に必要な情報を確認する。',
    '不足している判断材料を確認する。',
    true,
    true,
    'ps-objection-bank-v1'
  ),
  (
    'competitor_X',
    'competitor_X',
    '他社比較',
    '競合検討中',
    '["他社","競合"]'::jsonb,
    '{"any":["他社","競合"],"priority":4}'::jsonb,
    '競合批判は禁止。比較条件・選定基準を確認する。',
    '選定基準と比較条件を確認する。',
    true,
    true,
    'ps-objection-bank-v1'
  ),
  (
    'no_budget',
    'no_budget',
    '予算がない',
    '予算未確保',
    '["予算がない","予算はありません","予算がありません","予算ない","今は予算"]'::jsonb,
    '{"any":["予算がない","予算がありません","今は予算"],"priority":1}'::jsonb,
    '予算の有無だけで終了させず、時期・予算確保予定・最低条件を確認する。',
    '予算化の時期と最低条件を確認する。',
    true,
    true,
    'ps-objection-bank-v1'
  ),
  (
    'no_need_now',
    'no_need_now',
    '今は不要',
    '現時点では不要',
    '["必要ありません","必要ない","今は必要","今はいいです","今は大丈夫"]'::jsonb,
    '{"any":["必要ありません","必要ない","今は必要"],"priority":2}'::jsonb,
    '必要性を押し付けず、現在の課題・将来的なタイミングを確認する。',
    '現在の課題と将来の検討タイミングを確認する。',
    true,
    true,
    'ps-objection-bank-v1'
  )
on conflict (objection_key) do update set
  objection_type = excluded.objection_type,
  label = excluded.label,
  description = excluded.description,
  keywords = excluded.keywords,
  detection_rules = excluded.detection_rules,
  response_strategy = excluded.response_strategy,
  recommended_response = excluded.recommended_response,
  enabled = excluded.enabled,
  is_active = excluded.is_active,
  model_version = excluded.model_version,
  updated_at = now();

-- AI sales (Day-4 additive — do not drop leads / sales_followups / premium_subscriptions)
-- sales_followups remains the Day-1 task queue; sequence state + history are separate.
create table if not exists public.lead_followups (
  lead_id uuid primary key references public.leads (id) on delete cascade,
  followup_status text not null default 'idle',
  followup_count integer not null default 0,
  next_followup_at timestamptz,
  last_contacted_at timestamptz,
  stopped_at timestamptz,
  stop_reason text,
  max_followups integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_followups_status_idx
  on public.lead_followups (followup_status);
create index if not exists lead_followups_next_followup_at_idx
  on public.lead_followups (next_followup_at);

create table if not exists public.followup_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  sequence_number integer,
  message text,
  status text not null default 'generated',
  scheduled_at timestamptz,
  sent_at timestamptz,
  stop_reason text,
  created_at timestamptz not null default now()
);

create index if not exists followup_events_lead_id_idx
  on public.followup_events (lead_id);
create index if not exists followup_events_created_at_idx
  on public.followup_events (created_at desc);

-- AI sales (Day-5 additive — do not drop leads / lead_followups / premium_subscriptions)
create table if not exists public.sales_handoffs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  status text not null default 'pending',
  score integer,
  brief jsonb not null default '{}'::jsonb,
  handoff_reason text,
  handed_off_at timestamptz,
  meeting_status text not null default 'not_scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sales_handoffs_lead_id_idx
  on public.sales_handoffs (lead_id);
create index if not exists sales_handoffs_status_idx
  on public.sales_handoffs (status);

-- AI sales (Day-6 additive — do not drop leads / sales_handoffs / premium_subscriptions)
create table if not exists public.sales_meetings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  handoff_id uuid references public.sales_handoffs (id) on delete set null,
  meeting_status text not null default 'completed',
  meeting_at timestamptz,
  raw_notes text,
  summary text,
  customer_needs jsonb not null default '[]'::jsonb,
  objections jsonb not null default '[]'::jsonb,
  agreed_points jsonb not null default '[]'::jsonb,
  unresolved_points jsonb not null default '[]'::jsonb,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_meetings_lead_id_idx
  on public.sales_meetings (lead_id);
create index if not exists sales_meetings_handoff_id_idx
  on public.sales_meetings (handoff_id);

create table if not exists public.proposal_drafts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  meeting_id uuid not null references public.sales_meetings (id) on delete cascade,
  title text,
  problem text,
  proposed_solution text,
  benefits jsonb not null default '[]'::jsonb,
  implementation_plan jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists proposal_drafts_meeting_id_idx
  on public.proposal_drafts (meeting_id);

create table if not exists public.quote_drafts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  meeting_id uuid not null references public.sales_meetings (id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric,
  discount numeric,
  total numeric,
  currency text,
  assumptions jsonb not null default '[]'::jsonb,
  valid_until timestamptz,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quote_drafts_meeting_id_idx
  on public.quote_drafts (meeting_id);

-- AI sales (Day-7 additive — do not drop leads / lead_followups / followup_events)
create table if not exists public.sales_deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  meeting_id uuid references public.sales_meetings (id) on delete set null,
  proposal_id uuid references public.proposal_drafts (id) on delete set null,
  quote_id uuid references public.quote_drafts (id) on delete set null,
  status text not null default 'proposal_ready',
  probability integer not null default 40,
  expected_value numeric,
  currency text,
  next_action text,
  next_followup_at timestamptz,
  lost_reason text,
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sales_deals_lead_id_idx
  on public.sales_deals (lead_id);
create index if not exists sales_deals_status_idx
  on public.sales_deals (status);

create table if not exists public.deal_followup_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.sales_deals (id) on delete cascade,
  sequence_number integer not null,
  message text,
  reason text,
  status text,
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists deal_followup_events_deal_sequence_idx
  on public.deal_followup_events (deal_id, sequence_number);
create index if not exists deal_followup_events_deal_id_idx
  on public.deal_followup_events (deal_id);

-- AI sales (Day-10 additive — do not drop sales_deals / deal_followup_events / leads)
-- Audit log for sales actions and deal operations. Not a replacement for follow-up events.
create table if not exists public.sales_action_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  deal_id uuid references public.sales_deals (id) on delete set null,
  action_type text,
  priority text,
  operation text not null,
  action_content text,
  previous_status text,
  next_status text,
  result text not null default 'executed',
  executed_by text not null default 'admin',
  executed_at timestamptz not null default now(),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists sales_action_events_lead_id_idx
  on public.sales_action_events (lead_id);
create index if not exists sales_action_events_executed_at_idx
  on public.sales_action_events (executed_at desc);
create index if not exists sales_action_events_operation_idx
  on public.sales_action_events (operation);
create unique index if not exists sales_action_events_lead_idempotency_idx
  on public.sales_action_events (lead_id, idempotency_key);
