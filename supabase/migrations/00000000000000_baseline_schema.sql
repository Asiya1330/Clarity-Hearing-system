-- Migration: baseline_schema
--
-- The base tables for OViz. Historically these were created outside the
-- migration system (the live ledger started at `add_foreign_key_indexes`,
-- which assumes the tables already exist), so the repo could not rebuild the
-- database from scratch. This file restores that capability for disaster
-- recovery and fresh/staging environments.
--
-- Scope: ONLY the base tables and their original columns/constraints. Columns
-- and tables added later are intentionally omitted here and applied by the
-- subsequent dated migrations, in historical order:
--   * clinics.report_footer / .local_backup_folder_path   -> later migrations
--   * consults.patient_name/consult_date/is_follow_up      -> consult_patient_fields
--   * consults.intake_mode/patient_responses/*             -> intake_modes
--   * consults.valid_consult_status is widened             -> consult_intake_statuses
--   * clinic_invites / intake_links / report_share_links /
--     consult_recommendations tables                       -> their own migrations
--   * all indexes, RLS, policies, helper functions         -> later migrations
--
-- Idempotency: every statement uses IF NOT EXISTS, so applying this to the
-- existing production database is a safe no-op (the tables already exist); on a
-- fresh database it creates the base tables that the later migrations build on.

create extension if not exists "uuid-ossp";

-- clinics -------------------------------------------------------------------
create table if not exists public.clinics (
  id                   uuid primary key default uuid_generate_v4(),
  name                 text not null,
  slug                 text not null unique,
  subscription_plan    text not null default 'starter'
                         constraint valid_subscription_plan
                         check (subscription_plan in ('starter', 'pro', 'enterprise')),
  subscription_status  text not null default 'trialing'
                         constraint valid_subscription_status
                         check (subscription_status in ('trialing', 'active', 'past_due', 'canceled')),
  photo_module_enabled boolean not null default false,
  max_photo_count      integer not null default 0,
  max_photo_size_bytes integer not null default 500000,
  created_at           timestamptz not null default now()
);

-- locations -----------------------------------------------------------------
create table if not exists public.locations (
  id         uuid primary key default uuid_generate_v4(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  name       text not null,
  address    text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- profiles (1:1 with auth.users) --------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  clinic_id  uuid references public.clinics(id) on delete set null,
  full_name  text,
  role       text not null default 'clinician'
               constraint valid_role
               check (role in ('owner', 'admin', 'clinician', 'staff')),
  created_at timestamptz not null default now()
);

-- consults ------------------------------------------------------------------
-- NOTE: valid_consult_status here is the ORIGINAL narrow set; it is widened by
-- the consult_intake_statuses migration (drop + re-add). Patient-facing and
-- intake columns are added by later migrations.
create table if not exists public.consults (
  id               uuid primary key default uuid_generate_v4(),
  clinic_id        uuid not null references public.clinics(id) on delete cascade,
  location_id      uuid references public.locations(id),
  clinician_id     uuid not null references public.profiles(id),
  patient_reference text,
  status           text not null default 'draft'
                     constraint valid_consult_status
                     check (status in ('draft', 'completed', 'archived')),
  photo_consent    boolean not null default false,
  photo_consent_at timestamptz,
  created_at       timestamptz not null default now()
);

-- model_runs ----------------------------------------------------------------
create table if not exists public.model_runs (
  id            uuid primary key default uuid_generate_v4(),
  consult_id    uuid not null references public.consults(id) on delete cascade,
  model_version text not null,
  inputs        jsonb not null,
  outputs       jsonb not null,
  created_at    timestamptz not null default now()
);

-- ear_fit_photos ------------------------------------------------------------
create table if not exists public.ear_fit_photos (
  id              uuid primary key default uuid_generate_v4(),
  consult_id      uuid not null references public.consults(id) on delete cascade,
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  storage_path    text not null,
  caption         text,
  sort_order      integer not null default 0,
  upload_status   text not null default 'pending'
                    constraint valid_photo_status
                    check (upload_status in ('pending', 'uploaded', 'failed', 'deleted')),
  file_size_bytes integer,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

-- reports -------------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default uuid_generate_v4(),
  consult_id  uuid not null references public.consults(id) on delete cascade,
  storage_path text,
  report_html text,
  created_at  timestamptz not null default now()
);

-- consult_outcomes ----------------------------------------------------------
create table if not exists public.consult_outcomes (
  id              uuid primary key default uuid_generate_v4(),
  consult_id      uuid not null references public.consults(id) on delete cascade,
  outcome         text not null
                    constraint valid_outcome
                    check (outcome in ('accepted', 'thinking', 'declined')),
  estimated_value numeric,
  notes           text,
  created_at      timestamptz not null default now()
);

-- audit_logs (no FKs by original design — append-only trail) -----------------
create table if not exists public.audit_logs (
  id         uuid primary key default uuid_generate_v4(),
  clinic_id  uuid,
  user_id    uuid,
  action     text not null,
  metadata   jsonb,
  created_at timestamptz not null default now()
);
