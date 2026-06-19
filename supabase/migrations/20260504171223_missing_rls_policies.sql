-- Migration: missing_rls_policies
-- Reconstructed into version control from the live migration ledger
-- (supabase_migrations.schema_migrations, version 20260504171223). Already
-- applied in production; committed here so the repo mirrors the real history.
--
-- NOTE: the "owner can update clinic profiles" policy created below has the
-- privilege-escalation hole (no role gate); it is replaced in
-- 20260619090000_hardened_rls_and_functions.sql.

-- model_runs INSERT: critical — without this every consult save returns 500
create policy "clinic users can insert own model runs"
  on public.model_runs for insert
  with check (
    exists (
      select 1 from public.consults c
      where c.id = model_runs.consult_id
        and c.clinic_id = current_clinic_id()
    )
  );

-- audit_logs INSERT: non-fatal but should succeed
create policy "clinic users can insert audit logs"
  on public.audit_logs for insert
  with check (clinic_id = current_clinic_id());

-- clinics UPDATE: required for admin clinic settings page
create policy "owner or admin can update clinic"
  on public.clinics for update
  using (id = current_clinic_id())
  with check (
    id = current_clinic_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and clinic_id = current_clinic_id()
        and role in ('owner', 'admin')
    )
  );

-- locations INSERT: required for admin locations page
create policy "owner or admin can insert location"
  on public.locations for insert
  with check (
    clinic_id = current_clinic_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and clinic_id = current_clinic_id()
        and role in ('owner', 'admin')
    )
  );

-- profiles UPDATE: required for admin users page role changes
create policy "owner can update clinic profiles"
  on public.profiles for update
  using (clinic_id = current_clinic_id())
  with check (clinic_id = current_clinic_id());
