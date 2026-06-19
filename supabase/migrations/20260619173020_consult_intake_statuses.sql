-- Migration: consult_intake_statuses
--
-- Migration 006 (intake_modes) introduced the remote-intake consult
-- lifecycle — awaiting_patient -> patient_complete -> completed — but the
-- valid_consult_status CHECK constraint was never widened beyond the
-- original draft/completed/archived set. As a result, the first step of any
-- kiosk or email intake (inserting a consult with status 'awaiting_patient',
-- and later updating it to 'patient_complete') fails with SQLSTATE 23514
-- check_violation, and /api/intake returns 500. This widens the constraint.
--
-- Additive only: every previously-valid status remains valid, so no existing
-- row can violate the new constraint.

alter table public.consults drop constraint if exists valid_consult_status;

alter table public.consults
  add constraint valid_consult_status
  check (status in (
    'draft',
    'awaiting_patient',
    'patient_complete',
    'completed',
    'archived'
  ));
