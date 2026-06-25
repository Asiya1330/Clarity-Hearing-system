-- ============================================================================
-- OViz — one-time cleanup: remove mock / demo / test tenants
-- Target project: kjufynstdouuigkbraic (oviz-production)
-- Authored: 2026-06-25 — approved scope (see scripts/backups/2026-06-25-remove-mock-tenants/)
--
-- Run this YOURSELF (do not add to supabase/migrations — it is a one-shot data
-- cleanup, not a schema change). Options:
--   * Supabase Dashboard -> SQL Editor -> paste this file -> Run   (recommended; atomic)
--   * psql "$SUPABASE_DB_URL" -f scripts/cleanup/2026-06-25-remove-mock-tenants.sql
--
-- Atomic: the whole thing is one DO block — any guard failure raises and rolls
-- back every change. A verifiable backup of every row deleted here lives in
-- scripts/backups/2026-06-25-remove-mock-tenants/ (restore steps in its README).
--
-- DELETES (38 auth users, 10 clinics + all cascaded children):
--   * 36 @oviz-testing.ca UAT seed users + e2e-pro@oviz-e2e.test + admin@processpath.ca
--   * 9 UAT seed clinics + OtoVantage Demo Clinic (cascades locations/consults/invites)
-- KEEPS (explicitly out of scope, guarded):
--   * Clear Hearing Center (5a459292-…) + stlem@atdi.ca + all its data
--   * sl@evear.ca login (its profile survives with clinic_id = NULL)
--   * drlydia.aud@gmail.com
-- ============================================================================

do $$
declare
  v_users   int;
  v_clinics int;
  k_clinics uuid[] := array[
    'c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000004',
    'c0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000006',
    'c0000000-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000008',
    'c0000000-0000-4000-8000-000000000009','9509c712-f1ba-4218-bc92-acb56775bf7d'
  ]::uuid[];
begin
  -- GUARD 1: the Clear Hearing clinic must never be in scope.
  if '5a459292-7408-4404-b724-4ffd17ee92f2'::uuid = any(k_clinics) then
    raise exception 'GUARD: Clear Hearing Center is in the deletion scope — aborting';
  end if;

  -- GUARD 2: no kept account may match the user-delete predicate.
  if exists (
    select 1 from auth.users
     where lower(email) in ('stlem@atdi.ca','sl@evear.ca','drlydia.aud@gmail.com')
       and (lower(email) like '%@oviz-testing.ca'
            or lower(email) in ('admin@processpath.ca','e2e-pro@oviz-e2e.test'))
  ) then
    raise exception 'GUARD: a kept user matched the delete predicate — aborting';
  end if;

  -- GUARD 3: live state must equal the approved dry run (38 users / 10 clinics).
  select count(*) into v_users from auth.users
   where lower(email) like '%@oviz-testing.ca'
      or lower(email) in ('admin@processpath.ca','e2e-pro@oviz-e2e.test');
  if v_users <> 38 then
    raise exception 'GUARD: expected 38 mock auth users, found % — aborting', v_users;
  end if;

  select count(*) into v_clinics from public.clinics where id = any(k_clinics);
  if v_clinics <> 10 then
    raise exception 'GUARD: expected 10 mock clinics, found % — aborting', v_clinics;
  end if;

  -- DELETE 1: mock auth users first.
  -- Cascades: profiles, auth.identities, auth.sessions, and clinic_invites they sent.
  delete from auth.users
   where lower(email) like '%@oviz-testing.ca'
      or lower(email) in ('admin@processpath.ca','e2e-pro@oviz-e2e.test');
  get diagnostics v_users = row_count;

  -- DELETE 2: mock clinics.
  -- Cascades: locations, consults (-> model_runs/reports/outcomes/recs/share/intake/photos),
  -- and any residual clinic_invites. Sets sl@evear.ca's profile.clinic_id to NULL.
  delete from public.clinics where id = any(k_clinics);
  get diagnostics v_clinics = row_count;

  raise notice 'remove-mock-tenants OK: % auth users + % clinics deleted', v_users, v_clinics;
end $$;
