import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the Rare Structure e2e smoke suite.
 *
 * Mirrored from `ae-hq/e2e/playwright.config.ts`: a single `chromium` project,
 * `workers: 1`, `reuseExistingServer: true`. The one difference from `ae-hq`
 * is the two-app setup — `marketing-site` (5174) and `platform-app` (5173)
 * run as separate dev servers, so `webServer` is an array that boots both.
 * The suite reaches each app by its own absolute URL.
 *
 * `cwd: ".."` so the `bun run --filter` commands resolve against the repo
 * root (this config lives in `e2e/`).
 */

/** Dev-server ports — must match each app's `package.json` `dev` script. */
export const MARKETING_PORT = 5174;
export const PLATFORM_PORT = 5173;

export const MARKETING_URL = `http://localhost:${MARKETING_PORT}`;
export const PLATFORM_URL = `http://localhost:${PLATFORM_PORT}`;

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    trace: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  // Boot both app dev servers if they aren't already up. `reuseExistingServer`
  // means a bare `bun run test:e2e` works whether or not the dev servers are
  // already running.
  webServer: [
    {
      command: "bun run --filter platform-app dev",
      url: `${PLATFORM_URL}/`,
      cwd: "..",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "bun run --filter marketing-site dev",
      url: `${MARKETING_URL}/`,
      cwd: "..",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
