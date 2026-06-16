/**
 * Tests 18–19: Animation primitives & impact-visual rendering
 *
 * 18. The signature "rising line" SVG on `/` must carry the `pathLength="1"`
 *     attribute so the dash-math is resolution-independent. Without it the
 *     stroke-dashoffset animation has nothing to anchor to and the line never
 *     draws (the regression that shipped in commit 0050d9f and was fixed in
 *     1ab3ea5).
 * 19. The report's impact visuals each animate in via `.oviz-anim-grow-w`
 *     (transform: scaleX(0) -> scaleX(1)). The class must appear on rendered
 *     bars, and at least one bar must end up with non-zero rendered width —
 *     this catches both the JIT-purge regression and the "wrong class never
 *     got applied" regression.
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

test("report impact-visual bars carry oviz-anim-grow-w and render with non-zero width", async ({
  page,
}) => {
  const { proConsultId } = getFixtures();
  await page.goto(`/consults/${proConsultId}/report`);

  const bars = page.locator(".oviz-anim-grow-w");
  // BrainBattery alone renders three (today + two five-year scenarios), and
  // the listening lift map adds at least one more pair when goals exist.
  await expect(bars.first()).toBeVisible();

  const firstBox = await bars.first().boundingBox();
  expect(firstBox).not.toBeNull();
  expect(firstBox!.width).toBeGreaterThan(0);
});
