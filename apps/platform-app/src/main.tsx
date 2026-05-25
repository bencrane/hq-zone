import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@radix-ui/themes/styles.css";
import "./index.css";

import { Theme } from "@radix-ui/themes";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { migrateOrphanTables } from "./lib/tables";
import { ensureDefaultWorkbook } from "./lib/workbooks";

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
    <Theme appearance="dark" accentColor="gray" grayColor="mauve" radius="medium" scaling="95%">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Theme>
  </React.StrictMode>,
);
