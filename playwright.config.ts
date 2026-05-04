import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import path from "path";

// Load .env.local so NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.
// are available in globalSetup/globalTeardown which run outside Next.js.
loadEnv({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
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
      testIgnore: "**/photos-starter.spec.ts",
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
  ],

  globalSetup: "./tests/setup/global-setup.ts",
  globalTeardown: "./tests/setup/global-teardown.ts",

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
