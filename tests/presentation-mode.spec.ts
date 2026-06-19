/**
 * Presentation Mode — full-screen, one-visual-per-slide overlay launched from
 * the report (and the consult dashboard). Asserts the overlay opens, the
 * educational disclaimer renders on every slide, the Word Understanding visual
 * opens today-first (both scenario toggles unpressed), and Next advances the
 * worded step counter. Keyed to the data-testid hooks in
 * components/report/presentation-mode.tsx.
 *
 * Locators are scoped to the overlay: it is a portal sibling of the report on
 * document.body, so the report behind it reuses the same wu-btn-* testids and
 * an unscoped query would match twice.
 */
import fs from "fs";
import path from "path";

import { test, expect } from "@playwright/test";

import type { E2EFixtures } from "./setup/global-setup";

function getFixtures(): E2EFixtures {
  const p = path.join(__dirname, ".auth/fixtures.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as E2EFixtures;
}

const DISCLAIMER =
  "not a diagnosis, guarantee, or substitute for clinician judgment";

test.describe("Presentation Mode", () => {
  test.beforeEach(async ({ page }) => {
    const { proConsultId } = getFixtures();
    await page.goto(`/consults/${proConsultId}/report`);
    await page.getByTestId("presentation-mode-launch").click();
    await expect(page.getByTestId("presentation-mode-overlay")).toBeVisible();
  });

  test("opens today-first with the disclaimer on every slide", async ({
    page,
  }) => {
    const overlay = page.getByTestId("presentation-mode-overlay");
    const disclaimer = overlay.getByTestId("presentation-disclaimer");
    const counter = overlay.getByTestId("presentation-step-counter");
    const next = overlay.getByTestId("presentation-next");

    // Slide 1 of 6, disclaimer present and verbatim.
    await expect(counter).toContainText("Step 1 of 6");
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText(DISCLAIMER);

    // Advance to the Word Understanding visual (slide 3). It must open
    // today-first: neither scenario is pre-revealed. Scope to the overlay so we
    // don't match the same wu-btn-* testids in the report rendered behind it.
    await next.click();
    await expect(counter).toContainText("Step 2 of 6");
    await expect(disclaimer).toBeVisible();

    await next.click();
    await expect(counter).toContainText("Step 3 of 6");
    await expect(disclaimer).toBeVisible();
    await expect(overlay.getByTestId("wu-btn-unaided")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(overlay.getByTestId("wu-btn-aided")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Next keeps advancing the counter; the disclaimer stays on every step.
    for (let step = 4; step <= 6; step++) {
      await next.click();
      await expect(counter).toContainText(`Step ${step} of 6`);
      await expect(disclaimer).toBeVisible();
    }
  });

  test("the exit button closes the overlay", async ({ page }) => {
    const overlay = page.getByTestId("presentation-mode-overlay");
    await overlay.getByTestId("presentation-mode-exit").click();
    await expect(overlay).toBeHidden();
  });
});
