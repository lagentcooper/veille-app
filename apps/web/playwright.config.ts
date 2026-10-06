import { defineConfig, devices } from "@playwright/test";

// E2E_BASE_URL points the whole suite at a deployed copy (the GitHub Pages URL, ADR-0012).
// Without it, the suite runs against a local `vite preview` of the production build.
const deployed = process.env["E2E_BASE_URL"];
const baseURL = deployed ?? "http://localhost:4173/veille-app/";
const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"];

export default defineConfig({
  testDir: "e2e",
  outputDir: "../../tmp/playwright/results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "../../tmp/playwright/report" }]],
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Pixel 7"] } }],
  ...(deployed
    ? {}
    : {
        webServer: {
          command: "pnpm preview",
          url: baseURL,
          reuseExistingServer: !process.env["CI"],
          timeout: 60_000,
        },
      }),
});
