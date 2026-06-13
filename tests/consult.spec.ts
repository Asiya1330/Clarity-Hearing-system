/**
 * Tests 2–8: Consult wizard behaviour
 *
 * 2.  Clinician can start an OViz consult
 * 3.  PTA cannot exceed 120
 * 4.  WRS cannot exceed 100
 * 5.  Continue button is disabled until required fields are valid
 * 6.  Partner Impact Mirror calculates annual repeat burden
 * 7.  Real-Life Listening Map accepts only up to 3 situations
 * 8.  Starter clinic cannot upload photos (see photos-starter.spec.ts)
 */
import { test, expect } from "@playwright/test";

test("clinician can start an OViz consult", async ({ page }) => {
  await page.goto("/dashboard");
  const startBtn = page.getByTestId("start-consult-button");
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // The Start CTA now leads to the intake-mode chooser.
  await page.waitForURL("**/consults/start");
  // Let the client component hydrate before clicking the Link (avoids a
  // pre-hydration "dead click" that never triggers client-side navigation).
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("mode-in-clinic")).toBeVisible();

  // "In Clinic" opens the existing full wizard at /consults/new.
  await page.getByTestId("mode-in-clinic").click();
  await page.waitForURL("**/consults/new");
  await expect(
    page.getByRole("heading", { name: "Patient information" }),
  ).toBeVisible();
});

test("Continue is disabled until all required clinician fields are valid", async ({
  page,
}) => {
  await page.goto("/consults/new");

  // Step 1 is patient info (valid by default); advance to clinician inputs.
  await page.getByTestId("wizard-continue").click();

  const continueBtn = page.getByTestId("wizard-continue");
  await expect(continueBtn).toBeDisabled();

  // Fill only PTA — still disabled
  await page.locator("#pta").fill("45");
  await expect(continueBtn).toBeDisabled();

  // Fill WRS — still disabled
  await page.locator("#wrs").fill("72");
  await expect(continueBtn).toBeDisabled();

  // Fill duration — now enabled
  await page.locator("#durationYears").fill("5");
  await expect(continueBtn).toBeEnabled();
});

test("PTA cannot exceed 120 — shows out-of-range error", async ({ page }) => {
  await page.goto("/consults/new");
  // Advance past the patient-info step to reach clinician inputs.
  await page.getByTestId("wizard-continue").click();

  const ptaInput = page.locator("#pta");
  await ptaInput.fill("121");
  await ptaInput.blur();

  await expect(page.getByText("Enter a value between 0 and 120.")).toBeVisible();
  await expect(page.getByTestId("wizard-continue")).toBeDisabled();
});

test("WRS cannot exceed 100 — shows out-of-range error", async ({ page }) => {
  await page.goto("/consults/new");
  // Advance past the patient-info step to reach clinician inputs.
  await page.getByTestId("wizard-continue").click();

  const wrsInput = page.locator("#wrs");
  await wrsInput.fill("101");
  await wrsInput.blur();

  await expect(page.getByText("Enter a value between 0 and 100.")).toBeVisible();
  await expect(page.getByTestId("wizard-continue")).toBeDisabled();
});

test("Partner Impact Mirror shows annual repeat burden", async ({ page }) => {
  await page.goto("/consults/new");

  // Advance past the patient-info step to reach clinician inputs.
  await page.getByTestId("wizard-continue").click();

  // Complete clinician step to unlock Continue
  await page.locator("#pta").fill("45");
  await page.locator("#wrs").fill("72");
  await page.locator("#durationYears").fill("5");
  await page.getByTestId("wizard-continue").click();

  // Skip patient sliders step
  await page.waitForURL(/consults\/new/);
  await page.getByTestId("wizard-continue").click();

  // Now on partner step
  await expect(page.getByText("Partner impact mirror")).toBeVisible();

  // Enter repeats per day
  await page.locator("#partnerRepeats").fill("8");

  // The Annual repeat burden assumption is visible
  await expect(
    page.getByText(/Annual repeat burden uses a visible 10-second-per-repeat/),
  ).toBeVisible();
});

test("Real-Life Listening Map accepts only up to 3 situations", async ({
  page,
}) => {
  await page.goto("/consults/new");

  // Advance past the patient-info step to reach clinician inputs.
  await page.getByTestId("wizard-continue").click();

  // Complete clinician step
  await page.locator("#pta").fill("45");
  await page.locator("#wrs").fill("72");
  await page.locator("#durationYears").fill("5");
  await page.getByTestId("wizard-continue").click();

  // Skip sliders
  await page.getByTestId("wizard-continue").click();

  // Skip partner
  await page.getByTestId("wizard-continue").click();

  // Now on listening map
  await expect(page.getByText("Real-life listening map")).toBeVisible();
  await expect(page.getByTestId("situation-count")).toContainText("0 of 3");

  // Select 3 chips
  const chips = page.locator('[data-testid^="situation-chip-"]');
  const allChips = await chips.all();

  await allChips[0].click();
  await expect(page.getByTestId("situation-count")).toContainText("1 of 3");

  await allChips[1].click();
  await expect(page.getByTestId("situation-count")).toContainText("2 of 3");

  await allChips[2].click();
  await expect(page.getByTestId("situation-count")).toContainText("3 of 3");

  // Fourth chip should be disabled
  const fourthChip = allChips[3];
  await expect(fourthChip).toBeDisabled();
});
