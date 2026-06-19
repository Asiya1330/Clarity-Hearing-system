-- Migration: enable_rls_and_clinic_scoped_policies
-- Reconstructed into version control from the live migration ledger
-- (supabase_migrations.schema_migrations, version 20260503150519). Already
-- applied in production; committed here so the repo mirrors the real history.
--
-- NOTE: the search_path / anon-execute hardening of current_clinic_id() and
-- current_user_role(), and the rescoping of these policies TO authenticated,
-- are applied later in 20260619090000_hardened_rls_and_functions.sql.

alter table public.clinics enable row level security;
alter table public.locations enable row level security;
alter table public.profiles enable row level security;
alter table public.consults enable row level security;
alter table public.model_runs enable row level security;
alter table public.ear_fit_photos enable row level security;
alter table public.reports enable row level security;
alter table public.consult_outcomes enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_clinic_id()
returns uuid
language sql
security definer
stable
as $$
  select clinic_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "clinic users can view own clinic"
on public.clinics
for select
using (id = public.current_clinic_id());

create policy "clinic users can view own locations"
on public.locations
for select
using (clinic_id = public.current_clinic_id());

create policy "clinic users can view profiles"
on public.profiles
for select
using (clinic_id = public.current_clinic_id());

create policy "clinic users can manage own consults"
on public.consults
for all
using (clinic_id = public.current_clinic_id())
with check (clinic_id = public.current_clinic_id());

create policy "clinic users can view own model runs"
on public.model_runs
for select
using (
  exists (
    select 1 from public.consults c
    where c.id = model_runs.consult_id
    and c.clinic_id = public.current_clinic_id()
  )
);

create policy "clinic users can manage own photos"
on public.ear_fit_photos
for all
using (clinic_id = public.current_clinic_id())
with check (clinic_id = public.current_clinic_id());

create policy "clinic users can view own reports"
on public.reports
for select
using (
  exists (
    select 1 from public.consults c
    where c.id = reports.consult_id
    and c.clinic_id = public.current_clinic_id()
  )
);

create policy "clinic users can manage own outcomes"
on public.consult_outcomes
for all
using (
  exists (
    select 1 from public.consults c
    where c.id = consult_outcomes.consult_id
    and c.clinic_id = public.current_clinic_id()
  )
)
with check (
  exists (
    select 1 from public.consults c
    where c.id = consult_outcomes.consult_id
    and c.clinic_id = public.current_clinic_id()
  )
);

create policy "clinic users can view own audit logs"
on public.audit_logs
for select
using (clinic_id = public.current_clinic_id());
