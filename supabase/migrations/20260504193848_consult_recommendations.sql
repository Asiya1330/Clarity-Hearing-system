-- Migration: consult_recommendations
-- Reconstructed into version control from the live migration ledger
-- (supabase_migrations.schema_migrations, version 20260504193848). Already
-- applied in production; committed here so the repo mirrors the real history.
--
-- Stores clinician-selected recommendation groups and items for a consult.
-- One row per consult (upsert on consult_id).

create table public.consult_recommendations (
  id uuid default gen_random_uuid() primary key,
  consult_id uuid references public.consults(id) on delete cascade not null,
  clinic_id uuid references public.clinics(id) on delete cascade not null,
  selected_group_ids text[] not null default '{}',
  selected_item_ids jsonb not null default '{}',
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create unique index consult_recommendations_consult_id_idx
  on public.consult_recommendations(consult_id);

create index consult_recommendations_clinic_id_idx
  on public.consult_recommendations(clinic_id);

alter table public.consult_recommendations enable row level security;

-- Clinic members may read their own clinic's recommendations
create policy "clinic members can select own recommendations"
  on public.consult_recommendations
  for select
  using (
    clinic_id = (
      select clinic_id from public.profiles where id = auth.uid()
    )
  );

-- Clinic members may insert recommendations for their own clinic's consults
create policy "clinic members can insert own recommendations"
  on public.consult_recommendations
  for insert
  with check (
    clinic_id = (
      select clinic_id from public.profiles where id = auth.uid()
    )
  );

-- Clinic members may update recommendations for their own clinic's consults
create policy "clinic members can update own recommendations"
  on public.consult_recommendations
  for update
  using (
    clinic_id = (
      select clinic_id from public.profiles where id = auth.uid()
    )
  )
  with check (
    clinic_id = (
      select clinic_id from public.profiles where id = auth.uid()
    )
  );
