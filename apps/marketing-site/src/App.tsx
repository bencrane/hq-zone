/**
 * App — the marketing-site router shell.
 *
 * One route: `/` → the Rare Structure homepage. The shell is deliberately
 * thin; the site is a single institutional page.
 */

import { Route, Routes } from "react-router-dom";
import Home from "./routes/Home";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
