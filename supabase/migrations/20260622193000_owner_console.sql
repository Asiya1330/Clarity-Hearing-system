-- Migration: owner_console
--
-- Backend SaaS Management Console ("OViz Control Room") for the SaaS owner
-- (sl@evear.ca) and trusted staff. This is a SEPARATE surface from the
-- clinic-level admin under app/(app)/admin/*; it never reuses clinic RLS.
--
-- Design rules honoured here:
--   * Strictly ADDITIVE. No existing table/column/policy/constraint is dropped
--     or altered in a behaviour-changing way. Pre-existing intake/kiosk/report
--     flows are untouched.
--   * IDEMPOTENT. Every statement uses IF NOT EXISTS / CREATE OR REPLACE /
--     DROP ... IF EXISTS so re-applying to an already-migrated database (or the
--     live production database) is a safe no-op.
--   * Owner-console tables get RLS ENABLED with NO authenticated/anon policies.
--     All reads/writes happen server-side through the service-role client AFTER
--     requireOwnerConsoleAccess(). The service role bypasses RLS; ordinary
--     clinic sessions can never touch these rows even via a direct PostgREST
--     call. (admin_audit_logs goes further: a trigger blocks UPDATE/DELETE for
--     everyone, including the service role — it is append-only.)
--
-- The migration runner wraps each file in its own transaction, so this applies
-- atomically.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. clinics — account suspension + Stripe sync bookkeeping
--    Added as nullable / defaulted columns so existing rows stay valid.
--    The existing clinics RLS (own-clinic SELECT, owner/admin UPDATE) already
--    governs these columns for clinic members; owner-console writes use the
--    service role.
-- ---------------------------------------------------------------------------
alter table public.clinics
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'suspended')),
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid,
  add column if not exists suspension_reason text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_sync_status text not null default 'not_configured'
    check (stripe_sync_status in ('not_configured', 'not_applicable', 'synced', 'sync_failed')),
  add column if not exists stripe_last_synced_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. owner_console_entitlements — per-clinic feature flags owned by the console
-- ---------------------------------------------------------------------------
create table if not exists public.owner_console_entitlements (
  clinic_id                 uuid primary key references public.clinics(id) on delete cascade,
  enable_kiosk_mode         boolean not null default true,
  enable_presentation_mode  boolean not null default false,
  enable_audiogram_ai_beta  boolean not null default false,
  notes                     text,
  updated_by                uuid,
  updated_at                timestamptz not null default now(),
  created_at                timestamptz not null default now()
);

alter table public.owner_console_entitlements enable row level security;
-- No client policies: server-only via service role after requireOwnerConsoleAccess().

-- ---------------------------------------------------------------------------
-- 3. admin_audit_logs — APPEND-ONLY immutable trail for every console mutation.
--    Distinct from the clinic-scoped public.audit_logs (left untouched).
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_logs (
  id                 uuid primary key default gen_random_uuid(),
  actor_user_id      uuid,
  actor_email        text,
  actor_console_role text,
  action             text not null,
  target_type        text not null,
  target_id          text,
  target_clinic_id   uuid,
  metadata           jsonb not null default '{}'::jsonb,
  request_ip_hash    text,
  user_agent_hash    text,
  created_at         timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;
-- No client policies. Service role inserts; the trigger below blocks all
-- mutation (UPDATE/DELETE) for everyone, including the service role.

create or replace function public.admin_audit_logs_block_mutation()
  returns trigger
  language plpgsql
  security invoker
  set search_path = public, pg_catalog
as $$
begin
  raise exception 'admin_audit_logs is append-only; % is not permitted', tg_op
    using errcode = '42501';
  return null;
end;
$$;

drop trigger if exists admin_audit_logs_no_update on public.admin_audit_logs;
create trigger admin_audit_logs_no_update
  before update on public.admin_audit_logs
  for each row execute function public.admin_audit_logs_block_mutation();

drop trigger if exists admin_audit_logs_no_delete on public.admin_audit_logs;
create trigger admin_audit_logs_no_delete
  before delete on public.admin_audit_logs
  for each row execute function public.admin_audit_logs_block_mutation();

-- ---------------------------------------------------------------------------
-- 4. email_logs — delivery audit for transactional email (Resend).
--    Stores MASKED recipient + a salted hash, never the raw full address.
-- ---------------------------------------------------------------------------
create table if not exists public.email_logs (
  id                     uuid primary key default gen_random_uuid(),
  clinic_id              uuid references public.clinics(id) on delete cascade,
  consult_id             uuid references public.consults(id) on delete set null,
  provider               text not null default 'resend',
  provider_message_id    text,
  template               text,
  subject                text,
  recipient_email_masked text,
  recipient_email_hash   text,
  status                 text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'unknown')),
  last_error             text,
  metadata               jsonb not null default '{}'::jsonb,
  sent_at                timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.email_logs enable row level security;
-- No client policies: owner-console reads via service role only.

-- ---------------------------------------------------------------------------
-- 5. intake_links — kiosk/email session revocation.
--    Token validation code treats a revoked link exactly like used/expired.
-- ---------------------------------------------------------------------------
alter table public.intake_links
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid,
  add column if not exists revoked_reason text;

-- ---------------------------------------------------------------------------
-- 6. kiosk_session_events — audit of kiosk lifecycle (e.g. force-kill).
-- ---------------------------------------------------------------------------
create table if not exists public.kiosk_session_events (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid references public.clinics(id) on delete cascade,
  intake_link_id uuid references public.intake_links(id) on delete cascade,
  action         text not null,
  actor_user_id  uuid,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

alter table public.kiosk_session_events enable row level security;
-- No client policies: server-only via service role.

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists clinics_account_status_idx
  on public.clinics (account_status);
create index if not exists clinics_stripe_customer_id_idx
  on public.clinics (stripe_customer_id);
create index if not exists clinics_stripe_subscription_id_idx
  on public.clinics (stripe_subscription_id);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_target_clinic_created_idx
  on public.admin_audit_logs (target_clinic_id, created_at desc);

create index if not exists email_logs_clinic_created_idx
  on public.email_logs (clinic_id, created_at desc);

create index if not exists intake_links_clinic_mode_expires_idx
  on public.intake_links (clinic_id, mode, expires_at);
create index if not exists intake_links_revoked_at_idx
  on public.intake_links (revoked_at);

-- Covering indexes for the remaining new foreign keys (matches the repo's
-- existing FK-indexing convention; confirmed by the Supabase performance
-- advisor on a preview branch).
create index if not exists email_logs_consult_id_idx
  on public.email_logs (consult_id);
create index if not exists kiosk_session_events_clinic_id_idx
  on public.kiosk_session_events (clinic_id);
create index if not exists kiosk_session_events_intake_link_id_idx
  on public.kiosk_session_events (intake_link_id);
