/**
 * MapDemo — the catalyst map demo route.
 *
 * The whole demo surface (`DemoApp`) is a self-contained component tree under
 * `src/demo/**`. This route file is a thin mount point and authors no page
 * geometry — the `no-route-geometry` discipline: the wrapper carries only
 * viewport sizing, never `max-w-*` / `mx-auto` / route padding / `gap-*`.
 */

import { DemoApp } from "@/demo/DemoApp";

export default function MapDemo() {
  return (
    <div className="h-screen w-full">
      <DemoApp />
    </div>
  );
}
