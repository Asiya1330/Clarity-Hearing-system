/**
 * Test 9: Pro clinic can grant consent and the capture button becomes enabled
 */
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

import type { E2EFixtures } from "./setup/global-setup";

function getFixtures(): E2EFixtures {
  const p = path.join(__dirname, ".auth/fixtures.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as E2EFixtures;
}

test("pro clinic — consent checkbox enables the capture button", async ({
  page,
}) => {
  const { proConsultId } = getFixtures();
  await page.goto(`/consults/${proConsultId}`);

  // Photo module must be visible for pro clinic
  const consentCheckbox = page.getByTestId("photo-consent-checkbox");
  await expect(consentCheckbox).toBeVisible();

  // Capture button must start disabled (no consent yet)
  const captureBtn = page.getByTestId("photo-capture-button");
  await expect(captureBtn).toBeDisabled();

  // Grant consent — the component calls /api/consults/photo-consent then
  // updates local state; wait for the network round-trip.
  const [response] = await Promise.all([
    page.waitForResponse("**/api/consults/photo-consent"),
    consentCheckbox.click(),
  ]);
  expect(response.status()).toBe(200);

  // Capture button should now be enabled
  await expect(captureBtn).toBeEnabled({ timeout: 8_000 });
});
