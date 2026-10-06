// Shared ESLint config. The one rule that must never regress: packages/core is
// framework- and browser-free (AGENTS.md §4, ADR-0011), enforced here, not by discipline.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

const BROWSER_GLOBALS = [
  "window",
  "document",
  "navigator",
  "indexedDB",
  "crypto",
  "localStorage",
  "sessionStorage",
  "self",
  "fetch",
  "location",
  "history",
  "caches",
  "Worker",
  "XMLHttpRequest",
  "WebAssembly",
].map((name) => ({ name, message: "packages/core must not use browser APIs (ADR-0011)." }));

export const coreIsolation = {
  files: ["packages/core/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-globals": ["error", ...BROWSER_GLOBALS],
    "no-restricted-properties": [
      "error",
      ...["window", "globalThis", "self"].flatMap((object) =>
        [
          "window",
          "document",
          "indexedDB",
          "crypto",
          "localStorage",
          "sessionStorage",
          "navigator",
        ].map((property) => ({
          object,
          property,
          message: "packages/core must not use browser APIs (ADR-0011).",
        })),
      ),
    ],
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["react", "react/*", "react-dom", "react-dom/*", "react-router*"],
            message: "packages/core must not import React.",
          },
          {
            group: ["@veille/ui", "@veille/ui/*", "**/apps/**"],
            message: "packages/core must not depend on UI or apps.",
          },
        ],
      },
    ],
  },
};

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "docs/**",
      "tools/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": "allow-with-description" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      // A leading underscore marks an intentionally unused binding (e.g. omitted destructured keys).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["apps/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    languageOptions: { globals: { ...globals.browser } },
    rules: { ...reactHooks.configs.recommended.rules, ...jsxA11y.flatConfigs.recommended.rules },
  },
  {
    // The service worker is plain JS run in a ServiceWorkerGlobalScope; the build injects __PRECACHE__.
    files: ["apps/web/sw/**/*.js"],
    languageOptions: { globals: { ...globals.serviceworker, __PRECACHE__: "readonly" } },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    rules: {
      // AGENTS.md §4: no hard-coded UI strings in components — go through i18n keys.
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXText[value=/[A-Za-zÀ-ÿ]{2,}/]",
          message: "Hard-coded UI text: use an i18n key.",
        },
      ],
    },
  },
  coreIsolation,
];
