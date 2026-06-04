/**
 * Regression: gated routes must never hang on an infinite blank page.
 *
 * `AuthProvider` (apps/platform-app/src/lib/auth.tsx) gates every authed route
 * behind a `loading` flag. `loading` was only ever cleared inside
 * `supabase.auth.getSession().then(...)` — with no `catch`, no `finally`, and
 * no timeout. When `getSession()` hung (the Supabase navigator-LockManager
 * deadlocks if another tab holds the auth lock, or a token refresh stalls) or
 * rejected (corrupt stored token), `loading` stayed `true` forever. Every
 * `RequireAuth`-gated card detail page then rendered `null` — a blank page
 * showing only the out-of-`<Routes>` "HQ" badge — while the ungated home grid
 * kept rendering. That is the "every card's page is blank" bug.
 *
 * This test reproduces the exact stall by making `navigator.locks.request`
 * (which `getSession()` awaits) never resolve, then asserts the gate still
 * releases — the SignIn surface appears — instead of an infinite blank.
 *
 * Needs no Supabase secrets: the dev server boots on the invalid-fallback
 * client, and `getSession()` still acquires the lock regardless of URL.
 */
import { expect, test } from "@playwright/test";
import { PLATFORM_URL } from "./playwright.config";

test("gated route releases to SignIn when supabase getSession() hangs (no infinite blank)", async ({
  page,
}) => {
  // Deadlock the Supabase auth lock before any app code runs: getSession()
  // awaits navigator.locks.request, so a never-resolving request hangs it,
  // reproducing the production stall that pinned AuthProvider.loading=true.
  await page.addInitScript(() => {
    const nav = navigator as unknown as { locks?: { request?: unknown } };
    if (nav.locks && typeof nav.locks.request === "function") {
      nav.locks.request = () => new Promise(() => {}); // never resolves
    }
  });

  await page.goto(`${PLATFORM_URL}/lists`);

  // The "HQ" badge renders outside <Routes>, so it is always present once the
  // app boots — proof the shell is alive and only the gated subtree is at risk.
  await expect(page.getByRole("link", { name: /back to hq home/i })).toBeVisible();

  // With the fix, AuthProvider's safety-net timer clears `loading` and the gate
  // falls through to SignIn. Before the fix this never appears — the page is a
  // blank carrying only the HQ badge — so this is the regression guard. The
  // email field is unique to the SignIn surface.
  await expect(page.getByPlaceholder("you@example.com")).toBeVisible({ timeout: 12_000 });
});
