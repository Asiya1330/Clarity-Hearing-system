-- Migration: clinic_invites_table
-- Reconstructed into version control from the live migration ledger
-- (supabase_migrations.schema_migrations, version 20260504171219). Already
-- applied in production; committed here so the repo mirrors the real history.

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

alter table public.clinic_invites enable row level security;

create policy "clinic members can read own clinic invites"
  on public.clinic_invites for select
  using (clinic_id = current_clinic_id());

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

create index if not exists clinic_invites_clinic_id_idx on public.clinic_invites (clinic_id);
create index if not exists clinic_invites_email_idx      on public.clinic_invites (email);
