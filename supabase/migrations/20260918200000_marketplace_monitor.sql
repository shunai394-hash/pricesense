create table if not exists public.research_marketplaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region_code text not null default 'global',
  country_code text,
  marketplace_type text not null
    check (marketplace_type in ('auction','shopping','marketplace','retail')),
  base_url text,
  adapter_key text not null unique,
  status text not null default 'active'
    check (status in ('active','paused','error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_market_observation_items (
  id uuid primary key default gen_random_uuid(),
  marketplace_id uuid not null references public.research_marketplaces(id) on delete cascade,
  external_id text,
  product_name text not null,
  brand text,
  canonical_product_key text,
  product_url text,
  image_url text,
  currency text,
  current_price numeric,
  original_price numeric,
  shipping_price numeric,
  availability text,
  seller_count integer,
  sales_rank integer,
  listing_count integer,
  observed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_market_observations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.research_market_observation_items(id) on delete cascade,
  correspondent_id uuid references public.research_correspondents(id) on delete set null,
  run_id uuid references public.research_runs(id) on delete set null,
  marketplace_id uuid not null references public.research_marketplaces(id) on delete cascade,
  observed_at timestamptz not null default now(),
  price numeric,
  currency text,
  shipping_price numeric,
  availability text,
  seller_count integer,
  sales_rank integer,
  listing_count integer,
  signal_strength integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_research_market_items_marketplace
  on public.research_market_observation_items(marketplace_id);

create index if not exists idx_research_market_items_product_key
  on public.research_market_observation_items(canonical_product_key);

create unique index if not exists uq_research_market_items_marketplace_external
  on public.research_market_observation_items(marketplace_id, external_id)
  where external_id is not null;

create index if not exists idx_research_market_items_external_id
  on public.research_market_observation_items(marketplace_id, external_id);

create index if not exists idx_research_market_observations_item_time
  on public.research_market_observations(item_id, observed_at desc);

create index if not exists idx_research_market_observations_market_time
  on public.research_market_observations(marketplace_id, observed_at desc);

create index if not exists idx_research_market_observations_correspondent
  on public.research_market_observations(correspondent_id, observed_at desc);

alter table public.research_marketplaces enable row level security;
alter table public.research_market_observation_items enable row level security;
alter table public.research_market_observations enable row level security;

grant all on public.research_marketplaces to service_role;
grant all on public.research_market_observation_items to service_role;
grant all on public.research_market_observations to service_role;
