-- Idempotent identity for Sales OS records synced from existing leads.

create unique index if not exists companies_source_source_id_idx
  on public.companies (source, source_id)
  where source is not null and source_id is not null;

create unique index if not exists contacts_source_source_id_idx
  on public.contacts (source, source_id)
  where source is not null and source_id is not null;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
