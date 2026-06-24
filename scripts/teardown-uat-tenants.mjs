#!/usr/bin/env node
/**
 * Remove the UAT clinic tenants + users created by scripts/seed-uat-tenants.mjs.
 * Run this BEFORE go-live so no known-password test accounts remain on the
 * project. Deleting an auth user cascades its profile; deleting a clinic
 * cascades its locations, consults, invites, etc.
 *
 * Usage:
 *   node scripts/teardown-uat-tenants.mjs                 # DRY RUN (default)
 *   node scripts/teardown-uat-tenants.mjs --apply         # actually delete
 *   node scripts/teardown-uat-tenants.mjs --env=.env.local.prod.bak --apply
 *
 * Safety: only touches accounts whose email is in tests/fixtures/mock-tenants.json
 * (all @oviz-testing.ca) and clinics matching the listed slugs/ids.
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

const data = JSON.parse(fs.readFileSync(path.join(root, "tests/fixtures/mock-tenants.json"), "utf8"));
const emails = new Set(data.clinics.flatMap((c) => [c.owner.email, ...c.staff.map((s) => s.email)].map((e) => e.toLowerCase())));
const clinicIds = data.clinics.map((c) => c.id);
const clinicSlugs = data.clinics.map((c) => c.slug);

const ref = (URL.match(/https?:\/\/([^.]+)\./) || [])[1] || URL;
console.log("──────────────────────────────────────────────");
console.log(" OViz UAT tenant TEARDOWN");
console.log("  Target URL : " + URL);
console.log("  Project ref: " + ref);
console.log("  Mode       : " + (APPLY ? "APPLY (deleting)" : "DRY RUN (no deletes)"));
console.log("──────────────────────────────────────────────");

const admin = createClient(URL, KEY, { auth: { persistSession: false } });

async function main() {
  let deletedUsers = 0;
  for (let page = 1; ; page++) {
    const { data: res, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("listUsers failed: " + error.message);
    for (const u of res.users) {
      if (u.email && emails.has(u.email.toLowerCase())) {
        console.log(`  - user ${u.email} ${APPLY ? "deleting" : "would delete"}`);
        if (APPLY) {
          const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
          if (delErr) console.error(`    ! failed: ${delErr.message}`);
          else deletedUsers++;
        } else deletedUsers++;
      }
    }
    if (res.users.length < 1000) break;
  }

  let deletedClinics = 0;
  if (APPLY) {
    const { data: del, error } = await admin.from("clinics").delete().in("id", clinicIds).select("id");
    if (error) throw new Error("clinic delete (by id) failed: " + error.message);
    deletedClinics += del?.length ?? 0;
    const { data: del2 } = await admin.from("clinics").delete().in("slug", clinicSlugs).select("id");
    deletedClinics += del2?.length ?? 0;
  } else {
    const { data: found } = await admin.from("clinics").select("id").or(`id.in.(${clinicIds.join(",")}),slug.in.(${clinicSlugs.join(",")})`);
    deletedClinics = found?.length ?? 0;
  }

  console.log("──────────────────────────────────────────────");
  console.log(`  users ${APPLY ? "deleted" : "to delete"}   : ${deletedUsers}`);
  console.log(`  clinics ${APPLY ? "deleted" : "to delete"} : ${deletedClinics}`);
  console.log(APPLY ? "  DONE." : "  DRY RUN complete — nothing deleted. Re-run with --apply.");
}

main().catch((e) => {
  console.error("\nTEARDOWN FAILED:", e.message);
  process.exit(1);
});
