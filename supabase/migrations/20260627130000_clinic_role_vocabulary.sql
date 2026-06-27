-- Rename clinic member roles to the product vocabulary:
--   owner, employee, clinic-admin, clinic-staff
-- Migrate legacy values: admin → clinic-admin, staff → clinic-staff, clinician → employee.
-- Default for new profiles is employee (owner is assigned at onboarding completion).

alter table public.profiles drop constraint if exists valid_role;

update public.profiles set role = 'clinic-admin' where role = 'admin';
update public.profiles set role = 'clinic-staff' where role = 'staff';
update public.profiles set role = 'employee' where role = 'clinician';

-- Signup used to assign owner before onboarding; revert incomplete accounts.
update public.profiles
set role = 'employee'
where role = 'owner' and clinic_id is null;

alter table public.profiles
  alter column role set default 'employee';

alter table public.profiles
  add constraint valid_role
  check (role in ('owner', 'employee', 'clinic-admin', 'clinic-staff'));

-- clinic_invites.role
alter table public.clinic_invites drop constraint if exists clinic_invites_role_check;

update public.clinic_invites set role = 'clinic-admin' where role = 'admin';
update public.clinic_invites set role = 'clinic-staff' where role = 'staff';

alter table public.clinic_invites
  add constraint clinic_invites_role_check
  check (role in ('clinic-admin', 'clinic-staff'));

-- RLS policies that referenced legacy admin role
drop policy if exists "owner or admin can create invite" on public.clinic_invites;
create policy "owner or admin can create invite"
  on public.clinic_invites for insert to authenticated
  with check (
    clinic_id = (select current_clinic_id())
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.clinic_id = (select current_clinic_id())
        and profiles.role in ('owner', 'clinic-admin')
    )
  );

drop policy if exists "owner or admin can update clinic" on public.clinics;
create policy "owner or admin can update clinic"
  on public.clinics for update to authenticated
  using (id = (select current_clinic_id()))
  with check (
    id = (select current_clinic_id())
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.clinic_id = (select current_clinic_id())
        and profiles.role in ('owner', 'clinic-admin')
    )
  );

drop policy if exists "owner or admin can insert location" on public.locations;
create policy "owner or admin can insert location"
  on public.locations for insert to authenticated
  with check (
    clinic_id = (select current_clinic_id())
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.clinic_id = (select current_clinic_id())
        and profiles.role in ('owner', 'clinic-admin')
    )
  );

drop policy if exists "owner or admin can update clinic profiles" on public.profiles;
create policy "owner or admin can update clinic profiles"
  on public.profiles for update to authenticated
  using (
    clinic_id = (select current_clinic_id())
    and exists (
      select 1 from public.profiles me
      where me.id = (select auth.uid())
        and me.role in ('owner', 'clinic-admin')
    )
  )
  with check (clinic_id = (select current_clinic_id()));
