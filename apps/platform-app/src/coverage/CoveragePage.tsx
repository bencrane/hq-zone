import { Loader2 } from "lucide-react";
/**
 * Coverage page — `/coverage`. Single inventory table backed by DEX's
 * nightly-cached `/coverage/stats` endpoint. Loads <500ms cold: one BFF
 * round-trip, no live Lance scans. Each row reports name, type
 * (Dataset / Bridge / Intersection), row count, and last-updated timestamp.
 *
 * Empty state: nightly cron may not have populated rows yet, in which case
 * the table surfaces a one-line "nightly cron next at 08:00 UTC" placeholder.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";

import { type CoverageStats, getCoverageStats } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CoverageTable } from "./CoverageTable";

export default function CoveragePage() {
  const { session, signOut } = useAuth();
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    getCoverageStats()
      .then((res) => {
        if (cancelled) return;
        setStats(res);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "coverage stats failed");
        setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Inline gap="3" align="center">
            <Link to="/">
              <Button variant="ghost" size="sm">
                ← HQ
              </Button>
            </Link>
            <Stack gap="1">
              <Text as="h1" size="display-sm">
                Coverage
              </Text>
              <Text size="body-sm" color="muted">
                Datasets and bridges registered in Polaris — refreshed nightly at 08:00 UTC.
              </Text>
            </Stack>
          </Inline>
          <Inline gap="3" align="center">
            <Text size="body-xs" color="muted" mono>
              {session?.user.email}
            </Text>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </Inline>
        </Inline>

        {loading ? (
          <Inline gap="2" align="center">
            <Loader2 size={14} className="animate-spin" />
            <Text size="body-sm" color="muted">
              Loading coverage stats…
            </Text>
          </Inline>
        ) : err ? (
          <Text size="body-sm" color="muted">
            Failed to load coverage stats: {err}
          </Text>
        ) : stats ? (
          <CoverageTable stats={stats} />
        ) : null}
      </Stack>
    </Page>
  );
}
