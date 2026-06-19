-- Migration: report_share_links and local backup folder path
-- Reconstructed into version control from the live migration ledger
-- (supabase_migrations.schema_migrations, version 20260504191124). Already
-- applied in production; committed here so the repo mirrors the real history.
--
-- 1. Adds report_share_links table for time-limited, token-based report sharing.
--    Only the hash of the token is stored; the raw token is returned once to the
--    caller and never persisted.
-- 2. Adds clinics.local_backup_folder_path for an optional clinic preference
--    that surfaces as a hint on the report page (no automatic file writing).

-- ─── 1. report_share_links ────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.report_share_links (
  id               uuid primary key default gen_random_uuid(),
  consult_id       uuid not null references public.consults(id) on delete cascade,
  clinic_id        uuid not null references public.clinics(id)  on delete cascade,
  token_hash       text not null,
  expires_at       timestamptz not null,
  recipient_email  text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  revoked_at       timestamptz,
  access_count     int not null default 0,
  last_accessed_at timestamptz
);

-- token_hash must be unique so we can look up a link by hash efficiently.
create unique index if not exists report_share_links_token_hash_idx
  on public.report_share_links (token_hash);

-- Typical queries: all links for a clinic ordered by date, or by consult.
create index if not exists report_share_links_clinic_created_idx
  on public.report_share_links (clinic_id, created_at desc);

create index if not exists report_share_links_consult_idx
  on public.report_share_links (consult_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.report_share_links enable row level security;

-- Clinic members may view share links that belong to their clinic.
create policy "clinic members can view own share links"
  on public.report_share_links
  for select
  using (
    clinic_id in (
      select clinic_id from public.profiles
      where id = auth.uid()
    )
  );

-- Clinic members may create share links for their own clinic.
create policy "clinic members can create share links"
  on public.report_share_links
  for insert
  with check (
    clinic_id in (
      select clinic_id from public.profiles
      where id = auth.uid()
    )
  );

-- Clinic members may revoke (update revoked_at) share links for their clinic.
create policy "clinic members can revoke own share links"
  on public.report_share_links
  for update
  using (
    clinic_id in (
      select clinic_id from public.profiles
      where id = auth.uid()
    )
  );

-- Public token validation (access_count / last_accessed_at update) is handled
-- through a dedicated service-role server route, not direct RLS bypass.

-- ─── 2. clinics.local_backup_folder_path ──────────────────────────────────────

alter table public.clinics
  add column if not exists local_backup_folder_path text;

-- Constraint: max 500 characters; the value is a display hint only.
alter table public.clinics
  drop constraint if exists clinics_backup_path_length;

alter table public.clinics
  add constraint clinics_backup_path_length
    check (char_length(local_backup_folder_path) <= 500);
