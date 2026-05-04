/**
 * Tests 13–16: Branding and product naming
 *
 * 13. Product name appears as "OViz" in app navigation
 * 14. Formal lockup "OViz by OtoVantage" appears on login and report
 * 15. Old product name "Hearing Impact Visualizer" does not appear in customer-facing UI
 * 16. Primary action buttons use the Precision Teal class/token
 */
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

import type { E2EFixtures } from "./setup/global-setup";

function getFixtures(): E2EFixtures {
  const p = path.join(__dirname, ".auth/fixtures.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as E2EFixtures;
}

test("product name 'OViz' appears in app navigation", async ({ page }) => {
  await page.goto("/dashboard");

  // The app layout renders the logo with alt="OViz" in the nav.
  await expect(page.getByAltText("OViz")).toBeVisible();
});

test("formal lockup 'OViz by OtoVantage' appears on the login page", async ({
  page,
}) => {
  // Visit login unauthenticated
  await page.goto("/auth/login");
  await expect(
    page.getByAltText("OViz by OtoVantage"),
  ).toBeVisible();
  await expect(
    page.getByText("Enter your email below to access OViz by OtoVantage."),
  ).toBeVisible();
});

test("formal lockup 'OViz by OtoVantage' appears on the report page", async ({
  page,
}) => {
  const { proConsultId } = getFixtures();
  await page.goto(`/consults/${proConsultId}/report`);

  // Logo alt text
  await expect(page.getByAltText("OViz by OtoVantage")).toBeVisible();

  // Footer text
  const footer = page.getByTestId("report-footer");
  await expect(footer).toContainText("OViz by OtoVantage");
});

test("old product name 'Hearing Impact Visualizer' does not appear on dashboard or report", async ({
  page,
}) => {
  const { proConsultId } = getFixtures();

  await page.goto("/dashboard");
  await expect(page.locator("body")).not.toContainText(
    "Hearing Impact Visualizer",
  );

  await page.goto(`/consults/${proConsultId}/report`);
  await expect(page.locator("body")).not.toContainText(
    "Hearing Impact Visualizer",
  );
});

test("primary action buttons carry the bg-brand-teal class", async ({
  page,
}) => {
  await page.goto("/dashboard");

  // Start consult button on dashboard
  const startBtn = page.getByTestId("start-consult-btn");
  await expect(startBtn).toBeVisible();
  const startClass = await startBtn.getAttribute("class");
  expect(startClass).toContain("bg-brand-teal");

  // Continue button on wizard (after navigating to new consult)
  await page.goto("/consults/new");
  const continueBtn = page.getByTestId("wizard-continue");
  await expect(continueBtn).toBeVisible();
  const continueClass = await continueBtn.getAttribute("class");
  expect(continueClass).toContain("bg-brand-teal");
});
