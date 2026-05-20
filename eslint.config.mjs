// Flat ESLint config — scoped to route files for the `no-route-geometry` rule.
// Biome remains the project's primary linter/formatter; ESLint exists only to
// host custom AST rules biome doesn't support.
//
// The `files` glob covers every app's route directory (`apps/*/src/routes/`).
// Both `marketing-site` and `platform-app` author route files there; the
// `no-route-geometry` rule enforces that routes describe content, not page
// geometry. The rule is also exercised by its own unit test in
// `packages/eslint-plugin-rare-structure-hq`.

import tsParser from "@typescript-eslint/parser";
import rareStructurePlugin from "eslint-plugin-rare-structure-hq";

export default [
  {
    files: ["apps/*/src/routes/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "rare-structure-hq": rareStructurePlugin,
    },
    rules: {
      "rare-structure-hq/no-route-geometry": "error",
    },
  },
];
