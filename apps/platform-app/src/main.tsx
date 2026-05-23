import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ensureDefaultWorkbook } from "./lib/workbooks";
import { migrateOrphanTables } from "./lib/tables";

// One-time migration: orphan tables (created before Workbooks landed)
// get swept into the default workbook on first boot.
{
  const def = ensureDefaultWorkbook();
  migrateOrphanTables(def.id);
}

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
