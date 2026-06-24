/**
 * E2E helpers for the multi-tenant onboarding flow.
 *
 *  - generateClinicProfile(): a fresh, unique tenant registration profile so
 *    repeated runs never collide on the DB's unique constraints (auth email,
 *    clinic slug). Uniqueness = timestamp + random suffix, so even the three
 *    browser projects running the same spec can never clash.
 *  - cleanupTenant(): best-effort service-role teardown of a tenant created
 *    through the UI, so onboarding runs don't accumulate orphan clinics/users
 *    in the local database.
 *
 * Recognisable markers (the @oviz-e2e.test email domain and the "E2E Onboarding"
 * clinic-name prefix) make any leftover rows trivial to spot and bulk-delete.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@supabase/supabase-js");
import { config as loadEnv } from "dotenv";
import path from "path";

// A test worker may not inherit the env that playwright.config.ts loaded in the
// runner process, so load .env.local defensively before reading the keys.
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  loadEnv({ path: path.resolve(__dirname, "../../../.env.local") });
}

export const E2E_ONBOARDING_EMAIL_DOMAIN = "oviz-e2e.test";
export const E2E_ONBOARDING_CLINIC_PREFIX = "E2E Onboarding";
// Meets the local Supabase minimum (6 chars) with mixed case + digit + symbol.
export const E2E_ONBOARDING_PASSWORD = "E2eOnboard!2024";

export interface ClinicProfile {
  email: string;
  password: string;
  clinicName: string;
  locationName: string;
  fullName: string;
}

/**
 * Build a unique tenant registration profile. Two runs (or two browser
 * projects) never produce the same email/clinic name.
 */
export function generateClinicProfile(label = "tenant"): ClinicProfile {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const id = `${stamp}-${rand}`;
  return {
    email: `test.clinic.${id}@${E2E_ONBOARDING_EMAIL_DOMAIN}`,
    password: E2E_ONBOARDING_PASSWORD,
    clinicName: `${E2E_ONBOARDING_CLINIC_PREFIX} ${label} ${id}`,
    locationName: `Main Office ${rand}`,
    fullName: `Dr. E2E ${rand}`,
  };
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Tenant cleanup needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (set in .env.local).",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Best-effort teardown of a tenant created through the onboarding UI: deletes
 * the auth user (by email), then the clinic and its locations (by name/id).
 * Never throws — a cleanup hiccup must not fail an otherwise-green test.
 */
export async function cleanupTenant(input: {
  email: string;
  clinicName: string;
}): Promise<void> {
  try {
    const admin = adminClient();

    // 1) Delete the auth user (cascades the profile row via FK).
    const { data: list } = await admin.auth.admin.listUsers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = list?.users?.find((u: any) => u.email === input.email);
    if (user) await admin.auth.admin.deleteUser(user.id);

    // 2) Delete the clinic + its locations explicitly (in case the FK is
    //    RESTRICT rather than CASCADE).
    const { data: clinic } = await admin
      .from("clinics")
      .select("id")
      .eq("name", input.clinicName)
      .maybeSingle();
    if (clinic?.id) {
      await admin.from("locations").delete().eq("clinic_id", clinic.id);
      await admin.from("clinics").delete().eq("id", clinic.id);
    }
  } catch (err) {
    console.warn("[cleanupTenant] best-effort cleanup failed:", err);
  }
}
