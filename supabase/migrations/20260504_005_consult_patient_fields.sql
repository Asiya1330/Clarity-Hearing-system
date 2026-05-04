-- Migration: consult_patient_fields
--
-- Adds patient-facing fields to consults for display on reports and detail pages.
-- patient_reference (existing) is kept for backward compat.
-- patient_name is preferred for new consults.

alter table public.consults
  add column if not exists patient_name   text,
  add column if not exists consult_date   date not null default current_date,
  add column if not exists is_follow_up   boolean not null default false;
