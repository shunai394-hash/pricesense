-- PriceSense AI World Phase 1
-- Research Network -> World Simulation -> Forecast Ledger
-- Additive only. No CRM/SFA tables are modified.

create table if not exists public.world_agents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role text not null,
  persona text not null,
  interests jsonb not null default '[]'::jsonb,
  region_code text not null default 'global',
  risk_profile text not null default 'balanced',
  status text not null default 'active',
  memory jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_agents_status_check
    check (status in ('active', 'paused', 'error')),
  constraint world_agents_risk_profile_check
    check (risk_profile in ('conservative', 'balanced', 'aggressive'))
);

create index if not exists world_agents_status_idx
  on public.world_agents (status);

create index if not exists world_agents_region_idx
  on public.world_agents (region_code);


create table if not exists public.world_events (
  id uuid primary key default gen_random_uuid(),
  discovery_id uuid references public.research_discoveries (id) on delete set null,
  title text not null,
  fact text not null,
  hypothesis text,
  source_url text,
  event_type text not null default 'general',
  importance text not null default 'medium',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint world_events_importance_check
    check (importance in ('low', 'medium', 'high', 'critical'))
);

create index if not exists world_events_created_idx
  on public.world_events (created_at desc);

create index if not exists world_events_discovery_idx
  on public.world_events (discovery_id);


create table if not exists public.world_posts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.world_events (id) on delete cascade,
  agent_id uuid not null references public.world_agents (id) on delete cascade,
  parent_post_id uuid references public.world_posts (id) on delete set null,
  round integer not null default 1,
  content text not null,
  stance text not null default 'neutral',
  reasoning_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint world_posts_round_check
    check (round >= 1),
  constraint world_posts_stance_check
    check (
      stance in (
        'support',
        'oppose',
        'skeptical',
        'neutral',
        'curious'
      )
    )
);

create index if not exists world_posts_event_idx
  on public.world_posts (event_id, created_at);

create index if not exists world_posts_agent_idx
  on public.world_posts (agent_id, created_at);

create index if not exists world_posts_parent_idx
  on public.world_posts (parent_post_id);


create table if not exists public.world_forecasts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.world_events (id) on delete cascade,
  scenario text not null,
  time_horizon text not null,
  probability_band text not null,
  drivers jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  affected_industries jsonb not null default '[]'::jsonb,
  affected_entities jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  actual_outcome text,
  accuracy text,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint world_forecasts_probability_check
    check (probability_band in ('low', 'medium', 'high')),
  constraint world_forecasts_accuracy_check
    check (
      accuracy is null
      or accuracy in ('correct', 'partially_correct', 'incorrect', 'unknown')
    )
);

create index if not exists world_forecasts_event_idx
  on public.world_forecasts (event_id, created_at);

create index if not exists world_forecasts_evaluation_idx
  on public.world_forecasts (evaluated_at)
  where evaluated_at is not null;


alter table public.world_agents enable row level security;
alter table public.world_events enable row level security;
alter table public.world_posts enable row level security;
alter table public.world_forecasts enable row level security;

grant all on table public.world_agents to service_role;
grant all on table public.world_events to service_role;
grant all on table public.world_posts to service_role;
grant all on table public.world_forecasts to service_role;


-- Initial World population.
-- These are simulation roles, not application users.

insert into public.world_agents
  (slug, name, role, persona, interests, region_code, risk_profile)
values
  (
    'market-analyst',
    'Market Analyst',
    '市場分析担当',
    '市場規模、競争環境、需要変化を重視して冷静に分析する。',
    '["market","competition","demand"]'::jsonb,
    'global',
    'balanced'
  ),
  (
    'ec-operator',
    'EC Operator',
    'EC事業者',
    '販売現場、CVR、価格、在庫、広告効率から出来事を判断する。',
    '["ec","conversion","pricing","advertising"]'::jsonb,
    'global',
    'aggressive'
  ),
  (
    'retail-buyer',
    'Retail Buyer',
    '小売バイヤー',
    '売場適合性、ブランド力、粗利、回転率を重視する。',
    '["retail","margin","brand","distribution"]'::jsonb,
    'japan',
    'conservative'
  ),
  (
    'consumer',
    'Consumer',
    '一般消費者',
    '価格、口コミ、認知度、使いやすさ、話題性から反応する。',
    '["consumer","price","reviews","trend"]'::jsonb,
    'japan',
    'balanced'
  ),
  (
    'brand-manager',
    'Brand Manager',
    'ブランド担当',
    'ブランド価値、認知拡大、競合との差別化を重視する。',
    '["brand","marketing","positioning"]'::jsonb,
    'global',
    'balanced'
  ),
  (
    'manufacturer',
    'Manufacturer',
    'メーカー',
    '生産能力、供給網、原価、販売チャネルを重視する。',
    '["manufacturing","supply_chain","distribution"]'::jsonb,
    'global',
    'conservative'
  ),
  (
    'distributor',
    'Distributor',
    '販売代理店',
    '販売権、地域独占、販路、取引条件を重視する。',
    '["distribution","sales","partnership"]'::jsonb,
    'japan',
    'balanced'
  ),
  (
    'advertiser',
    'Advertiser',
    '広告担当',
    '広告クリエイティブ、CPA、需要、競合広告を重視する。',
    '["advertising","creative","cpa","demand"]'::jsonb,
    'global',
    'aggressive'
  ),
  (
    'investment-researcher',
    'Investment Researcher',
    '投資リサーチ担当',
    '業績、成長率、競争優位、リスクを重視する。',
    '["earnings","growth","risk","competition"]'::jsonb,
    'global',
    'conservative'
  ),
  (
    'skeptic',
    'Skeptic',
    '懐疑派',
    'ニュースや市場の熱狂をそのまま信じず、反証と失敗要因を探す。',
    '["risk","evidence","counterargument"]'::jsonb,
    'global',
    'conservative'
  ),
  (
    'trend-hunter',
    'Trend Hunter',
    'トレンドハンター',
    '新しい消費者行動、SNS、商品トレンドの初期兆候を探す。',
    '["trend","social","consumer","culture"]'::jsonb,
    'global',
    'aggressive'
  ),
  (
    'startup-founder',
    'Startup Founder',
    'スタートアップ経営者',
    '成長機会、競争、資金、プロダクトマーケットフィットを重視する。',
    '["startup","growth","fundraising","product"]'::jsonb,
    'global',
    'aggressive'
  )
on conflict (slug) do update set
  name = excluded.name,
  role = excluded.role,
  persona = excluded.persona,
  interests = excluded.interests,
  region_code = excluded.region_code,
  risk_profile = excluded.risk_profile,
  updated_at = now();
