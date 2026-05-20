import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@rare-structure-hq/shared": path.resolve(
        __dirname,
        "../../packages/shared/src/index.ts",
      ),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    fs: {
      // Monorepo: serve from the workspace root. Bun hoists deps into
      // node_modules/.bun/ at the repo root — Fontsource fonts, the
      // generated tokens CSS, and Vite's own client runtime live there.
      // Without this, Vite's default allow list is scoped to this app
      // and blocks them (unstyled page).
      allow: [path.resolve(__dirname, "../..")],
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react")) return "react";
          if (id.includes("node_modules/framer-motion")) return "motion";
          if (id.includes("node_modules/lucide-react")) return "icons";
        },
      },
    },
  },
});
