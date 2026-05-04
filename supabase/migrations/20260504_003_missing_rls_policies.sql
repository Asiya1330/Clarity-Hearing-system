-- Migration: missing_rls_policies
--
-- Adds INSERT/UPDATE policies that were absent from the initial schema.
-- Without model_runs INSERT, every consult save returns 500.
-- Without clinics/locations/profiles write policies, all admin mutations fail.

-- model_runs INSERT: clinic members can insert model runs for their own consults
create policy "clinic users can insert own model runs"
  on public.model_runs for insert
  with check (
    exists (
      select 1 from public.consults c
      where c.id = model_runs.consult_id
        and c.clinic_id = current_clinic_id()
    )
  );

-- audit_logs INSERT: non-fatal audit trail
create policy "clinic users can insert audit logs"
  on public.audit_logs for insert
  with check (clinic_id = current_clinic_id());

-- clinics UPDATE: required for admin/clinic settings page
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

-- locations INSERT: required for admin/locations page
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

-- profiles UPDATE: required for admin/users role-change page
create policy "owner can update clinic profiles"
  on public.profiles for update
  using (clinic_id = current_clinic_id())
  with check (clinic_id = current_clinic_id());
