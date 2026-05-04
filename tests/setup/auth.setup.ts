import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

import { E2E_PASSWORD, E2E_PRO_EMAIL, E2E_STARTER_EMAIL } from "./global-setup";

const AUTH_DIR = path.join(__dirname, "../.auth");

setup("authenticate pro user", async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  await page.goto("/auth/login");
  await page.getByTestId("login-email").fill(E2E_PRO_EMAIL);
  await page.getByTestId("login-password").fill(E2E_PASSWORD);
  await page.getByTestId("login-button").click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  await page.context().storageState({ path: path.join(AUTH_DIR, "pro.json") });
});

setup("authenticate starter user", async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  await page.goto("/auth/login");
  await page.getByTestId("login-email").fill(E2E_STARTER_EMAIL);
  await page.getByTestId("login-password").fill(E2E_PASSWORD);
  await page.getByTestId("login-button").click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  await page
    .context()
    .storageState({ path: path.join(AUTH_DIR, "starter.json") });
});
