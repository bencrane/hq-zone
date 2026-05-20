/**
 * App — the platform-app router shell.
 *
 * One route this cycle: `/` → the catalyst map demo. The authenticated
 * capital-partner portal is a later cycle (deliberately out of scope) — the
 * platform-app ships as the interactive map demo, nothing more.
 */

import { Route, Routes } from "react-router-dom";
import MapDemo from "./routes/MapDemo";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MapDemo />} />
    </Routes>
  );
}
