-- Migration: clinic_report_footer
-- Reconstructed into version control from the live migration ledger
-- (supabase_migrations.schema_migrations, version 20260504165709). Already
-- applied in production; committed here so the repo mirrors the real history.

alter table public.clinics
  add column if not exists report_footer text;
