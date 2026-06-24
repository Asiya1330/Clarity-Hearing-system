import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import path from "path";

// Load .env.local so NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.
// are available in globalSetup/globalTeardown which run outside Next.js.
loadEnv({ path: path.resolve(__dirname, ".env.local") });

// Ensure SUPABASE_SERVICE_ROLE_KEY is populated for tests (maps from Next env var names).
// NOTE: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is intentionally excluded here — that variable
// name is a footgun (the NEXT_PUBLIC_ prefix makes it eligible for client-bundle inclusion).
// Use NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local.
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_SECRET_SUPABASE_API_KEY;
}

// Canonical local port is 3000: `npm run dev` (next dev) serves :3000 and
// supabase/config.toml sets site_url = http://127.0.0.1:3000. Override with
// PW_BASE_URL when targeting a different host/port.
const BASE_URL = process.env.PW_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // Capture video for failing tests so broken UI states are debuggable.
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "setup",
      testMatch: "**/setup/auth.setup.ts",
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/pro.json",
      },
      dependencies: ["setup"],
      // The existing authed specs run with a pre-seeded storageState; the e2e
      // onboarding flow starts logged-out, so it must NOT run under this project.
      testIgnore: ["**/photos-starter.spec.ts", "**/e2e/**"],
    },
    {
      name: "chromium-starter",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/starter.json",
      },
      dependencies: ["setup"],
      testMatch: "**/photos-starter.spec.ts",
    },

    // --- Logged-out, multi-browser onboarding flow -------------------------
    // No storageState (a fresh tenant registers from scratch) and no dependency
    // on the auth setup. Scoped strictly to the onboarding spec.
    {
      name: "onboarding-chromium",
      testMatch: "**/e2e/onboarding.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "onboarding-firefox",
      testMatch: "**/e2e/onboarding.spec.ts",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "onboarding-webkit",
      testMatch: "**/e2e/onboarding.spec.ts",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  globalSetup: "./tests/setup/global-setup.ts",
  globalTeardown: "./tests/setup/global-teardown.ts",

  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
