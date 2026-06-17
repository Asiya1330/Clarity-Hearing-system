/**
 * Word Understanding visual — labelled nonlinear axis, button-gated projection
 * lines, and the reduced-motion final-state fallback.
 *
 * Mirrors tests/report.spec.ts (auth fixtures + pro consult route) and
 * tests/hero-animation.spec.ts (SVG / animation-state assertions). The chart is
 * rendered by WordUnderstandingViz on the report page; non-visual data-testid
 * hooks (wu-chart, wu-line-*, wu-cap-*, wu-btn-*) make the SVG sub-elements
 * addressable.
 */
import fs from "fs";
import path from "path";

import { test, expect } from "@playwright/test";

import type { E2EFixtures } from "./setup/global-setup";

function getFixtures(): E2EFixtures {
  const p = path.join(__dirname, ".auth/fixtures.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as E2EFixtures;
}

test.describe("Word Understanding visual", () => {
  test.beforeEach(async ({ page }) => {
    const { proConsultId } = getFixtures();
    await page.goto(`/consults/${proConsultId}/report`);
  });

  test("renders a labelled nonlinear chart with a per-year x axis", async ({
    page,
  }) => {
    const chart = page.getByTestId("wu-chart");
    await expect(chart).toBeVisible();

    // Accessible name is present and reflects the new framing.
    await expect(chart).toHaveAttribute(
      "aria-label",
      /Word understanding over 5 years/,
    );

    // X axis: Today + interpolated per-year columns.
    await expect(chart.getByText("Today", { exact: true })).toBeVisible();
    await expect(chart.getByText("Year 1", { exact: true })).toBeVisible();
    await expect(chart.getByText("Year 5", { exact: true })).toBeVisible();

    // A true-percent Y tick confirms the labelled (nonlinear) axis.
    await expect(chart.getByText("80%", { exact: true }).first()).toBeVisible();

    // Scale-explanation helper copy.
    await expect(
      page.getByText(/vertical scale is expanded between 60% and 100%/),
    ).toBeVisible();
  });

  test("both toggle buttons exist and start unpressed", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "In 5 years without help" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "In 5 years with help" }),
    ).toBeVisible();

    await expect(page.getByTestId("wu-btn-unaided")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.getByTestId("wu-btn-aided")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("each button reveals its own line/caption and they toggle independently", async ({
    page,
  }) => {
    const btnUn = page.getByTestId("wu-btn-unaided");
    const btnAi = page.getByTestId("wu-btn-aided");
    const capUn = page.getByTestId("wu-cap-unaided");
    const capAi = page.getByTestId("wu-cap-aided");
    const lineUn = page.getByTestId("wu-line-unaided");
    const lineAi = page.getByTestId("wu-line-aided");

    // Both projections hidden to start.
    await expect(capUn).toHaveCSS("opacity", "0");
    await expect(capAi).toHaveCSS("opacity", "0");

    // Reveal without-help.
    await btnUn.click();
    await expect(btnUn).toHaveAttribute("aria-pressed", "true");
    await expect(capUn).toHaveCSS("opacity", "1");
    await expect(lineUn).toHaveCSS("stroke-dashoffset", "0px");

    // With-help is independent — still hidden.
    await expect(btnAi).toHaveAttribute("aria-pressed", "false");
    await expect(capAi).toHaveCSS("opacity", "0");

    // Reveal with-help too.
    await btnAi.click();
    await expect(btnAi).toHaveAttribute("aria-pressed", "true");
    await expect(capAi).toHaveCSS("opacity", "1");
    await expect(lineAi).toHaveCSS("stroke-dashoffset", "0px");

    // Toggle without-help back off; with-help stays on.
    await btnUn.click();
    await expect(btnUn).toHaveAttribute("aria-pressed", "false");
    await expect(capUn).toHaveCSS("opacity", "0");
    await expect(btnAi).toHaveAttribute("aria-pressed", "true");
    await expect(capAi).toHaveCSS("opacity", "1");

    // Toggle with-help back off.
    await btnAi.click();
    await expect(btnAi).toHaveAttribute("aria-pressed", "false");
    await expect(capAi).toHaveCSS("opacity", "0");
  });
});

test.describe("Word Understanding — reduced motion", () => {
  test("shows both projection lines + captions without interaction", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { proConsultId } = getFixtures();
    await page.goto(`/consults/${proConsultId}/report`);

    await expect(page.getByTestId("wu-chart")).toBeVisible();

    // Final-state fallback: both lines drawn + both captions visible, no clicks.
    await expect(page.getByTestId("wu-cap-unaided")).toHaveCSS("opacity", "1");
    await expect(page.getByTestId("wu-cap-aided")).toHaveCSS("opacity", "1");
    await expect(page.getByTestId("wu-line-unaided")).toHaveCSS(
      "stroke-dashoffset",
      "0px",
    );
    await expect(page.getByTestId("wu-line-aided")).toHaveCSS(
      "stroke-dashoffset",
      "0px",
    );

    // Buttons remain unpressed — the complete chart needs no interaction.
    await expect(page.getByTestId("wu-btn-unaided")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
