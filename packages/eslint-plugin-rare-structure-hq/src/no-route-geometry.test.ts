import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { noRouteGeometry } from "./no-route-geometry";

// Wire RuleTester into bun:test's globals.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = (it as unknown as { only?: typeof it }).only ?? it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
  },
});

const FILE = "/Users/x/rare-structure-hq/apps/platform-app/src/routes/Home.tsx";

ruleTester.run("no-route-geometry", noRouteGeometry, {
  valid: [
    {
      filename: FILE,
      code: `
export function Home() {
  return <Page variant="default"><h1>x</h1></Page>;
}`,
    },
    {
      filename: FILE,
      code: `
export function Home() {
  return <Page unsafe_className="mx-auto max-w-md"><h1>x</h1></Page>;
}`,
    },
    {
      // Not a route file — rule should not apply.
      filename: "/Users/x/rare-structure-hq/apps/platform-app/src/components/Foo.tsx",
      code: `
export function Foo() {
  return <div className="mx-auto max-w-3xl px-6 py-12" />;
}`,
    },
    {
      filename: FILE,
      code: `
export function Home() {
  return (
    <Page>
      <div className="gap-4 px-4">nested is fine</div>
    </Page>
  );
}`,
    },
  ],
  invalid: [
    {
      filename: FILE,
      code: `
export function Home() {
  return <div className="mx-auto max-w-3xl px-6 py-12">x</div>;
}`,
      errors: [{ messageId: "banned" }],
    },
    {
      filename: FILE,
      code: `
export function Home() {
  return <section className="px-6 py-8">x</section>;
}`,
      errors: [{ messageId: "banned" }],
    },
    {
      filename: FILE,
      code: `
export function Home() {
  return <div className="max-w-7xl">x</div>;
}`,
      errors: [{ messageId: "banned" }],
    },
  ],
});
