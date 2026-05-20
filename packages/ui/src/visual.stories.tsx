import type { Meta, StoryObj } from "@storybook/react";
import { Stack } from "./layout";
import { Badge, Button, Card, Text } from "./visual";

const meta = {
  title: "Visual",
} satisfies Meta;

export default meta;

// ── Text ──

export const TextPrimitive: StoryObj = {
  name: "Text",
  render: () => (
    <Stack gap="3">
      <Text size="display-lg" color="primary" as="h1">
        Display large
      </Text>
      <Text size="body-md" color="default">
        Body medium — the default reading size.
      </Text>
      <Text size="mono-xs" color="muted" mono>
        Mono eyebrow label
      </Text>
    </Stack>
  ),
};

// ── Card ──

export const CardPrimitive: StoryObj = {
  name: "Card",
  render: () => (
    <Stack gap="4">
      <Card>
        <Text size="body-sm" color="muted" className="px-6 py-4">
          default card — translucent raised surface
        </Text>
      </Card>
      <Card variant="raised" interactive>
        <Text size="body-sm" color="muted" className="px-6 py-4">
          raised + interactive card
        </Text>
      </Card>
    </Stack>
  ),
};

// ── Badge ──

export const BadgePrimitive: StoryObj = {
  name: "Badge",
  render: () => (
    <Stack gap="3" align="start">
      <Badge>default</Badge>
      <Badge tone="accent">accent</Badge>
      <Badge tone="info">info</Badge>
      <Badge tone="success">success</Badge>
      <Badge tone="warn">warn</Badge>
      <Badge tone="error">error</Badge>
    </Stack>
  ),
};

// ── Button ──

export const ButtonPrimitive: StoryObj = {
  name: "Button",
  render: () => (
    <Stack gap="3" align="start">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="primary" size="sm">
        Primary small
      </Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
    </Stack>
  ),
};
