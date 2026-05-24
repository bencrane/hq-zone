import { ArrowUpRight, Crosshair, LayoutGrid, ListChecks, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Card, Grid, Page, Stack, Text } from "@rare-structure-hq/ui";

type Tool = {
  title: string;
  description: string;
  icon: typeof LayoutGrid;
  to?: string;
};

const TOOLS: Tool[] = [
  {
    title: "Workbooks",
    description:
      "Clay-shape lead workspaces. Each workbook holds companies and people tables; stack enrichment columns and hand off to campaigns.",
    icon: Sparkles,
    to: "/workbooks",
  },
  {
    title: "TAM",
    description:
      "Lead list builder — filter people by title, seniority, function, and company firmographics.",
    icon: Crosshair,
    to: "/tam",
  },
  {
    title: "Lists",
    description:
      "Saved lead lists. Manage members and hand off to hq-x campaigns.",
    icon: ListChecks,
    to: "/lists",
  },
  {
    title: "Govt Leads",
    description:
      "30-day contract winners across federal agencies. Filter by NAICS, agency, state, obligation.",
    icon: LayoutGrid,
    to: "/opportunities",
  },
  {
    title: "Leads",
    description:
      "Read-only view over gtm.people across all sources (SFNET, exa, etc.). Filter by source.",
    icon: Users,
    to: "/leads",
  },
];

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const body = (
    <Card variant="raised" interactive={Boolean(tool.to)}>
      <Stack gap="6" p="6">
        <div className="flex items-start justify-between">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--color-surface-base)] text-[color:var(--color-text-muted)]">
            <Icon size={16} strokeWidth={1.5} />
          </div>
          <ArrowUpRight
            size={16}
            strokeWidth={1.5}
            className="text-[color:var(--color-text-subtle)]"
          />
        </div>
        <Stack gap="2">
          <Text as="h2" size="display-sm">
            {tool.title}
          </Text>
          <Text size="body-sm" color="muted">
            {tool.description}
          </Text>
        </Stack>
      </Stack>
    </Card>
  );

  if (tool.to) {
    return (
      <Link to={tool.to} className="contents">
        {body}
      </Link>
    );
  }
  return body;
}

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="absolute left-6 top-6 text-body-sm tracking-wide">HQ</div>
      <Page variant="default" py="20">
        <Stack gap="10">
          <Stack gap="2">
            <Text as="h1" size="display-lg">
              HQ
            </Text>
            <Text size="body-sm" color="muted">
              Internal tools.
            </Text>
          </Stack>
          <Grid cols={1} mdCols={2} lgCols={3} gap="4">
            {TOOLS.map((tool) => (
              <ToolCard key={tool.title} tool={tool} />
            ))}
          </Grid>
        </Stack>
      </Page>
    </div>
  );
}
