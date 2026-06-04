/**
 * Rare Structure e2e smoke suite.
 *
 * Two surfaces, exercised against their running dev servers (both booted by
 * `e2e/playwright.config.ts`'s `webServer` array):
 *
 *   1. marketing-site (5174) — the homepage renders, the "RARE STRUCTURE"
 *      wordmark is present, and the page loads with zero console errors.
 *   2. platform-app (5173) — the HQ home grid renders its tool cards, and
 *      clicking a tool routes into its gated page, where the auth gate resolves
 *      to the SignIn surface (no session) instead of hanging on a blank page.
 *
 * Screenshots of the homepage and each platform step are written to
 * `test-results/` (gitignored).
 */

import { expect, test } from "@playwright/test";
import { MARKETING_URL, PLATFORM_URL } from "./playwright.config";

const SHOTS = "test-results";

// ───────────────────────────────────────────────────────────────────
// marketing-site — the homepage.
// ───────────────────────────────────────────────────────────────────

test("marketing-site homepage renders the wordmark with zero console errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.goto(`${MARKETING_URL}/`, { waitUntil: "networkidle" });

  // The wordmark is split across two <span>s ("RARE" + "STRUCTURE") inside the
  // single <h1>. Assert both the heading and its words.
  const heading = page.locator("h1");
  await expect(heading).toBeVisible();
  await expect(heading).toContainText("Rare", { ignoreCase: true });
  await expect(heading).toContainText("Structure", { ignoreCase: true });

  await page.screenshot({ path: `${SHOTS}/marketing-homepage.png`, fullPage: true });

  expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
});

// ───────────────────────────────────────────────────────────────────
// platform-app — the HQ home grid + auth gate.
// ───────────────────────────────────────────────────────────────────

test("platform-app home renders the HQ tool grid and routes into a gated tool", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  // ── The HQ home grid — the platform-app's home surface ────────────
  await page.goto(`${PLATFORM_URL}/`, { waitUntil: "domcontentloaded" });

  // The home heading + the "Internal tools." subtitle. The corner "HQ" badge
  // is a <div>, so scope to the <h1> to stay unambiguous.
  await expect(page.getByRole("heading", { level: 1, name: "HQ" })).toBeVisible();
  await expect(page.getByText("Internal tools.")).toBeVisible();

  // A representative spread of the tool cards renders (each is an <h2>).
  for (const tool of [
    "GTM Agent",
    "Lists",
    "Govt Leads",
    "Coverage",
    "Signals",
    "Scheduled Tasks",
  ]) {
    await expect(page.getByRole("heading", { name: tool })).toBeVisible();
  }

  await page.screenshot({ path: `${SHOTS}/platform-home.png`, fullPage: true });

  // ── Click a tool → its gated route → the SignIn surface ───────────
  // Each card is a <Link>; with no session the auth gate resolves to SignIn
  // (not a blank page — see e2e/auth-gate.spec.ts for the regression it guards).
  await page.getByRole("link", { name: /Govt Leads/ }).click();
  await expect(page).toHaveURL(/\/opportunities$/);
  await expect(page.getByPlaceholder("you@example.com")).toBeVisible();

  await page.screenshot({ path: `${SHOTS}/platform-signin.png`, fullPage: true });

  expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
});
