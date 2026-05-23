/**
 * HQBadge — fixed top-left "HQ" link that returns to the home page.
 * Mounted once at the App root so it appears across every route.
 */
import { Link, useLocation } from "react-router-dom";

export function HQBadge() {
  const location = useLocation();
  // Hide on home itself — the centered "HQ" h1 already serves the role
  // there and the corner badge would just duplicate it.
  if (location.pathname === "/") return null;
  return (
    <Link
      to="/"
      aria-label="Back to HQ home"
      className="fixed left-4 top-4 z-50 select-none rounded-md px-2 py-1 text-body-sm tracking-wide text-white/80 hover:bg-white/5 hover:text-white"
    >
      HQ
    </Link>
  );
}
