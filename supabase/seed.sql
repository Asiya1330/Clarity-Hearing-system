-- =============================================================================
-- OViz — LOCAL E2E test seed: 9 mock clinic tenants × (1 owner + 3 invited staff)
-- GENERATED from tests/fixtures/mock-tenants.json by scripts/gen-seed-artifacts.mjs.
-- Do not edit by hand — edit the JSON and re-run the generator.
-- =============================================================================
-- LOCAL / TEST DATABASES ONLY. Wired into supabase/config.toml ([db.seed]); runs
-- on `supabase db reset` against the local stack. NOT part of `supabase db push`,
-- so it never reaches staging/production. The guard below aborts if any non-test
-- user exists, so it cannot create known-password accounts on a real database.
-- (Production UAT seeding uses scripts/seed-uat-tenants.mjs instead.)
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

do $guard$
begin
  if exists (
    select 1 from auth.users
    where coalesce(email, '') !~* '@oviz-(testing\.ca|e2e\.test)$'
  ) then
    raise exception 'OViz seed.sql aborted: real (non-test) users found in auth.users. This seed is for LOCAL/TEST databases only and must never run against staging or production.'
      using errcode = 'P0001';
  end if;
end
$guard$;

create or replace function pg_temp.seed_member(
  p_user_id uuid, p_clinic_id uuid, p_email text, p_password text, p_full_name text, p_role text
) returns void language plpgsql set search_path = extensions, public, auth, pg_catalog as $fn$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000', p_user_id, 'authenticated', 'authenticated',
    p_email, crypt(p_password, gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'email_verified', true)
  ) on conflict (id) do nothing;

  insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    p_user_id::text, p_user_id,
    jsonb_build_object('sub', p_user_id::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now()
  ) on conflict do nothing;

  insert into public.profiles (id, clinic_id, full_name, role)
  values (p_user_id, p_clinic_id, p_full_name, p_role) on conflict (id) do nothing;
end $fn$;

create or replace function pg_temp.seed_invite(
  p_clinic_id uuid, p_invited_by uuid, p_email text, p_role text
) returns void language plpgsql set search_path = public, pg_catalog as $fn$
begin
  insert into public.clinic_invites (clinic_id, invited_by, email, role, status)
  select p_clinic_id, p_invited_by, p_email, p_role, 'accepted'
  where not exists (
    select 1 from public.clinic_invites where clinic_id = p_clinic_id and email = p_email
  );
end $fn$;

-- 1. Metro Audiology Group — pro / active
insert into public.clinics (id, name, slug, subscription_plan, subscription_status, photo_module_enabled, max_photo_count, max_photo_size_bytes)
values ('c0000000-0000-4000-8000-000000000001','Metro Audiology Group','metro-audiology-group','pro','active',true,4,500000)
on conflict (id) do nothing;
insert into public.locations (id, clinic_id, name, address, active)
values ('10000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Metro Audiology — Downtown','120 Bloor St W, Toronto, ON',true)
on conflict (id) do nothing;
select pg_temp.seed_member('a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','test.clinic1.admin@oviz-testing.ca','V2AWv+@ueWE7xfWx','Dr. Sarah Whitfield','owner');
select pg_temp.seed_member('50000001-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','test.clinic1.staff1@oviz-testing.ca','9aC36hn=8+?&U!Md','Olivia Brennan, Au.D.','staff');
select pg_temp.seed_member('50000002-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','test.clinic1.staff2@oviz-testing.ca','mD3jsmU&_ksTXvik','Marcus Lefebvre, HIS','staff');
select pg_temp.seed_member('50000003-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','test.clinic1.staff3@oviz-testing.ca','!t$p@24mSySaKsqD','Hannah Ross','admin');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','test.clinic1.staff1@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','test.clinic1.staff2@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','test.clinic1.staff3@oviz-testing.ca','admin');

-- 2. Lakeside Hearing Centre — starter / active
insert into public.clinics (id, name, slug, subscription_plan, subscription_status, photo_module_enabled, max_photo_count, max_photo_size_bytes)
values ('c0000000-0000-4000-8000-000000000002','Lakeside Hearing Centre','lakeside-hearing-centre','starter','active',false,0,500000)
on conflict (id) do nothing;
insert into public.locations (id, clinic_id, name, address, active)
values ('10000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','Lakeside Hearing — Kelowna','455 Lakeshore Rd, Kelowna, BC',true)
on conflict (id) do nothing;
select pg_temp.seed_member('a0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','test.clinic2.admin@oviz-testing.ca','5qfE8SDMJqNzY*$J','Dr. Michael Tran','owner');
select pg_temp.seed_member('50000001-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','test.clinic2.staff1@oviz-testing.ca','_G3=qCxPX3S6HwHf','Daniel Mercer, Au.D.','staff');
select pg_temp.seed_member('50000002-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','test.clinic2.staff2@oviz-testing.ca','FQPHL-7L&h-NeCi6','Sofia Castellano, HIS','staff');
select pg_temp.seed_member('50000003-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','test.clinic2.staff3@oviz-testing.ca','_2JJP@mA#rF6T8Uf','Grace Lindqvist','admin');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','test.clinic2.staff1@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','test.clinic2.staff2@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','test.clinic2.staff3@oviz-testing.ca','admin');

-- 3. Northern Sound Hearing Clinic — pro / trialing
insert into public.clinics (id, name, slug, subscription_plan, subscription_status, photo_module_enabled, max_photo_count, max_photo_size_bytes)
values ('c0000000-0000-4000-8000-000000000003','Northern Sound Hearing Clinic','northern-sound-hearing-clinic','pro','trialing',true,4,500000)
on conflict (id) do nothing;
insert into public.locations (id, clinic_id, name, address, active)
values ('10000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000003','Northern Sound — Sudbury','88 Elm St, Sudbury, ON',true)
on conflict (id) do nothing;
select pg_temp.seed_member('a0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000003','test.clinic3.admin@oviz-testing.ca','6Yj#z?UwpTW%5Hx7','Dr. Priya Nair','owner');
select pg_temp.seed_member('50000001-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000003','test.clinic3.staff1@oviz-testing.ca','m5$!k*uzuMe3&qSr','Ethan Beaulieu, Au.D.','staff');
select pg_temp.seed_member('50000002-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000003','test.clinic3.staff2@oviz-testing.ca','Cg5cD$7*9_s^GugH','Amara Singh, HIS','staff');
select pg_temp.seed_member('50000003-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000003','test.clinic3.staff3@oviz-testing.ca','nAsJ6-XJ!$=$L9M7','Connor Maguire','admin');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000003','test.clinic3.staff1@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000003','test.clinic3.staff2@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000003','test.clinic3.staff3@oviz-testing.ca','admin');

-- 4. Bayview Audiology & Hearing Aids — enterprise / active
insert into public.clinics (id, name, slug, subscription_plan, subscription_status, photo_module_enabled, max_photo_count, max_photo_size_bytes)
values ('c0000000-0000-4000-8000-000000000004','Bayview Audiology & Hearing Aids','bayview-audiology-hearing-aids','enterprise','active',true,4,500000)
on conflict (id) do nothing;
insert into public.locations (id, clinic_id, name, address, active)
values ('10000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000004','Bayview Audiology — Vancouver','2200 W Broadway, Vancouver, BC',true)
on conflict (id) do nothing;
select pg_temp.seed_member('a0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000004','test.clinic4.admin@oviz-testing.ca','Hc_WLEyEeD4d?^#!','Dr. James Holloway','owner');
select pg_temp.seed_member('50000001-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000004','test.clinic4.staff1@oviz-testing.ca','WzjBnqi-_Ytu$wX3','Naomi Fischer, Au.D.','staff');
select pg_temp.seed_member('50000002-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000004','test.clinic4.staff2@oviz-testing.ca','cYtLmC$2pT*^LjJL','Liam O''Donnell, HIS','staff');
select pg_temp.seed_member('50000003-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000004','test.clinic4.staff3@oviz-testing.ca','t7zjixD#R5xq$&Ut','Priscilla Adeyemi','admin');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000004','test.clinic4.staff1@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000004','test.clinic4.staff2@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000004','test.clinic4.staff3@oviz-testing.ca','admin');

-- 5. Prairie Hearing Health — starter / trialing
insert into public.clinics (id, name, slug, subscription_plan, subscription_status, photo_module_enabled, max_photo_count, max_photo_size_bytes)
values ('c0000000-0000-4000-8000-000000000005','Prairie Hearing Health','prairie-hearing-health','starter','trialing',false,0,500000)
on conflict (id) do nothing;
insert into public.locations (id, clinic_id, name, address, active)
values ('10000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000005','Prairie Hearing — Winnipeg','330 Portage Ave, Winnipeg, MB',true)
on conflict (id) do nothing;
select pg_temp.seed_member('a0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000005','test.clinic5.admin@oviz-testing.ca','SD3#WYBe2Hk?v9wH','Dr. Emily Carter','owner');
select pg_temp.seed_member('50000001-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000005','test.clinic5.staff1@oviz-testing.ca','_PX5m*A_+5fzb=4*','Jacob Reinhardt, Au.D.','staff');
select pg_temp.seed_member('50000002-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000005','test.clinic5.staff2@oviz-testing.ca','2wj^fG*-rhF?9iW+','Mei Lin Chow, HIS','staff');
select pg_temp.seed_member('50000003-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000005','test.clinic5.staff3@oviz-testing.ca','V@ac3LCwDyd_b7RJ','Tanya Boudreau','admin');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000005','test.clinic5.staff1@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000005','test.clinic5.staff2@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000005','test.clinic5.staff3@oviz-testing.ca','admin');

-- 6. Maritime Hearing Centre — pro / active
insert into public.clinics (id, name, slug, subscription_plan, subscription_status, photo_module_enabled, max_photo_count, max_photo_size_bytes)
values ('c0000000-0000-4000-8000-000000000006','Maritime Hearing Centre','maritime-hearing-centre','pro','active',true,4,500000)
on conflict (id) do nothing;
insert into public.locations (id, clinic_id, name, address, active)
values ('10000000-0000-4000-8000-000000000006','c0000000-0000-4000-8000-000000000006','Maritime Hearing — Halifax','1505 Barrington St, Halifax, NS',true)
on conflict (id) do nothing;
select pg_temp.seed_member('a0000000-0000-4000-8000-000000000006','c0000000-0000-4000-8000-000000000006','test.clinic6.admin@oviz-testing.ca','3p7GUZC2T$xf-H=R','Dr. David Okafor','owner');
select pg_temp.seed_member('50000001-0000-4000-8000-000000000006','c0000000-0000-4000-8000-000000000006','test.clinic6.staff1@oviz-testing.ca','Tut3ftUAe^3*pi@-','Aisling Murphy, Au.D.','staff');
select pg_temp.seed_member('50000002-0000-4000-8000-000000000006','c0000000-0000-4000-8000-000000000006','test.clinic6.staff2@oviz-testing.ca','T6GAWgvs?-YdFe?%','Victor Almeida, HIS','staff');
select pg_temp.seed_member('50000003-0000-4000-8000-000000000006','c0000000-0000-4000-8000-000000000006','test.clinic6.staff3@oviz-testing.ca','$5uka=@8$6^LZMAZ','Brianna Cormier','admin');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000006','test.clinic6.staff1@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000006','test.clinic6.staff2@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000006','test.clinic6.staff3@oviz-testing.ca','admin');

-- 7. Summit Audiology Associates — enterprise / active
insert into public.clinics (id, name, slug, subscription_plan, subscription_status, photo_module_enabled, max_photo_count, max_photo_size_bytes)
values ('c0000000-0000-4000-8000-000000000007','Summit Audiology Associates','summit-audiology-associates','enterprise','active',true,4,500000)
on conflict (id) do nothing;
insert into public.locations (id, clinic_id, name, address, active)
values ('10000000-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000007','Summit Audiology — Calgary','640 8 Ave SW, Calgary, AB',true)
on conflict (id) do nothing;
select pg_temp.seed_member('a0000000-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000007','test.clinic7.admin@oviz-testing.ca','hE@cUh?9MyvQ9Z^W','Dr. Laura Bennett','owner');
select pg_temp.seed_member('50000001-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000007','test.clinic7.staff1@oviz-testing.ca','?YRKPDdFQq%gMK6P','Henry Wallace, Au.D.','staff');
select pg_temp.seed_member('50000002-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000007','test.clinic7.staff2@oviz-testing.ca','WfMBtbHM4GU394X^','Fatima Haddad, HIS','staff');
select pg_temp.seed_member('50000003-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000007','test.clinic7.staff3@oviz-testing.ca','cm&e4WK#tL%MawvL','Devon Clarke','admin');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007','test.clinic7.staff1@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007','test.clinic7.staff2@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007','test.clinic7.staff3@oviz-testing.ca','admin');

-- 8. Riverside Hearing & Balance — starter / active
insert into public.clinics (id, name, slug, subscription_plan, subscription_status, photo_module_enabled, max_photo_count, max_photo_size_bytes)
values ('c0000000-0000-4000-8000-000000000008','Riverside Hearing & Balance','riverside-hearing-balance','starter','active',false,0,500000)
on conflict (id) do nothing;
insert into public.locations (id, clinic_id, name, address, active)
values ('10000000-0000-4000-8000-000000000008','c0000000-0000-4000-8000-000000000008','Riverside Hearing — Ottawa','275 Bank St, Ottawa, ON',true)
on conflict (id) do nothing;
select pg_temp.seed_member('a0000000-0000-4000-8000-000000000008','c0000000-0000-4000-8000-000000000008','test.clinic8.admin@oviz-testing.ca','2TdRutiH2NamF@VL','Dr. Rachel Kim','owner');
select pg_temp.seed_member('50000001-0000-4000-8000-000000000008','c0000000-0000-4000-8000-000000000008','test.clinic8.staff1@oviz-testing.ca','EMd@=H@siSNBa6ht','Claire Dubois, Au.D.','staff');
select pg_temp.seed_member('50000002-0000-4000-8000-000000000008','c0000000-0000-4000-8000-000000000008','test.clinic8.staff2@oviz-testing.ca','H=p5gWcnTu6p-Zz2','Raj Patel, HIS','staff');
select pg_temp.seed_member('50000003-0000-4000-8000-000000000008','c0000000-0000-4000-8000-000000000008','test.clinic8.staff3@oviz-testing.ca','st_*#8sKx*mP8BWM','Megan Fitzpatrick','admin');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000008','test.clinic8.staff1@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000008','test.clinic8.staff2@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000008','test.clinic8.staff3@oviz-testing.ca','admin');

-- 9. Cascade Hearing Solutions — pro / trialing
insert into public.clinics (id, name, slug, subscription_plan, subscription_status, photo_module_enabled, max_photo_count, max_photo_size_bytes)
values ('c0000000-0000-4000-8000-000000000009','Cascade Hearing Solutions','cascade-hearing-solutions','pro','trialing',true,4,500000)
on conflict (id) do nothing;
insert into public.locations (id, clinic_id, name, address, active)
values ('10000000-0000-4000-8000-000000000009','c0000000-0000-4000-8000-000000000009','Cascade Hearing — Victoria','1012 Douglas St, Victoria, BC',true)
on conflict (id) do nothing;
select pg_temp.seed_member('a0000000-0000-4000-8000-000000000009','c0000000-0000-4000-8000-000000000009','test.clinic9.admin@oviz-testing.ca','X_L6X2hzFN+fy+Fu','Dr. Daniel Foster','owner');
select pg_temp.seed_member('50000001-0000-4000-8000-000000000009','c0000000-0000-4000-8000-000000000009','test.clinic9.staff1@oviz-testing.ca','-?9R-8rZLyWFk=Ux','Owen Nakamura, Au.D.','staff');
select pg_temp.seed_member('50000002-0000-4000-8000-000000000009','c0000000-0000-4000-8000-000000000009','test.clinic9.staff2@oviz-testing.ca','z_^KU7pTq&yZ#udW','Isabelle Moreau, HIS','staff');
select pg_temp.seed_member('50000003-0000-4000-8000-000000000009','c0000000-0000-4000-8000-000000000009','test.clinic9.staff3@oviz-testing.ca','k_QhT9t8CihQXtt*','Trevor Andersson','admin');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000009','a0000000-0000-4000-8000-000000000009','test.clinic9.staff1@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000009','a0000000-0000-4000-8000-000000000009','test.clinic9.staff2@oviz-testing.ca','staff');
select pg_temp.seed_invite('c0000000-0000-4000-8000-000000000009','a0000000-0000-4000-8000-000000000009','test.clinic9.staff3@oviz-testing.ca','admin');


do $report$
declare v_users int; v_invites int;
begin
  select count(*) into v_users   from auth.users where email ~* '@oviz-testing\.ca$';
  select count(*) into v_invites from public.clinic_invites where email ~* '@oviz-testing\.ca$';
  raise notice 'OViz local test seed complete: % users, % staff invites.', v_users, v_invites;
end
$report$;
