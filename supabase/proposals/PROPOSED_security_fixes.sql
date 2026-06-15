-- PROPOSED MIGRATION — security advisor findings.
-- DO NOT APPLY without human review. This file was written by the automated
-- health-check pass and has NOT been applied to the database.
--
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
--
-- Findings addressed:
--   1. current_clinic_id() and current_user_role() have mutable search_path (CVE class:
--      search-path injection — a malicious user could shadow system functions).
--   2. Both functions are callable by the `anon` role as SECURITY DEFINER via the REST API.
--      current_clinic_id() returns NULL for unauthenticated callers (auth.uid() is NULL),
--      so there is no data leak today, but the callable surface should be narrowed.
--
-- Trade-off: These functions are used inside RLS policies, so they must remain
-- available to the `authenticated` role (and implicitly via the policy engine).
-- Revoking `anon` EXECUTE removes the /rpc/ endpoint for unauthenticated callers
-- without breaking RLS enforcement. Setting a fixed search_path prevents injection.
--
-- Review checklist before applying:
--   [ ] Confirm no client code calls /rest/v1/rpc/current_clinic_id or
--       /rest/v1/rpc/current_user_role directly (grep the codebase — currently none found).
--   [ ] Test auth flows in staging after applying.
--   [ ] The SET search_path = public, pg_catalog clause is the standard Supabase fix.

-- Fix 1: Pin the search_path on current_clinic_id.
-- The function body is unchanged; only the security-relevant attribute is added.
-- (Replace the function body below with the current production body if it has drifted.)
CREATE OR REPLACE FUNCTION public.current_clinic_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Revoke anon execute on current_clinic_id.
REVOKE EXECUTE ON FUNCTION public.current_clinic_id() FROM anon;

-- Fix 2: Pin the search_path on current_user_role.
CREATE OR REPLACE FUNCTION public.current_user_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Revoke anon execute on current_user_role.
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;
