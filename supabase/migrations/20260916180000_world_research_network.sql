-- Shared Research / Knowledge layer for PriceSense and future NEWFIND.
-- Additive only. Does not merge CRM/SFA business tables.
-- Do not disable RLS.

create table if not exists public.research_correspondents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role text not null,
  correspondent_type text not null,
  region_code text not null default 'global',
  country_code text,
  industries jsonb not null default '[]'::jsonb,
  topics jsonb not null default '[]'::jsonb,
  search_query text,
  cadence_minutes integer not null default 1440,
  sources jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  current_focus text,
  last_run_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_correspondents_status_check
    check (status in ('active', 'paused', 'error')),
  constraint research_correspondents_region_check
    check (region_code in (
      'global',
      'japan',
      'north_america',
      'europe',
      'asia',
      'oceania',
      'middle_east',
      'africa',
      'latin_america'
    ))
);

create index if not exists research_correspondents_status_idx
  on public.research_correspondents (status);
create index if not exists research_correspondents_region_idx
  on public.research_correspondents (region_code);
create index if not exists research_correspondents_type_idx
  on public.research_correspondents (correspondent_type);

create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(),
  correspondent_id uuid not null references public.research_correspondents (id) on delete cascade,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  items_fetched integer not null default 0,
  discoveries_created integer not null default 0,
  duplicates_skipped integer not null default 0,
  error_count integer not null default 0,
  used_ai boolean not null default false,
  error_message text,
  current_focus text,
  metadata jsonb not null default '{}'::jsonb,
  constraint research_runs_status_check
    check (status in ('running', 'succeeded', 'failed', 'partial'))
);

create index if not exists research_runs_correspondent_idx
  on public.research_runs (correspondent_id, started_at desc);
create index if not exists research_runs_started_idx
  on public.research_runs (started_at desc);

create table if not exists public.research_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  canonical_url text not null,
  fingerprint text not null unique,
  source_name text,
  source_type text not null default 'news',
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  language text,
  country text,
  region_code text,
  verification_status text not null default 'unverified',
  title text,
  snippet text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint research_sources_url_check
    check (url ~* '^https?://'),
  constraint research_sources_verification_check
    check (verification_status in ('unverified', 'source_confirmed', 'needs_human', 'rejected'))
);

create unique index if not exists research_sources_canonical_url_idx
  on public.research_sources (canonical_url);
create index if not exists research_sources_retrieved_idx
  on public.research_sources (retrieved_at desc);

create table if not exists public.research_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  domain text,
  country text,
  region_code text,
  industry text,
  website_url text,
  canonical_key text not null unique,
  source_id uuid references public.research_sources (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_organizations_name_idx
  on public.research_organizations (lower(name));

create table if not exists public.research_people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  job_title text,
  organization_id uuid references public.research_organizations (id) on delete set null,
  country text,
  canonical_key text not null unique,
  source_id uuid references public.research_sources (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_id uuid references public.research_organizations (id) on delete set null,
  country text,
  canonical_key text not null unique,
  source_id uuid references public.research_sources (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand_id uuid references public.research_brands (id) on delete set null,
  organization_id uuid references public.research_organizations (id) on delete set null,
  canonical_key text not null unique,
  source_id uuid references public.research_sources (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place_type text,
  country text,
  region_code text,
  canonical_key text not null unique,
  source_id uuid references public.research_sources (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_discoveries (
  id uuid primary key default gen_random_uuid(),
  correspondent_id uuid references public.research_correspondents (id) on delete set null,
  run_id uuid references public.research_runs (id) on delete set null,
  source_id uuid references public.research_sources (id) on delete set null,
  title text not null,
  fact_text text not null,
  interpretation text,
  hypothesis text,
  unknown text,
  verification_status text not null default 'unverified',
  region_code text,
  country text,
  language text,
  topics jsonb not null default '[]'::jsonb,
  organization_id uuid references public.research_organizations (id) on delete set null,
  brand_id uuid references public.research_brands (id) on delete set null,
  product_id uuid references public.research_products (id) on delete set null,
  place_id uuid references public.research_places (id) on delete set null,
  person_id uuid references public.research_people (id) on delete set null,
  consumer_targets jsonb not null default '["pricesense"]'::jsonb,
  pricesense_status text not null default 'available',
  newfind_status text not null default 'available',
  duplicate_of uuid references public.research_discoveries (id) on delete set null,
  needs_human_review boolean not null default true,
  used_ai boolean not null default false,
  ai_model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_discoveries_verification_check
    check (verification_status in ('unverified', 'source_confirmed', 'needs_human', 'rejected')),
  constraint research_discoveries_pricesense_check
    check (pricesense_status in ('available', 'promoted', 'ignored')),
  constraint research_discoveries_newfind_check
    check (newfind_status in ('available', 'promoted', 'ignored'))
);

create index if not exists research_discoveries_created_idx
  on public.research_discoveries (created_at desc);
create index if not exists research_discoveries_correspondent_idx
  on public.research_discoveries (correspondent_id, created_at desc);
create index if not exists research_discoveries_source_idx
  on public.research_discoveries (source_id);
create index if not exists research_discoveries_review_idx
  on public.research_discoveries (needs_human_review)
  where needs_human_review = true;

create table if not exists public.research_signals (
  id uuid primary key default gen_random_uuid(),
  discovery_id uuid references public.research_discoveries (id) on delete cascade,
  source_id uuid references public.research_sources (id) on delete set null,
  organization_id uuid references public.research_organizations (id) on delete set null,
  brand_id uuid references public.research_brands (id) on delete set null,
  product_id uuid references public.research_products (id) on delete set null,
  signal_type text not null,
  title text not null,
  fact_text text not null,
  hypothesis text,
  unknown text,
  verification_status text not null default 'unverified',
  region_code text,
  country text,
  consumer_targets jsonb not null default '["pricesense"]'::jsonb,
  strength integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists research_signals_created_idx
  on public.research_signals (created_at desc);
create index if not exists research_signals_type_idx
  on public.research_signals (signal_type);

alter table public.research_discoveries
  add column if not exists signal_id uuid references public.research_signals (id) on delete set null;

create table if not exists public.research_relationships (
  id uuid primary key default gen_random_uuid(),
  from_type text not null,
  from_id uuid not null,
  to_type text not null,
  to_id uuid not null,
  relation text not null,
  source_id uuid references public.research_sources (id) on delete set null,
  discovery_id uuid references public.research_discoveries (id) on delete set null,
  confidence text not null default 'unverified',
  is_hypothesis boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint research_relationships_unique
    unique (from_type, from_id, to_type, to_id, relation)
);

create index if not exists research_relationships_from_idx
  on public.research_relationships (from_type, from_id);
create index if not exists research_relationships_to_idx
  on public.research_relationships (to_type, to_id);

create table if not exists public.research_entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  alias_key text not null,
  alias_value text not null,
  source_id uuid references public.research_sources (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint research_entity_aliases_unique
    unique (entity_type, alias_key, alias_value)
);

create table if not exists public.research_promotions (
  id uuid primary key default gen_random_uuid(),
  discovery_id uuid not null references public.research_discoveries (id) on delete cascade,
  consumer text not null,
  company_id uuid references public.companies (id) on delete set null,
  prospect_id uuid references public.prospects (id) on delete set null,
  intent_signal_id uuid references public.intent_signals (id) on delete set null,
  research_result_id uuid references public.research_results (id) on delete set null,
  status text not null default 'created',
  notes text,
  created_at timestamptz not null default now(),
  constraint research_promotions_consumer_check
    check (consumer in ('pricesense', 'newfind'))
);

create index if not exists research_promotions_discovery_idx
  on public.research_promotions (discovery_id, consumer);

insert into public.research_correspondents (
  slug, name, role, correspondent_type, region_code, country_code,
  industries, topics, search_query, cadence_minutes, sources, status, current_focus
) values
  (
    'global-company-reporter',
    'Global Company Reporter',
    '世界の企業設立・拠点・進出・提携を公開情報から探索する',
    'company',
    'global',
    null,
    '[]'::jsonb,
    '["new_company","expansion","partnership","ma"]'::jsonb,
    '"opens office" OR "enters market" OR "new subsidiary" OR "expands into"',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    '企業の拠点開設・市場参入'
  ),
  (
    'industry-reporter',
    'Industry Reporter',
    '業界動向と市場構造の変化を公開情報から探索する',
    'industry',
    'global',
    null,
    '[]'::jsonb,
    '["industry","market_share","outlook"]'::jsonb,
    '"industry outlook" OR "market share" OR "sector growth"',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    '業界動向'
  ),
  (
    'brand-reporter',
    'Brand Reporter',
    '新ブランド・リブランディングを公開情報から探索する',
    'brand',
    'global',
    null,
    '[]'::jsonb,
    '["new_brand","rebrand"]'::jsonb,
    '"launches brand" OR "new brand" OR rebrand',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    'ブランド発表'
  ),
  (
    'product-reporter',
    'Product Reporter',
    '新商品・新サービスの公開情報を探索する',
    'product',
    'global',
    null,
    '[]'::jsonb,
    '["new_product","new_service"]'::jsonb,
    '"launches product" OR "new product" OR "product launch"',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    '商品・サービス発表'
  ),
  (
    'market-reporter',
    'Market Reporter',
    '市場参入・代理店募集・販売パートナー情報を探索する',
    'market',
    'global',
    null,
    '[]'::jsonb,
    '["market_entry","distributor","sales_partner"]'::jsonb,
    '"market entry" OR "distribution partner" OR "sales partner" OR "seeking distributors"',
    720,
    '["google_news_rss"]'::jsonb,
    'active',
    '市場参入と販売パートナー'
  ),
  (
    'trend-reporter',
    'Trend Reporter',
    '消費者トレンドと市場トレンドの公開情報を探索する',
    'trend',
    'global',
    null,
    '[]'::jsonb,
    '["consumer_trend","market_trend"]'::jsonb,
    '"consumer trend" OR "market trend" OR "demand surge"',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    '市場・消費トレンド'
  ),
  (
    'news-reporter',
    'News Reporter',
    'プレスリリースと企業発表を公開情報から探索する',
    'news',
    'global',
    null,
    '[]'::jsonb,
    '["press_release","announcement"]'::jsonb,
    '"press release" OR announces OR "officially launched"',
    360,
    '["google_news_rss"]'::jsonb,
    'active',
    '企業発表・PR'
  ),
  (
    'startup-reporter',
    'Startup Reporter',
    '資金調達・新規事業・スタートアップの動きを探索する',
    'startup',
    'global',
    null,
    '[]'::jsonb,
    '["fundraising","startup","new_business"]'::jsonb,
    '"raises funding" OR "Series A" OR "seed round" OR "series b"',
    720,
    '["google_news_rss"]'::jsonb,
    'active',
    '資金調達とスタートアップ'
  ),
  (
    'retail-reporter',
    'Retail Reporter',
    '新店舗・新拠点・小売展開を公開情報から探索する',
    'retail',
    'global',
    null,
    '[]'::jsonb,
    '["new_store","flagship","retail_expansion"]'::jsonb,
    '"opens store" OR "new store" OR "flagship store" OR "retail expansion"',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    '店舗・小売展開'
  ),
  (
    'japan-market-reporter',
    'Japan Market Reporter',
    '日本進出・日本市場・国内代理店募集を公開情報から探索する',
    'japan_market',
    'japan',
    'JP',
    '[]'::jsonb,
    '["japan_entry","distributor","japan_office"]'::jsonb,
    '日本進出 OR 販売代理店 OR "enters Japan" OR "Japan office" OR "Japan expansion"',
    360,
    '["google_news_rss"]'::jsonb,
    'active',
    '日本進出と国内販売パートナー'
  ),
  (
    'regional-asia-reporter',
    'Regional Reporter — Asia',
    'アジア地域の企業・市場変化を探索する',
    'regional',
    'asia',
    null,
    '[]'::jsonb,
    '["asia_expansion"]'::jsonb,
    '"Asia expansion" OR "enters Asia" OR "Southeast Asia office"',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    'アジア地域'
  ),
  (
    'regional-north-america-reporter',
    'Regional Reporter — North America',
    '北米の企業・市場変化を探索する',
    'regional',
    'north_america',
    null,
    '[]'::jsonb,
    '["na_expansion"]'::jsonb,
    '"North America expansion" OR "enters the US" OR "opens US office"',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    '北米地域'
  ),
  (
    'regional-europe-reporter',
    'Regional Reporter — Europe',
    '欧州の企業・市場変化を探索する',
    'regional',
    'europe',
    null,
    '[]'::jsonb,
    '["europe_expansion"]'::jsonb,
    '"European expansion" OR "enters Europe" OR "opens European office"',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    '欧州地域'
  ),
  (
    'regional-oceania-reporter',
    'Regional Reporter — Oceania',
    'オセアニアの企業・市場変化を探索する',
    'regional',
    'oceania',
    null,
    '[]'::jsonb,
    '["oceania_expansion"]'::jsonb,
    '"Australia expansion" OR "enters Australia" OR "New Zealand office"',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    'オセアニア地域'
  ),
  (
    'regional-middle-east-reporter',
    'Regional Reporter — Middle East',
    '中東の企業・市場変化を探索する',
    'regional',
    'middle_east',
    null,
    '[]'::jsonb,
    '["middle_east_expansion"]'::jsonb,
    '"Middle East expansion" OR "enters UAE" OR "opens Dubai office"',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    '中東地域'
  ),
  (
    'regional-africa-reporter',
    'Regional Reporter — Africa',
    'アフリカの企業・市場変化を探索する',
    'regional',
    'africa',
    null,
    '[]'::jsonb,
    '["africa_expansion"]'::jsonb,
    '"Africa expansion" OR "enters Africa" OR "opens Nairobi office"',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    'アフリカ地域'
  ),
  (
    'regional-latin-america-reporter',
    'Regional Reporter — Latin America',
    '中南米の企業・市場変化を探索する',
    'regional',
    'latin_america',
    null,
    '[]'::jsonb,
    '["latam_expansion"]'::jsonb,
    '"Latin America expansion" OR "enters Brazil" OR "opens Mexico office"',
    1440,
    '["google_news_rss"]'::jsonb,
    'active',
    '中南米地域'
  )
on conflict (slug) do update set
  name = excluded.name,
  role = excluded.role,
  correspondent_type = excluded.correspondent_type,
  region_code = excluded.region_code,
  country_code = excluded.country_code,
  topics = excluded.topics,
  search_query = excluded.search_query,
  cadence_minutes = excluded.cadence_minutes,
  sources = excluded.sources,
  current_focus = excluded.current_focus,
  updated_at = now();

alter table public.research_correspondents enable row level security;
alter table public.research_runs enable row level security;
alter table public.research_sources enable row level security;
alter table public.research_organizations enable row level security;
alter table public.research_people enable row level security;
alter table public.research_brands enable row level security;
alter table public.research_products enable row level security;
alter table public.research_places enable row level security;
alter table public.research_discoveries enable row level security;
alter table public.research_signals enable row level security;
alter table public.research_relationships enable row level security;
alter table public.research_entity_aliases enable row level security;
alter table public.research_promotions enable row level security;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant all on table public.research_correspondents to service_role;
grant all on table public.research_runs to service_role;
grant all on table public.research_sources to service_role;
grant all on table public.research_organizations to service_role;
grant all on table public.research_people to service_role;
grant all on table public.research_brands to service_role;
grant all on table public.research_products to service_role;
grant all on table public.research_places to service_role;
grant all on table public.research_discoveries to service_role;
grant all on table public.research_signals to service_role;
grant all on table public.research_relationships to service_role;
grant all on table public.research_entity_aliases to service_role;
grant all on table public.research_promotions to service_role;
