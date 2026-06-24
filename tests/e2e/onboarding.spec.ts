import { test, expect } from "@playwright/test";
import {
  generateClinicProfile,
  cleanupTenant,
  type ClinicProfile,
} from "./helpers/auth";

/**
 * Multi-tenant clinic onboarding — end-to-end.
 *
 * Registers a brand-new clinic entirely through the UI (sign-up → onboarding
 * wizard → dashboard) and asserts the resulting workspace is bound to the new
 * tenant (no data bleed). Runs LOGGED-OUT (no storageState) across Chromium,
 * Firefox, and WebKit via the dedicated `onboarding-*` projects.
 *
 * Requires the local stack: `supabase start` + the dev server on :3000.
 */
test.describe("multi-tenant clinic onboarding", () => {
  const tenant: ClinicProfile = generateClinicProfile("flow");

  test.afterAll(async () => {
    // Remove the tenant this run created so the local DB stays clean.
    await cleanupTenant({ email: tenant.email, clinicName: tenant.clinicName });
  });

  test("new clinic registers, completes onboarding, and lands on its own dashboard", async ({
    page,
  }) => {
    // --- Step 1 & 2: registration form ------------------------------------
    await page.goto("/auth/sign-up");
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeVisible();

    await page.locator("#email").fill(tenant.email);
    await page.locator("#password").fill(tenant.password);
    await page.locator("#repeat-password").fill(tenant.password);
    await page.getByRole("button", { name: "Create account" }).click();

    // Email confirmation is disabled locally, so sign-up yields a session
    // immediately and the client routes straight to onboarding.
    await page.waitForURL("**/onboarding", { timeout: 30_000 });

    // --- Step 3: onboarding wizard ----------------------------------------
    await page.locator("#clinic-name").fill(tenant.clinicName);
    await page.locator("#location-name").fill(tenant.locationName);
    await page.locator("#full-name").fill(tenant.fullName);

    // Exercise tier selection (Pro enables the photo module). The accessible
    // name of each tier button starts with its label, so /^Pro/ is unambiguous.
    const proTier = page.getByRole("button", { name: /^Pro/ });
    await proTier.click();
    await expect(proTier).toHaveAttribute("aria-pressed", "true");

    await page
      .getByRole("button", { name: "Create clinic and continue" })
      .click();

    // --- Step 4: dashboard redirect ---------------------------------------
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard$/);

    // --- Step 5: tenant-isolation assertion -------------------------------
    // The dashboard header renders THIS tenant's clinic name. Because the name
    // is unique per run, seeing it proves the session is bound to the freshly
    // created workspace — not leaking another tenant's context.
    await expect(
      page.getByText(tenant.clinicName, { exact: true }),
    ).toBeVisible();

    // The Pro tier selected above is reflected in the plan badge, confirming
    // the new clinic's own entitlements were applied.
    await expect(page.getByText("pro", { exact: true })).toBeVisible();
  });
});
