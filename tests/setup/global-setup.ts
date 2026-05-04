// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@supabase/supabase-js");
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const E2E_PRO_EMAIL = "e2e-pro@oviz-e2e.test";
export const E2E_STARTER_EMAIL = "e2e-starter@oviz-e2e.test";
export const E2E_PASSWORD = "E2eTestPassword123!";

const FIXTURES_PATH = path.join(__dirname, "../.auth/fixtures.json");

export interface E2EFixtures {
  proUserId: string;
  proClinicId: string;
  proConsultId: string;
  starterUserId: string;
  starterClinicId: string;
}

export default async function globalSetup() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for E2E tests.",
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Clean up any leftover test data from a previous run.
  await cleanupExisting(admin);

  // --- Pro clinic ---
  const { data: proClinicData, error: proClinicError } = await admin
    .from("clinics")
    .insert({
      name: "E2E Pro Clinic",
      slug: "e2e-pro-clinic",
      subscription_plan: "pro",
      photo_module_enabled: true,
      subscription_status: "active",
    })
    .select("id")
    .single();
  if (proClinicError || !proClinicData) {
    throw new Error(`Failed to create pro clinic: ${proClinicError?.message}`);
  }
  const proClinicId = proClinicData.id as string;

  // --- Starter clinic ---
  const { data: starterClinicData, error: starterClinicError } = await admin
    .from("clinics")
    .insert({
      name: "E2E Starter Clinic",
      slug: "e2e-starter-clinic",
      photo_module_enabled: false,
      subscription_status: "active",
    })
    .select("id")
    .single();
  if (starterClinicError || !starterClinicData) {
    throw new Error(
      `Failed to create starter clinic: ${starterClinicError?.message}`,
    );
  }
  const starterClinicId = starterClinicData.id as string;

  // --- Pro user ---
  const { data: proAuthData, error: proAuthError } =
    await admin.auth.admin.createUser({
      email: E2E_PRO_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
  if (proAuthError || !proAuthData.user) {
    throw new Error(`Failed to create pro user: ${proAuthError?.message}`);
  }
  const proUserId = proAuthData.user.id;

  // --- Starter user ---
  const { data: starterAuthData, error: starterAuthError } =
    await admin.auth.admin.createUser({
      email: E2E_STARTER_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
  if (starterAuthError || !starterAuthData.user) {
    throw new Error(
      `Failed to create starter user: ${starterAuthError?.message}`,
    );
  }
  const starterUserId = starterAuthData.user.id;

  // --- Profiles ---
  // Insert minimal profile — only columns confirmed to exist by the app queries.
  // full_name / email may be populated by trigger or not writable via this path.
  // profiles.id = auth user id (FK to auth.users.id, no separate user_id column).
  const { error: proProfileError } = await admin.from("profiles").upsert({
    id: proUserId,
    clinic_id: proClinicId,
    role: "owner",
  });
  if (proProfileError) {
    throw new Error(`Failed to create pro profile: ${proProfileError.message}`);
  }

  const { error: starterProfileError } = await admin.from("profiles").upsert({
    id: starterUserId,
    clinic_id: starterClinicId,
    role: "owner",
  });
  if (starterProfileError) {
    throw new Error(
      `Failed to create starter profile: ${starterProfileError.message}`,
    );
  }

  // --- Test consult + model_run for pro user ---
  const { data: consultData, error: consultError } = await admin
    .from("consults")
    .insert({
      clinic_id: proClinicId,
      clinician_id: proUserId,
      status: "completed",
      photo_consent: false,
    })
    .select("id")
    .single();
  if (consultError || !consultData) {
    throw new Error(`Failed to create test consult: ${consultError?.message}`);
  }
  const proConsultId = consultData.id as string;

  const testInputs = {
    pta: 45,
    wrs: 72,
    durationYears: 5,
    fatigue: 6,
    avoidNoise: 4,
    repeats: 5,
    tvVolume: 6,
    conversation: 5,
    partnerRepeatsPerDay: 8,
    listeningSituations: [{ name: "Restaurants", difficulty: 7, importance: 8 }],
  };

  const testOutputs = {
    modelVersion: "1.0.0",
    brainBattery: {
      brainLoad: 62,
      untreatedDrain: 12,
      treatedDrain: 4,
    },
    wordUnderstanding: {
      current: 72,
      untreated5Year: 58,
      treated5Year: 70,
      label: "Moderate difficulty understanding speech in noise",
    },
    socialRadius: {
      currentRadius: 5.2,
      treatedRadius: 7.1,
      socialStrain: 48,
    },
    partnerImpact: {
      repeatsPerDay: 8,
      secondsPerRepeat: 10,
      annualPartnerHours: 8.1,
      partnerImpactSummary:
        "Based on today's inputs, the partner spends roughly 8 hours per year repeating themselves.",
    },
    listeningMap: {
      topGoals: [
        {
          name: "Restaurants",
          difficulty: 7,
          importance: 8,
          priorityScore: 7.4,
        },
      ],
    },
  };

  const { error: modelRunError } = await admin.from("model_runs").insert({
    consult_id: proConsultId,
    inputs: testInputs,
    outputs: testOutputs,
    model_version: "1.0.0",
  });
  if (modelRunError) {
    throw new Error(
      `Failed to create test model_run: ${modelRunError.message}`,
    );
  }

  // Save fixture IDs for tests and teardown.
  const fixtures: E2EFixtures = {
    proUserId,
    proClinicId,
    proConsultId,
    starterUserId,
    starterClinicId,
  };
  fs.mkdirSync(path.dirname(FIXTURES_PATH), { recursive: true });
  fs.writeFileSync(FIXTURES_PATH, JSON.stringify(fixtures, null, 2));

  console.log("E2E global setup complete.", fixtures);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cleanupExisting(admin: any): Promise<void> {
  // Remove users by email (cascades related data via DB triggers / manual cleanup).
  for (const email of [E2E_PRO_EMAIL, E2E_STARTER_EMAIL]) {
    const { data } = await admin.auth.admin.listUsers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = data?.users.find((u: any) => u.email === email);
    if (existing) {
      await admin.auth.admin.deleteUser(existing.id);
    }
  }
  // Remove clinics by name (profiles/consults are cascade-deleted or use FK).
  await admin
    .from("clinics")
    .delete()
    .in("name", ["E2E Pro Clinic", "E2E Starter Clinic"]);
}
