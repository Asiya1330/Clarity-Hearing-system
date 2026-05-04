-- Migration: clinic_invites
--
-- The admin/users page allows owners and admins to create invitations for
-- new clinic members. This table stores pending invite records.
-- Email delivery is a future feature; the record is the source of truth for
-- an outstanding invite.

create table if not exists public.clinic_invites (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  invited_by  uuid not null references auth.users (id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('admin', 'staff')),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '7 days')
);

-- Only members of the same clinic can see its invites.
alter table public.clinic_invites enable row level security;

create policy "clinic members can read own clinic invites"
  on public.clinic_invites for select
  using (clinic_id = current_clinic_id());

-- Only owners and admins can insert invites.
create policy "owner or admin can create invite"
  on public.clinic_invites for insert
  with check (
    clinic_id = current_clinic_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and clinic_id = current_clinic_id()
        and role in ('owner', 'admin')
    )
  );

-- Index for lookups by clinic and email.
create index if not exists clinic_invites_clinic_id_idx on public.clinic_invites (clinic_id);
create index if not exists clinic_invites_email_idx      on public.clinic_invites (email);
