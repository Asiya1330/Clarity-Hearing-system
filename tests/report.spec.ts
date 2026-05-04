/**
 * Tests 10–12, 17: Report page
 *
 * 10. Report cannot generate without model_run
 * 11. Report includes required disclaimer
 * 12. Outcome capture works (consult results are viewable after saving)
 * 17. Report title is "OViz Hearing Impact Summary"
 */
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

import type { E2EFixtures } from "./setup/global-setup";

function getFixtures(): E2EFixtures {
  const p = path.join(__dirname, ".auth/fixtures.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as E2EFixtures;
}

test("report cannot generate without a model_run — shows blocked state", async ({
  page,
}) => {
  // Use a syntactically valid but non-existent UUID so the DB query returns nothing.
  const nonExistentId = "00000000-0000-0000-0000-000000000001";
  await page.goto(`/consults/${nonExistentId}/report`);

  // The Blocked() component keeps the title but adds the "cannot be generated" message.
  await expect(page.getByText("OViz Hearing Impact Summary")).toBeVisible();
  await expect(page.getByText("Report cannot be generated yet.")).toBeVisible();
  await expect(page.getByTestId("report-disclaimer")).not.toBeVisible();
});

test("report title is OViz Hearing Impact Summary", async ({ page }) => {
  const { proConsultId } = getFixtures();
  await page.goto(`/consults/${proConsultId}/report`);

  const title = page.getByTestId("report-title");
  await expect(title).toBeVisible();
  await expect(title).toHaveText("OViz Hearing Impact Summary");
});

test("report includes required clinical disclaimer", async ({ page }) => {
  const { proConsultId } = getFixtures();
  await page.goto(`/consults/${proConsultId}/report`);

  const disclaimer = page.getByTestId("report-disclaimer");
  await expect(disclaimer).toBeVisible();
  await expect(disclaimer).toContainText(
    "Educational projection based on published evidence and today's hearing results.",
  );
  await expect(disclaimer).toContainText(
    "Not a diagnosis, guarantee, or substitute for clinician judgment.",
  );
});

test("outcome capture — consult results are viewable after saving", async ({
  page,
}) => {
  const { proConsultId } = getFixtures();

  // Navigate to the saved consult results page.
  await page.goto(`/consults/${proConsultId}`);

  // The results dashboard must be present and show computed outputs.
  await expect(page.getByText("Consult results")).toBeVisible();
  await expect(page.getByText("Partner Impact Mirror")).toBeVisible();

  // The annual partner hours stat is computed and displayed.
  const annualHours = page.getByTestId("partner-annual-hours");
  await expect(annualHours).toBeVisible();
  // Fixture uses 8 repeats/day × 10 s × 365 / 3600 ≈ 8.1 hours.
  await expect(annualHours).toContainText("8.1");
});
