-- Migration: hardened_rls_and_functions  (Phase 0 + Phase 1 security remediation)
--
-- Brings the entire RLS isolation layer under version control and closes the
-- security findings from the production-readiness audit:
--
--   1. ENABLE ROW LEVEL SECURITY explicitly on every application table
--      (idempotent — most are already enabled; this makes the posture
--      reproducible from source so a restore/staging bootstrap can never come
--      up with tables exposed).
--
--   2. Rescope EVERY policy from the broad `public` role (which includes the
--      unauthenticated `anon` role) to `authenticated`. Tenant data can no
--      longer be reached by a generic/public role even if a helper function
--      were ever made to return non-NULL for anon. Patient intake is
--      unaffected: it runs through the service-role client, which bypasses RLS
--      and is not constrained by policy role lists.
--
--   3. Fix the privilege-escalation hole in the profiles UPDATE policy. The
--      previous policy only checked `clinic_id = current_clinic_id()` with no
--      role gate and no column guard, so ANY clinic member could promote
--      themselves to `owner` via a direct PostgREST call. Replaced with:
--        - a self-update policy (members may edit their own non-privileged
--          fields), and
--        - an owner/admin policy (privileged members may manage others), plus
--        - a BEFORE UPDATE trigger that hard-blocks a user changing their OWN
--          role or clinic_id (defence in depth, independent of the policies).
--
--   4. Harden the SECURITY DEFINER helper functions current_clinic_id() and
--      current_user_role(): pin `search_path` (prevents search-path hijacking
--      of a definer-rights function) and REVOKE EXECUTE from anon/PUBLIC,
--      granting only to authenticated + service_role.
--
-- All statements are idempotent (DROP ... IF EXISTS / CREATE OR REPLACE) and
-- semantics match the live schema verified at authoring time, so re-applying
-- is safe and no existing row can be locked out.
--
-- No explicit BEGIN/COMMIT: the migration runner (`supabase db push` and the
-- MCP apply_migration tool) wraps each migration file in its own transaction,
-- so the whole file applies atomically.

-- ---------------------------------------------------------------------------
-- 1. Explicit RLS enablement on all application tables
-- ---------------------------------------------------------------------------
alter table public.audit_logs              enable row level security;
alter table public.clinic_invites          enable row level security;
alter table public.clinics                 enable row level security;
alter table public.consult_outcomes        enable row level security;
alter table public.consult_recommendations enable row level security;
alter table public.consults                enable row level security;
alter table public.ear_fit_photos          enable row level security;
alter table public.intake_links            enable row level security;
alter table public.locations               enable row level security;
alter table public.model_runs              enable row level security;
alter table public.profiles                enable row level security;
alter table public.report_share_links      enable row level security;
alter table public.reports                 enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Harden the RLS helper functions
--    - SET search_path so the definer-rights body cannot be hijacked by a
--      caller who creates a same-named object in an earlier schema.
--    - SECURITY DEFINER is REQUIRED here (current_clinic_id is read inside the
--      profiles RLS policy; an INVOKER function would recurse infinitely), so
--      it is retained — but execute is locked down to authenticated callers.
-- ---------------------------------------------------------------------------
create or replace function public.current_clinic_id()
  returns uuid
  language sql
  stable
  security definer
  set search_path = public, pg_catalog
as $$
  select clinic_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_role()
  returns text
  language sql
  stable
  security definer
  set search_path = public, pg_catalog
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke execute on function public.current_clinic_id()  from public, anon;
revoke execute on function public.current_user_role()  from public, anon;
grant  execute on function public.current_clinic_id()  to authenticated, service_role;
grant  execute on function public.current_user_role()  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Tenant-isolation policies — recreated `TO authenticated`
--    Bodies are wrapped in (select ...) around auth.uid()/current_clinic_id()
--    so they are evaluated once per query (init-plan) instead of once per row.
-- ---------------------------------------------------------------------------

-- audit_logs ----------------------------------------------------------------
drop policy if exists "clinic users can insert audit logs" on public.audit_logs;
create policy "clinic users can insert audit logs"
  on public.audit_logs for insert to authenticated
  with check (clinic_id = (select current_clinic_id()));

drop policy if exists "clinic users can view own audit logs" on public.audit_logs;
create policy "clinic users can view own audit logs"
  on public.audit_logs for select to authenticated
  using (clinic_id = (select current_clinic_id()));

-- clinic_invites ------------------------------------------------------------
drop policy if exists "clinic members can read own clinic invites" on public.clinic_invites;
create policy "clinic members can read own clinic invites"
  on public.clinic_invites for select to authenticated
  using (clinic_id = (select current_clinic_id()));

drop policy if exists "owner or admin can create invite" on public.clinic_invites;
create policy "owner or admin can create invite"
  on public.clinic_invites for insert to authenticated
  with check (
    clinic_id = (select current_clinic_id())
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.clinic_id = (select current_clinic_id())
        and profiles.role in ('owner', 'admin')
    )
  );

-- clinics -------------------------------------------------------------------
drop policy if exists "clinic users can view own clinic" on public.clinics;
create policy "clinic users can view own clinic"
  on public.clinics for select to authenticated
  using (id = (select current_clinic_id()));

drop policy if exists "owner or admin can update clinic" on public.clinics;
create policy "owner or admin can update clinic"
  on public.clinics for update to authenticated
  using (id = (select current_clinic_id()))
  with check (
    id = (select current_clinic_id())
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.clinic_id = (select current_clinic_id())
        and profiles.role in ('owner', 'admin')
    )
  );

-- consult_outcomes ----------------------------------------------------------
drop policy if exists "clinic users can manage own outcomes" on public.consult_outcomes;
create policy "clinic users can manage own outcomes"
  on public.consult_outcomes for all to authenticated
  using (
    exists (
      select 1 from public.consults c
      where c.id = consult_outcomes.consult_id
        and c.clinic_id = (select current_clinic_id())
    )
  )
  with check (
    exists (
      select 1 from public.consults c
      where c.id = consult_outcomes.consult_id
        and c.clinic_id = (select current_clinic_id())
    )
  );

-- consult_recommendations ---------------------------------------------------
drop policy if exists "clinic members can select own recommendations" on public.consult_recommendations;
create policy "clinic members can select own recommendations"
  on public.consult_recommendations for select to authenticated
  using (clinic_id = (select current_clinic_id()));

drop policy if exists "clinic members can insert own recommendations" on public.consult_recommendations;
create policy "clinic members can insert own recommendations"
  on public.consult_recommendations for insert to authenticated
  with check (clinic_id = (select current_clinic_id()));

drop policy if exists "clinic members can update own recommendations" on public.consult_recommendations;
create policy "clinic members can update own recommendations"
  on public.consult_recommendations for update to authenticated
  using (clinic_id = (select current_clinic_id()))
  with check (clinic_id = (select current_clinic_id()));

-- consults ------------------------------------------------------------------
drop policy if exists "clinic users can manage own consults" on public.consults;
create policy "clinic users can manage own consults"
  on public.consults for all to authenticated
  using (clinic_id = (select current_clinic_id()))
  with check (clinic_id = (select current_clinic_id()));

-- ear_fit_photos ------------------------------------------------------------
drop policy if exists "clinic users can manage own photos" on public.ear_fit_photos;
create policy "clinic users can manage own photos"
  on public.ear_fit_photos for all to authenticated
  using (clinic_id = (select current_clinic_id()))
  with check (clinic_id = (select current_clinic_id()));

-- intake_links --------------------------------------------------------------
drop policy if exists "intake_links_select_clinic_members" on public.intake_links;
create policy "intake_links_select_clinic_members"
  on public.intake_links for select to authenticated
  using (clinic_id = (select current_clinic_id()));

drop policy if exists "intake_links_insert_clinic_members" on public.intake_links;
create policy "intake_links_insert_clinic_members"
  on public.intake_links for insert to authenticated
  with check (
    clinic_id = (select current_clinic_id())
    and created_by = (select auth.uid())
  );

-- locations -----------------------------------------------------------------
drop policy if exists "clinic users can view own locations" on public.locations;
create policy "clinic users can view own locations"
  on public.locations for select to authenticated
  using (clinic_id = (select current_clinic_id()));

drop policy if exists "owner or admin can insert location" on public.locations;
create policy "owner or admin can insert location"
  on public.locations for insert to authenticated
  with check (
    clinic_id = (select current_clinic_id())
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.clinic_id = (select current_clinic_id())
        and profiles.role in ('owner', 'admin')
    )
  );

-- model_runs ----------------------------------------------------------------
drop policy if exists "clinic users can view own model runs" on public.model_runs;
create policy "clinic users can view own model runs"
  on public.model_runs for select to authenticated
  using (
    exists (
      select 1 from public.consults c
      where c.id = model_runs.consult_id
        and c.clinic_id = (select current_clinic_id())
    )
  );

drop policy if exists "clinic users can insert own model runs" on public.model_runs;
create policy "clinic users can insert own model runs"
  on public.model_runs for insert to authenticated
  with check (
    exists (
      select 1 from public.consults c
      where c.id = model_runs.consult_id
        and c.clinic_id = (select current_clinic_id())
    )
  );

-- profiles ------------------------------------------------------------------
drop policy if exists "clinic users can view profiles" on public.profiles;
create policy "clinic users can view profiles"
  on public.profiles for select to authenticated
  using (clinic_id = (select current_clinic_id()));

-- Drop the vulnerable single UPDATE policy (no role gate, no column guard).
drop policy if exists "owner can update clinic profiles" on public.profiles;

-- 3a. Members may update their OWN profile row. The accompanying trigger
--     forbids changing role/clinic_id, so this only exposes safe fields
--     (e.g. full_name).
create policy "members can update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and clinic_id = (select current_clinic_id())
  );

-- 3b. Owners/admins may manage OTHER members in their clinic (role changes,
--     etc.). The trigger still blocks them from changing their own role.
create policy "owner or admin can update clinic profiles"
  on public.profiles for update to authenticated
  using (
    clinic_id = (select current_clinic_id())
    and exists (
      select 1 from public.profiles me
      where me.id = (select auth.uid())
        and me.role in ('owner', 'admin')
    )
  )
  with check (clinic_id = (select current_clinic_id()));

-- report_share_links --------------------------------------------------------
drop policy if exists "clinic members can view own share links" on public.report_share_links;
create policy "clinic members can view own share links"
  on public.report_share_links for select to authenticated
  using (clinic_id = (select current_clinic_id()));

drop policy if exists "clinic members can create share links" on public.report_share_links;
create policy "clinic members can create share links"
  on public.report_share_links for insert to authenticated
  with check (clinic_id = (select current_clinic_id()));

drop policy if exists "clinic members can revoke own share links" on public.report_share_links;
create policy "clinic members can revoke own share links"
  on public.report_share_links for update to authenticated
  using (clinic_id = (select current_clinic_id()));

-- reports -------------------------------------------------------------------
drop policy if exists "clinic users can view own reports" on public.reports;
create policy "clinic users can view own reports"
  on public.reports for select to authenticated
  using (
    exists (
      select 1 from public.consults c
      where c.id = reports.consult_id
        and c.clinic_id = (select current_clinic_id())
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Hard backstop against self privilege-escalation on profiles.
--    Fires for real user sessions only (auth.uid() is NULL for the
--    service-role/backend, which legitimately provisions profiles).
-- ---------------------------------------------------------------------------
create or replace function public.prevent_profile_privilege_escalation()
  returns trigger
  language plpgsql
  security invoker
  set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is not null and new.id = auth.uid() then
    if new.role is distinct from old.role then
      raise exception 'A user cannot change their own role (privilege escalation blocked).'
        using errcode = '42501';
    end if;
    if new.clinic_id is distinct from old.clinic_id then
      raise exception 'A user cannot change their own clinic assignment.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_escalation on public.profiles;
create trigger prevent_profile_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();
