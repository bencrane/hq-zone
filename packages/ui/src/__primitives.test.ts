import { expect, test } from "bun:test";
import * as primitives from "./index";

// Minimal smoke test — confirms the package's public surface exists. Storybook
// handles render/visual coverage.

const expected = [
  // Layout sub-layer
  "Stack",
  "Inline",
  "Grid",
  "Box",
  "Divider",
  "Page",
  // Visual sub-layer
  "Text",
  "Card",
  "Badge",
  "Button",
];

for (const name of expected) {
  test(`exports ${name}`, () => {
    expect((primitives as Record<string, unknown>)[name]).toBeDefined();
  });
}

test("cx utility exported", () => {
  expect(typeof primitives.cx).toBe("function");
});

test("cx merges classes", () => {
  const result = primitives.cx("a", "b", false, "c");
  expect(result).toContain("a");
  expect(result).toContain("b");
  expect(result).toContain("c");
});
