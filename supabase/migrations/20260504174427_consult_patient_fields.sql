-- Migration: consult_patient_fields
-- Reconstructed into version control from the live migration ledger
-- (supabase_migrations.schema_migrations, version 20260504174427). Already
-- applied in production; committed here so the repo mirrors the real history.

alter table public.consults
  add column if not exists patient_name   text,
  add column if not exists consult_date   date not null default current_date,
  add column if not exists is_follow_up   boolean not null default false;
