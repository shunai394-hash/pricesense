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
