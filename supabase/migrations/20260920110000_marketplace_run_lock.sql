-- Lightweight claim lock so overlapping/duplicate cron invocations cannot
-- process the same marketplace_monitor_targets row twice at once. A claim
-- older than 10 minutes is treated as stale (crashed invocation) and can be
-- re-claimed. No new status value is introduced, so the existing
-- status check constraint ('active','paused','error') is untouched.
alter table public.marketplace_monitor_targets
  add column if not exists run_lock_at timestamptz;

create index if not exists idx_marketplace_monitor_targets_run_lock
  on public.marketplace_monitor_targets(run_lock_at);
