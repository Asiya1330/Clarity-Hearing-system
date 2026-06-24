#!/usr/bin/env node
/**
 * Seed the 9 UAT clinic tenants (+ 3 staff each = 36 users) into a LIVE Supabase
 * project via the Admin API. Intended for PRE-LAUNCH UAT on a project that holds
 * NO real patient data. Mirrors the provisioning the app does itself
 * (app/api/onboarding/route.ts) and the existing E2E harness
 * (tests/setup/global-setup.ts).
 *
 * Source of truth: tests/fixtures/mock-tenants.json
 *
 * Usage:
 *   node scripts/seed-uat-tenants.mjs                 # DRY RUN (default) — prints plan, writes nothing
 *   node scripts/seed-uat-tenants.mjs --apply         # actually create/update
 *   node scripts/seed-uat-tenants.mjs --env=.env.local.prod.bak --apply
 *
 * Requires (read from the --env file, then process.env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY        (server-only; never commit)
 *
 * Safety:
 *   - Dry run unless --apply is passed.
 *   - Prints the exact target URL before doing anything.
 *   - Idempotent: existing users/clinics are reused (passwords re-synced).
 *   - Every account uses @oviz-testing.ca so teardown can target them precisely
 *     (scripts/teardown-uat-tenants.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const envArg = args.find((a) => a.startsWith("--env="));
const ENV_FILE = envArg ? envArg.slice("--env=".length) : ".env.local.prod.bak";

// --- tiny .env parser (no dependency) ---------------------------------------
function loadEnv(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[line.slice(0, i).trim()] = v;
  }
  return out;
}

const fileEnv = loadEnv(ENV_FILE);
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error(`Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (looked in env + ${ENV_FILE}).`);
  process.exit(1);
}

const ref = (URL.match(/https?:\/\/([^.]+)\./) || [])[1] || URL;
console.log("──────────────────────────────────────────────");
console.log(" OViz UAT tenant seeder");
console.log("  Target URL : " + URL);
console.log("  Project ref: " + ref);
console.log("  Env file   : " + ENV_FILE);
console.log("  Mode       : " + (APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"));
console.log("──────────────────────────────────────────────");

const data = JSON.parse(fs.readFileSync(path.join(root, "tests/fixtures/mock-tenants.json"), "utf8"));
const admin = createClient(URL, KEY, { auth: { persistSession: false } });

// --- existing users by email (paginated) ------------------------------------
async function loadExistingUsers() {
  const map = new Map();
  for (let page = 1; ; page++) {
    const { data: res, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("listUsers failed: " + error.message);
    for (const u of res.users) if (u.email) map.set(u.email.toLowerCase(), u.id);
    if (res.users.length < 1000) break;
  }
  return map;
}

const result = { created: [], existing: [], clinics: [], emailToId: {} };

async function ensureClinic(c) {
  const { data: byId } = await admin.from("clinics").select("id").eq("id", c.id).maybeSingle();
  if (byId) return byId.id;
  const { data: bySlug } = await admin.from("clinics").select("id").eq("slug", c.slug).maybeSingle();
  if (bySlug) return bySlug.id;
  if (!APPLY) return c.id; // pretend
  const { data: ins, error } = await admin
    .from("clinics")
    .insert({
      id: c.id,
      name: c.name,
      slug: c.slug,
      subscription_plan: c.subscriptionPlan,
      subscription_status: c.subscriptionStatus,
      photo_module_enabled: c.photoModuleEnabled,
      max_photo_count: c.photoModuleEnabled ? 4 : 0,
      max_photo_size_bytes: 500000,
    })
    .select("id")
    .single();
  if (error) throw new Error(`clinic ${c.slug} insert failed: ${error.message}`);
  return ins.id;
}

async function ensureLocation(clinicId, loc) {
  const { data: existing } = await admin
    .from("locations")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("name", loc.name)
    .maybeSingle();
  if (existing || !APPLY) return;
  const { error } = await admin.from("locations").insert({ clinic_id: clinicId, name: loc.name, address: loc.address, active: true });
  if (error) throw new Error(`location ${loc.name} insert failed: ${error.message}`);
}

async function ensureUser(existing, m, clinicId) {
  const key = m.email.toLowerCase();
  let id = existing.get(key);
  if (id) {
    result.existing.push(m.email);
    if (APPLY) await admin.auth.admin.updateUserById(id, { password: m.password, email_confirm: true });
  } else {
    result.created.push(m.email);
    if (APPLY) {
      const { data, error } = await admin.auth.admin.createUser({
        email: m.email,
        password: m.password,
        email_confirm: true,
        user_metadata: { full_name: m.fullName },
      });
      if (error) throw new Error(`createUser ${m.email} failed: ${error.message}`);
      id = data.user.id;
      existing.set(key, id);
    } else {
      id = "(new)";
    }
  }
  result.emailToId[m.email] = id;
  if (APPLY && id && id !== "(new)") {
    const { error } = await admin.from("profiles").upsert({ id, clinic_id: clinicId, full_name: m.fullName, role: m.role });
    if (error) throw new Error(`profile ${m.email} upsert failed: ${error.message}`);
  }
  return id;
}

async function ensureInvite(clinicId, ownerId, s) {
  const { data: existing } = await admin
    .from("clinic_invites")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("email", s.email)
    .maybeSingle();
  if (existing || !APPLY) return;
  const { error } = await admin
    .from("clinic_invites")
    .insert({ clinic_id: clinicId, invited_by: ownerId, email: s.email, role: s.role, status: "accepted" });
  if (error) throw new Error(`invite ${s.email} insert failed: ${error.message}`);
}

async function main() {
  const existing = await loadExistingUsers();
  for (const c of data.clinics) {
    const clinicId = await ensureClinic(c);
    await ensureLocation(clinicId, c.location);
    const ownerId = await ensureUser(existing, { ...c.owner }, clinicId);
    for (const s of c.staff) await ensureUser(existing, s, clinicId);
    for (const s of c.staff) await ensureInvite(clinicId, ownerId, s);
    result.clinics.push({ name: c.name, id: clinicId });
    console.log(`  • ${c.name}: owner + ${c.staff.length} staff ${APPLY ? "ok" : "planned"}`);
  }

  console.log("──────────────────────────────────────────────");
  console.log(`  users to create : ${result.created.length}`);
  console.log(`  users existing  : ${result.existing.length}`);
  console.log(`  clinics         : ${result.clinics.length}`);

  if (APPLY) {
    const outPath = path.join(root, "scripts/.uat-seed-output.json");
    fs.writeFileSync(outPath, JSON.stringify({ url: URL, ...result }, null, 2) + "\n");
    console.log(`  wrote ${path.relative(root, outPath)}`);
    console.log("  DONE — accounts are live on the target project.");
  } else {
    console.log("  DRY RUN complete — nothing written. Re-run with --apply to create.");
  }
}

main().catch((e) => {
  console.error("\nSEED FAILED:", e.message);
  process.exit(1);
});
