/**
 * Rare Structure e2e smoke suite.
 *
 * Two surfaces, exercised against their running dev servers (both booted by
 * `e2e/playwright.config.ts`'s `webServer` array):
 *
 *   1. marketing-site (5174) — the homepage renders, the "RARE STRUCTURE"
 *      wordmark is present, and the page loads with zero console errors.
 *   2. platform-app (5173) — the catalyst map demo: the US map renders
 *      (real state-path geometry in the DOM), catalyst points are plotted,
 *      clicking a point opens its callout, and every built phase of the
 *      four-moment choreography (map → filter → match → deliver) renders.
 *
 * Screenshots of the homepage and each map-demo phase are written to
 * `test-results/` (gitignored).
 */

import { expect, test } from "@playwright/test";
import { MARKETING_URL, PLATFORM_URL } from "./playwright.config";

const SHOTS = "test-results";

// ───────────────────────────────────────────────────────────────────
// marketing-site — the homepage.
// ───────────────────────────────────────────────────────────────────

test("marketing-site homepage renders the wordmark with zero console errors", async ({
  page,
}) => {
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

  // The animated starfield canvas is present.
  await expect(page.locator("canvas")).toBeVisible();

  await page.screenshot({ path: `${SHOTS}/marketing-homepage.png`, fullPage: true });

  expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
});

// ───────────────────────────────────────────────────────────────────
// platform-app — the catalyst map demo.
// ───────────────────────────────────────────────────────────────────

test("platform-app map demo runs the full four-moment choreography", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  // ── Phase 1: the map ──────────────────────────────────────────────
  await page.goto(`${PLATFORM_URL}/`, { waitUntil: "networkidle" });

  // The demo starts on the `map` phase.
  const demoRoot = page.locator("[data-demo-phase]");
  await expect(demoRoot).toHaveAttribute("data-demo-phase", "map");

  // Real US geography — state-path geometry in the DOM. The map renders 51
  // states across three SVG layers (fill + border + edge), so well over 50
  // <path> elements is the geometry tell vs. a geometry-free dot blob.
  const statePaths = page.locator("svg path");
  await expect(async () => {
    expect(await statePaths.count()).toBeGreaterThan(50);
  }).toPass();

  // Catalyst points are plotted — the entrance animation fades them in, so
  // poll until the clickable point groups are present.
  const catalystPoints = page.locator('svg g[role="button"]');
  await expect(async () => {
    expect(await catalystPoints.count()).toBeGreaterThan(0);
  }).toPass({ timeout: 15_000 });

  await page.screenshot({ path: `${SHOTS}/map-phase-1-map.png`, fullPage: true });

  // Clicking a catalyst point opens its callout (a rect drawn inside the SVG,
  // stroked with the accent token). The point group is the outer @role=button;
  // its callout is a nested group. SVG <g> elements overlap the state-path
  // geometry, so a positional click is intercepted by a land-fill <path> —
  // dispatch the click event directly, which the demo's onClick handles.
  await catalystPoints.first().dispatchEvent("click");
  const calloutRect = page.locator('svg rect[stroke*="accent"]');
  await expect(calloutRect.first()).toBeVisible();

  await page.screenshot({ path: `${SHOTS}/map-phase-1-callout.png`, fullPage: true });

  // Clicking the callout opens the detail modal.
  const callout = page.locator('svg g[role="button"][aria-label^="Open detail"]');
  await callout.first().dispatchEvent("click");
  const modal = page.locator('[role="dialog"][aria-label="Catalyst detail"]');
  await expect(modal).toBeVisible();
  await expect(modal.locator("h2")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();

  // ── Phase 2: the filter cascade ───────────────────────────────────
  // ⌘K opens the thesis palette; running the thesis advances to `filter`.
  await page.keyboard.press("Meta+k");
  const palette = page.locator('[role="dialog"][aria-label="Run partner thesis"]');
  await expect(palette).toBeVisible();

  await page.getByRole("button", { name: /run thesis/i }).click();
  await expect(demoRoot).toHaveAttribute("data-demo-phase", "filter");
  await page.screenshot({ path: `${SHOTS}/map-phase-2-filter.png`, fullPage: true });

  // ── Phase 3: the match split-screen ───────────────────────────────
  // The cascade auto-advances to `match`.
  await expect(demoRoot).toHaveAttribute("data-demo-phase", "match", {
    timeout: 15_000,
  });
  // The matched-catalyst feed — buttons each labelled with a "% fit" score.
  const matchRows = page.getByRole("button", { name: /% fit/i });
  await expect(async () => {
    expect(await matchRows.count()).toBeGreaterThan(0);
  }).toPass();
  await page.screenshot({ path: `${SHOTS}/map-phase-3-match.png`, fullPage: true });

  // ── Phase 4: the deliver deep-dive ────────────────────────────────
  await matchRows.first().click();
  await expect(demoRoot).toHaveAttribute("data-demo-phase", "deliver");
  await expect(page.locator("h1")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/map-phase-4-deliver.png`, fullPage: true });

  // The outro gate auto-arms after a beat — its pipeline CTA appears.
  await expect(
    page.getByRole("button", { name: /open the pipeline/i }),
  ).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: `${SHOTS}/map-phase-4-outro.png`, fullPage: true });

  expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
});
