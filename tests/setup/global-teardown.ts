// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@supabase/supabase-js");
import fs from "fs";
import path from "path";

import type { E2EFixtures } from "./global-setup";
import { E2E_PRO_EMAIL, E2E_STARTER_EMAIL } from "./global-setup";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FIXTURES_PATH = path.join(__dirname, "../.auth/fixtures.json");

export default async function globalTeardown() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let fixtures: E2EFixtures | null = null;
  try {
    fixtures = JSON.parse(fs.readFileSync(FIXTURES_PATH, "utf-8")) as E2EFixtures;
  } catch {
    // Fixtures may not exist if setup failed — still try to clean by email.
  }

  for (const email of [E2E_PRO_EMAIL, E2E_STARTER_EMAIL]) {
    const { data } = await admin.auth.admin.listUsers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = data?.users.find((u: any) => u.email === email);
    if (existing) {
      await admin.auth.admin.deleteUser(existing.id);
    }
  }

  if (fixtures) {
    await admin
      .from("clinics")
      .delete()
      .in("id", [fixtures.proClinicId, fixtures.starterClinicId]);
  } else {
    await admin
      .from("clinics")
      .delete()
      .in("name", ["E2E Pro Clinic", "E2E Starter Clinic"]);
  }

  try {
    fs.unlinkSync(FIXTURES_PATH);
  } catch {
    // Best effort.
  }

  console.log("E2E global teardown complete.");
}
