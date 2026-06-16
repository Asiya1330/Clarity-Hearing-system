/**
 * Tests 18–19: Animation primitives & impact-visual rendering
 *
 * 18. The signature "rising line" SVG on `/` must carry the `pathLength="1"`
 *     attribute so the dash-math is resolution-independent. Without it the
 *     stroke-dashoffset animation has nothing to anchor to and the line never
 *     draws (the regression that shipped in commit 0050d9f and was fixed in
 *     1ab3ea5).
 * 19. Each premium-report SectionCard is wrapped in <RevealOnScroll>, which
 *     applies the `oviz-reveal-on-scroll` class to its root and gets `.in`
 *     when scrolled into view. Asserting the wrapper exists on the report
 *     catches both the JIT-purge regression and the "wrong class never got
 *     applied" regression.
 *
 *     The Real-Life Listening Map's stacked-bar segments carry
 *     `oviz-anim-grow-w` for their entrance — at least one must render with
 *     non-zero width on a real consult, which catches the "the bar element
 *     wasn't laid out" regression.
 */
import fs from "fs";
import path from "path";

import { test, expect } from "@playwright/test";

import type { E2EFixtures } from "./setup/global-setup";

function getFixtures(): E2EFixtures {
  const p = path.join(__dirname, ".auth/fixtures.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as E2EFixtures;
}

test("hero rising line carries pathLength='1' and the oviz-rise-path class", async ({
  page,
}) => {
  await page.goto("/");

  const heroPath = page.locator("path.oviz-rise-path");
  await expect(heroPath).toHaveCount(1);
  await expect(heroPath).toHaveAttribute("pathLength", "1");
});

test("report page renders SectionCards wrapped in RevealOnScroll", async ({
  page,
}) => {
  const { proConsultId } = getFixtures();
  await page.goto(`/consults/${proConsultId}/report`);

  // Five impact visuals → five reveal wrappers as direct section chrome.
  const reveals = page.locator("section.oviz-reveal-on-scroll");
  await expect(await reveals.count()).toBeGreaterThanOrEqual(5);
});

test("report listening-lift bars carry oviz-anim-grow-w and render with non-zero width", async ({
  page,
}) => {
  const { proConsultId } = getFixtures();
  await page.goto(`/consults/${proConsultId}/report`);

  const bars = page.locator(".oviz-anim-grow-w");
  // ListeningLiftMap alone yields 6 (3 situations × 2 segments); the first
  // one must lay out with width > 0 for any realistic consult.
  const count = await bars.count();
  expect(count).toBeGreaterThan(0);

  // Find at least one bar with non-zero rendered width — some segments may be
  // 0% if a situation's aided difficulty rounds to zero, which is fine.
  let foundPositive = false;
  for (let i = 0; i < count; i++) {
    const box = await bars.nth(i).boundingBox();
    if (box && box.width > 0) {
      foundPositive = true;
      break;
    }
  }
  expect(foundPositive).toBe(true);
});
