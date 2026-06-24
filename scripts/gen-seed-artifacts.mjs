#!/usr/bin/env node
/**
 * Single source of truth -> derived seed artifacts.
 *
 *   tests/fixtures/mock-tenants.json   (edit this)
 *        |
 *        +--> supabase/seed.sql                 (LOCAL dev seed; `supabase db reset`)
 *        +--> tests/fixtures/mock-tenants.csv   (distributable credential sheet)
 *        +--> tests/fixtures/mock-tenants.md    (distributable credential sheet)
 *
 * Run:  node scripts/gen-seed-artifacts.mjs
 *
 * NOTE: production UAT users are NOT created from seed.sql — that path is
 * scripts/seed-uat-tenants.mjs (Supabase Admin API). seed.sql is local only and
 * carries a guard that refuses to run against a DB containing real users.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(
  fs.readFileSync(path.join(root, "tests/fixtures/mock-tenants.json"), "utf8"),
);

const sql = (s) => String(s).replace(/'/g, "''"); // escape SQL single quotes
const members = (c) => [{ ...c.owner, title: "Owner / Lead Audiologist" }, ...c.staff];

// ---------------------------------------------------------------- seed.sql ---
function buildSeedSql() {
  const head = `-- =============================================================================
-- OViz — LOCAL E2E test seed: 9 mock clinic tenants × (1 owner + 3 invited staff)
-- GENERATED from tests/fixtures/mock-tenants.json by scripts/gen-seed-artifacts.mjs.
-- Do not edit by hand — edit the JSON and re-run the generator.
-- =============================================================================
-- LOCAL / TEST DATABASES ONLY. Wired into supabase/config.toml ([db.seed]); runs
-- on \`supabase db reset\` against the local stack. NOT part of \`supabase db push\`,
-- so it never reaches staging/production. The guard below aborts if any non-test
-- user exists, so it cannot create known-password accounts on a real database.
-- (Production UAT seeding uses scripts/seed-uat-tenants.mjs instead.)
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

do $guard$
begin
  if exists (
    select 1 from auth.users
    where coalesce(email, '') !~* '@oviz-(testing\\.ca|e2e\\.test)$'
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
`;

  const blocks = data.clinics.map((c) => {
    const o = c.owner;
    const lines = [];
    lines.push(`\n-- ${c.n}. ${c.name} — ${c.subscriptionPlan} / ${c.subscriptionStatus}`);
    lines.push(
      `insert into public.clinics (id, name, slug, subscription_plan, subscription_status, photo_module_enabled, max_photo_count, max_photo_size_bytes)\n` +
        `values ('${c.id}','${sql(c.name)}','${c.slug}','${c.subscriptionPlan}','${c.subscriptionStatus}',${c.photoModuleEnabled},${c.photoModuleEnabled ? 4 : 0},500000)\n` +
        `on conflict (id) do nothing;`,
    );
    lines.push(
      `insert into public.locations (id, clinic_id, name, address, active)\n` +
        `values ('${c.location.id}','${c.id}','${sql(c.location.name)}','${sql(c.location.address)}',true)\n` +
        `on conflict (id) do nothing;`,
    );
    for (const m of members(c)) {
      lines.push(
        `select pg_temp.seed_member('${m.userId}','${c.id}','${m.email}','${sql(m.password)}','${sql(m.fullName)}','${m.role}');`,
      );
    }
    for (const s of c.staff) {
      lines.push(`select pg_temp.seed_invite('${c.id}','${o.userId}','${s.email}','${s.role}');`);
    }
    return lines.join("\n");
  });

  const tail = `\n
do $report$
declare v_users int; v_invites int;
begin
  select count(*) into v_users   from auth.users where email ~* '@oviz-testing\\.ca$';
  select count(*) into v_invites from public.clinic_invites where email ~* '@oviz-testing\\.ca$';
  raise notice 'OViz local test seed complete: % users, % staff invites.', v_users, v_invites;
end
$report$;
`;
  return head + blocks.join("\n") + "\n" + tail;
}

// --------------------------------------------------------------------- CSV ---
function buildCsv() {
  const cols = ["clinic_no", "clinic_name", "plan", "status", "account_type", "role", "full_name", "title", "email", "password"];
  const esc = (v) => {
    v = String(v);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const rows = [];
  for (const c of data.clinics) {
    for (const m of members(c)) {
      rows.push({
        clinic_no: c.n,
        clinic_name: c.name,
        plan: c.subscriptionPlan,
        status: c.subscriptionStatus,
        account_type: m.role === "owner" ? "Primary (Owner)" : m.role === "admin" ? "Staff (Manager)" : "Staff (Clinician)",
        role: m.role,
        full_name: m.fullName,
        title: m.title || "",
        email: m.email,
        password: m.password,
      });
    }
  }
  return [cols.join(","), ...rows.map((r) => cols.map((k) => esc(r[k])).join(","))].join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------- MD ---
function buildMd() {
  let md = `# OViz — UAT Test Tenants (credentials)\n\n`;
  md += `> ${data["$comment"]}\n\n`;
  md += `Domain \`@${data.domain}\`. **Distribute securely — these are plaintext passwords.**\n\n`;
  md += `## Primary clinic admins\n\n| # | Clinic | Plan / Status | Admin Email | Password |\n|---|---|---|---|---|\n`;
  for (const c of data.clinics) {
    md += `| ${c.n} | ${c.name} | ${c.subscriptionPlan} / ${c.subscriptionStatus} | \`${c.owner.email}\` | \`${c.owner.password}\` |\n`;
  }
  md += `\n## All users (36)\n\n| Clinic | Account | Role | Name | Title | Email | Password |\n|---|---|---|---|---|---|---|\n`;
  for (const c of data.clinics) {
    for (const m of members(c)) {
      const type = m.role === "owner" ? "Primary (Owner)" : m.role === "admin" ? "Staff (Manager)" : "Staff (Clinician)";
      md += `| ${c.name} | ${type} | ${m.role} | ${m.fullName} | ${m.title || ""} | \`${m.email}\` | \`${m.password}\` |\n`;
    }
  }
  return md;
}

fs.writeFileSync(path.join(root, "supabase/seed.sql"), buildSeedSql());
fs.writeFileSync(path.join(root, "tests/fixtures/mock-tenants.csv"), buildCsv());
fs.writeFileSync(path.join(root, "tests/fixtures/mock-tenants.md"), buildMd());

const total = data.clinics.reduce((a, c) => a + 1 + c.staff.length, 0);
console.log(`Generated from mock-tenants.json: ${data.clinics.length} clinics, ${total} users`);
console.log("  -> supabase/seed.sql");
console.log("  -> tests/fixtures/mock-tenants.csv");
console.log("  -> tests/fixtures/mock-tenants.md");
