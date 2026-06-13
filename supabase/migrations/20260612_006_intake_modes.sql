-- Migration: intake_modes
--
-- Adds three consult intake modes (in_clinic | kiosk | email):
--   * consults.intake_mode                       — how patient responses are captured
--   * consults.patient_responses                 — patient-answerable subset (sliders,
--                                                  partner impact, listening map), jsonb
--   * consults.patient_responses_submitted_at    — when the patient finished
--   * intake_links                               — single-use tokenized links that let a
--                                                  patient answer from home (email) or on
--                                                  a clinic tablet (kiosk), without auth
--
-- Consult lifecycle with remote intake:
--   awaiting_patient -> patient_complete -> completed
-- (in_clinic consults keep the existing single-step 'completed' insert)

alter table public.consults
  add column if not exists intake_mode text not null default 'in_clinic'
    check (intake_mode in ('in_clinic', 'kiosk', 'email')),
  add column if not exists patient_responses jsonb,
  add column if not exists patient_responses_submitted_at timestamptz;

create table if not exists public.intake_links (
  id            uuid primary key default gen_random_uuid(),
  consult_id    uuid not null references public.consults (id) on delete cascade,
  clinic_id     uuid not null references public.clinics (id) on delete cascade,
  token         text not null unique,
  mode          text not null check (mode in ('kiosk', 'email')),
  patient_email text,
  expires_at    timestamptz not null,
  used_at       timestamptz,
  created_by    uuid not null references public.profiles (id),
  created_at    timestamptz not null default now()
);

create index if not exists intake_links_consult_id_idx on public.intake_links (consult_id);
create index if not exists intake_links_token_idx on public.intake_links (token);

alter table public.intake_links enable row level security;

-- Clinic members can see and create their own clinic's links.
-- (Token validation and patient submission run server-side with the service
--  role and intentionally have NO anon policies.)
drop policy if exists "intake_links_select_clinic_members" on public.intake_links;
create policy "intake_links_select_clinic_members"
  on public.intake_links for select
  using (
    clinic_id in (
      select clinic_id from public.profiles where id = auth.uid()
    )
  );

drop policy if exists "intake_links_insert_clinic_members" on public.intake_links;
create policy "intake_links_insert_clinic_members"
  on public.intake_links for insert
  with check (
    clinic_id in (
      select clinic_id from public.profiles where id = auth.uid()
    )
    and created_by = auth.uid()
  );
