import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@veille/core/ports": new URL("../../packages/core/src/ports/index.ts", import.meta.url)
        .pathname,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    css: false,
    exclude: ["e2e/**", "node_modules/**"],
  },
});
