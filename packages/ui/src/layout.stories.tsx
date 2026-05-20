import type { Meta, StoryObj } from "@storybook/react";
import { Box, Divider, Grid, Inline, Page, Stack } from "./layout";

const meta = {
  title: "Layout",
} satisfies Meta;

export default meta;

// ── Stack ──

export const StackPrimitive: StoryObj = {
  name: "Stack",
  render: () => (
    <Stack gap="4">
      <Box bg="raised" border="subtle" p="4">
        one
      </Box>
      <Box bg="raised" border="subtle" p="4">
        two
      </Box>
      <Box bg="raised" border="subtle" p="4">
        three
      </Box>
    </Stack>
  ),
};

// ── Inline ──

export const InlinePrimitive: StoryObj = {
  name: "Inline",
  render: () => (
    <Inline gap="3" wrap>
      {Array.from({ length: 8 }, (_, i) => `chip-${i}`).map((id, i) => (
        <Box key={id} bg="raised" border="subtle" p="3">
          chip {i + 1}
        </Box>
      ))}
    </Inline>
  ),
};

// ── Grid ──

export const GridPrimitive: StoryObj = {
  name: "Grid",
  render: () => (
    <Grid cols={1} mdCols={3} gap="4">
      <Box bg="raised" border="subtle" p="4">
        a
      </Box>
      <Box bg="raised" border="subtle" p="4">
        b
      </Box>
      <Box bg="raised" border="subtle" p="4">
        c
      </Box>
    </Grid>
  ),
};

// ── Box ──

export const BoxPrimitive: StoryObj = {
  name: "Box",
  render: () => (
    <Box bg="raised" border="subtle" p="6" rounded="xl">
      raised box with subtle border
    </Box>
  ),
};

// ── Divider ──

export const DividerPrimitive: StoryObj = {
  name: "Divider",
  render: () => (
    <Stack gap="4">
      <Box bg="raised" border="subtle" p="3">
        above
      </Box>
      <Divider />
      <Box bg="raised" border="subtle" p="3">
        below
      </Box>
    </Stack>
  ),
};

// ── Page ──

export const PagePrimitive: StoryObj = {
  name: "Page",
  render: () => (
    <Page variant="narrow" py="8">
      <Box bg="raised" border="subtle" p="6">
        Page constrains route width — variant="narrow" (48rem). Routes never set max-w-* themselves.
      </Box>
    </Page>
  ),
};
