/**
 * Test 1: User can log in
 */
import { test, expect } from "@playwright/test";

// Auth tests run without pre-loaded storageState — log in fresh.
test.use({ storageState: { cookies: [], origins: [] } });

test("user can log in with valid credentials", async ({ page }) => {
  await page.goto("/auth/login");

  // Formal lockup (test 14 coverage on login page)
  await expect(page.getByAltText("OViz by OtoVantage")).toBeVisible();
  await expect(
    page.getByText("Enter your email below to access OViz by OtoVantage."),
  ).toBeVisible();

  await page.getByTestId("login-email").fill(
    process.env.E2E_PRO_EMAIL ?? "e2e-pro@oviz-e2e.test",
  );
  await page.getByTestId("login-password").fill(
    process.env.E2E_PASSWORD ?? "E2eTestPassword123!",
  );
  await page.getByTestId("login-button").click();

  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page).toHaveURL(/dashboard/);
});
