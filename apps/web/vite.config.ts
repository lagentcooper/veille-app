import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { veillePwa } from "./vite/pwa-plugin";

// The app is served from a sub-path on GitHub Pages (ADR-0012). Base, manifest scope and
// service-worker scope must all be /veille-app/.
export default defineConfig({
  base: "/veille-app/",
  plugins: [react(), veillePwa()],
  resolve: {
    alias: {
      "@veille/core/ports": new URL("../../packages/core/src/ports/index.ts", import.meta.url)
        .pathname,
      "@veille/core/will": new URL("../../packages/core/src/will/index.ts", import.meta.url)
        .pathname,
    },
  },
  build: {
    target: "es2022",
    assetsInlineLimit: 0, // no data: URIs — the CSP does not allow them
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
  },
});
