import { defineConfig } from "vitest/config";

// No `environment: "jsdom"` and no setup file, on purpose: packages/core is pure TypeScript
// (AGENTS.md §4, ADR-0011). Running its tests in a Node environment means a browser API would
// throw here rather than silently work, which is a second net under the ESLint `coreIsolation`
// rule and the purity assertions in tests/will/contract.test.ts.
export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
