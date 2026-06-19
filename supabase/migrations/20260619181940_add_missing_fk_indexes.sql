-- Migration: add_missing_fk_indexes
--
-- Covering indexes for unindexed foreign keys flagged by the Supabase
-- performance advisor. At 500-700 tenants these matter for clinician-scoped
-- reads (consults.clinician_id) and for cascade-delete performance when a
-- clinic or profile is removed (child tables are otherwise seq-scanned).
-- Also drops a redundant token index.

create index if not exists idx_consults_clinician_id
  on public.consults (clinician_id);
create index if not exists idx_intake_links_clinic_id
  on public.intake_links (clinic_id);
create index if not exists idx_intake_links_created_by
  on public.intake_links (created_by);
create index if not exists idx_clinic_invites_invited_by
  on public.clinic_invites (invited_by);
create index if not exists idx_consult_recommendations_created_by
  on public.consult_recommendations (created_by);
create index if not exists idx_consult_recommendations_updated_by
  on public.consult_recommendations (updated_by);
create index if not exists idx_ear_fit_photos_created_by
  on public.ear_fit_photos (created_by);
create index if not exists idx_report_share_links_created_by
  on public.report_share_links (created_by);

-- Drop the redundant non-unique token index; the UNIQUE constraint
-- intake_links_token_key already serves token lookups.
drop index if exists public.intake_links_token_idx;
