-- Migration: add_foreign_key_indexes
-- Reconstructed into version control from the live migration ledger
-- (supabase_migrations.schema_migrations, version 20260503150402). Already
-- applied in production; committed here so the repo mirrors the real history.

create index idx_profiles_clinic_id on public.profiles(clinic_id);
create index idx_locations_clinic_id on public.locations(clinic_id);
create index idx_consults_clinic_id_created_at on public.consults(clinic_id, created_at desc);
create index idx_consults_location_id on public.consults(location_id);
create index idx_model_runs_consult_id on public.model_runs(consult_id);
create index idx_photos_consult_id on public.ear_fit_photos(consult_id);
create index idx_photos_clinic_id on public.ear_fit_photos(clinic_id);
create index idx_reports_consult_id on public.reports(consult_id);
create index idx_outcomes_consult_id on public.consult_outcomes(consult_id);
create index idx_audit_logs_clinic_created_at on public.audit_logs(clinic_id, created_at desc);
