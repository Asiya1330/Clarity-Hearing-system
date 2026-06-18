/**
 * Audiogram → Conversation demonstration tool — runtime acceptance checks.
 *
 * Mirrors the auth fixtures used by the rest of the suite (pro storageState).
 * Verifies the decoupled tool route, the maximized client-facing view, the
 * patient-facing aided toggle, the no-scrim clinician drawer (Escape + close
 * button), the dashboard launch tile / nav entry, and the unauthenticated
 * redirect enforced by the global proxy.
 */
import { test, expect } from "@playwright/test";

test.describe("Audiogram → Conversation — entry points", () => {
  test("dashboard launch tile and nav link target the tool", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const tile = page.getByTestId("open-audiogram-tool-button");
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAttribute("href", "/tools/audiogram");

    const navLink = page.getByRole("link", { name: "Demo tool", exact: true });
    await expect(navLink).toHaveAttribute("href", "/tools/audiogram");

    await tile.click();
    await expect(page).toHaveURL(/\/tools\/audiogram$/);
  });
});

test.describe("Audiogram → Conversation — maximized client-facing view", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tools/audiogram");
  });

  test("renders the graph, caption, readouts and chips", async ({ page }) => {
    // The chart SVG carries the data-derived accessible name.
    const chart = page.getByRole("img", { name: /^Audiogram\./ });
    await expect(chart).toBeVisible();
    // Severity colour bands draw their degree labels inside the SVG.
    await expect(chart.getByText("Normal", { exact: true }).first()).toBeVisible();
    await expect(
      chart.getByText("Profound", { exact: true }).first(),
    ).toBeVisible();

    // Plain-language caption — default preset is high-frequency loss.
    await expect(page.getByText(/high pitches/i).first()).toBeVisible();

    // Three readouts.
    await expect(page.getByText("Speech-frequency average")).toBeVisible();
    await expect(page.getByText("Degree of hearing loss")).toBeVisible();
    await expect(page.getByText(/^Clarity gap/)).toBeVisible();
    // Colour-coded degree badge (PTA 30 → "Mild"); a <span>, not the SVG band.
    await expect(
      page.locator("span").filter({ hasText: /^Mild$/ }).first(),
    ).toBeVisible();

    // Three colour-coded outcome chips.
    await expect(
      page.getByRole("heading", { name: "Soft consonants slip past" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Noisy rooms are exhausting" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What treatment gives back" }),
    ).toBeVisible();
  });

  test("aided toggle flips label, state and the treatment chip", async ({
    page,
  }) => {
    // Treatment chip starts as a preview until aids are turned on.
    await expect(page.getByText("Preview", { exact: true })).toBeVisible();

    const showBtn = page.getByRole("button", {
      name: "Show what hearing aids give back",
    });
    await expect(showBtn).toHaveAttribute("aria-pressed", "false");
    await showBtn.click();

    const hideBtn = page.getByRole("button", { name: "Hide hearing aids" });
    await expect(hideBtn).toBeVisible();
    await expect(hideBtn).toHaveAttribute("aria-pressed", "true");
    // High-frequency loss restores soft consonants under the modeled aids.
    await expect(page.getByText("Restored", { exact: true })).toBeVisible();

    await hideBtn.click();
    await expect(
      page.getByRole("button", { name: "Show what hearing aids give back" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("Audiogram → Conversation — clinician drawer", () => {
  test("opens without a dark scrim and dismisses via Escape and the close button", async ({
    page,
  }) => {
    await page.goto("/tools/audiogram");

    const panel = page.locator('aside[role="dialog"]');
    const wrapper = page.locator("div.fixed.inset-0.z-40");
    const opener = page.getByRole("button", { name: "Adjust hearing levels" });
    const catcher = page.locator(
      'button[aria-label="Close controls"].inset-0',
    );

    // Closed to start: panel slid off-canvas, subtree hidden from a11y tree.
    await expect(panel).toHaveClass(/translate-x-full/);
    await expect(wrapper).toHaveAttribute("aria-hidden", "true");

    // Open it.
    await opener.click();
    await expect(panel).toHaveClass(/translate-x-0/);
    await expect(wrapper).toHaveAttribute("aria-hidden", "false");

    // The graph stays visible — the drawer does NOT drop a dark scrim over it.
    await expect(page.getByRole("img", { name: /^Audiogram\./ })).toBeVisible();
    // The click-catcher is a faint 5% navy tint, not an opaque/dark overlay.
    const bg = await catcher.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bg).toMatch(/^rgba\(0, 33, 71, 0\.0\d+\)$/);

    // A clinician-only control lives inside the drawer.
    await expect(
      page.getByRole("button", { name: "Reset to high-frequency loss" }),
    ).toBeVisible();

    // Escape dismisses.
    await page.keyboard.press("Escape");
    await expect(panel).toHaveClass(/translate-x-full/);
    await expect(wrapper).toHaveAttribute("aria-hidden", "true");

    // Reopen, then dismiss via the explicit close (X) button.
    await opener.click();
    await expect(panel).toHaveClass(/translate-x-0/);
    await page.getByRole("button", { name: "Close controls" }).last().click();
    await expect(panel).toHaveClass(/translate-x-full/);
    await expect(wrapper).toHaveAttribute("aria-hidden", "true");
  });
});

test.describe("Audiogram → Conversation — auth gate", () => {
  // Drop the authenticated storage state for this block.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated visit redirects to the login page", async ({ page }) => {
    await page.goto("/tools/audiogram");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
