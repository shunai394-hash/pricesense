create table if not exists public.marketplace_monitor_targets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  query text not null,
  region_code text not null default 'japan',
  country_code text default 'JP',
  limit_count integer not null default 10
    check (limit_count between 1 and 100),
  cadence_minutes integer not null default 60
    check (cadence_minutes >= 1),
  status text not null default 'active'
    check (status in ('active','paused','error')),
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_monitor_targets_status
  on public.marketplace_monitor_targets(status);

create index if not exists idx_marketplace_monitor_targets_last_run
  on public.marketplace_monitor_targets(last_run_at);

alter table public.marketplace_monitor_targets enable row level security;

grant all on public.marketplace_monitor_targets to service_role;
