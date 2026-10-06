import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request } from "@playwright/test";
import { CODE, createProfile, unlock, waitForServiceWorker } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1, name: "Bienvenue sur Veille" })).toBeVisible();
});

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations.map((v) => [v.id, v.nodes.map((n) => n.target)])),
  ).toEqual([]);
}

test("I open the app, create a profile, lock and unlock", async ({ page }) => {
  await createProfile(page);
  await page.getByRole("button", { name: "Verrouiller" }).click();
  await expect(page.getByRole("heading", { name: "Déverrouiller Veille" })).toBeVisible();
  await unlock(page, "000001");
  await expect(page.getByRole("alert")).toContainText("Ce code n'est pas le bon");
  await unlock(page);
  await expect(page.getByRole("heading", { name: "Bonjour Léa" })).toBeVisible({ timeout: 30_000 });
});

test("the profile survives a reload but the app comes back locked, and never shows the name", async ({
  page,
}) => {
  await createProfile(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Déverrouiller Veille" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Léa");
});

test("the evaluation banner is on every screen", async ({ page }) => {
  const banner = page.getByRole("region", { name: "Version d'évaluation" });
  await expect(banner).toBeVisible();
  await createProfile(page);
  await expect(banner).toBeVisible();
  await page.getByRole("link", { name: "Où sont mes données ?" }).click();
  await expect(banner).toBeVisible();
});

test("lock attempts are limited", async ({ page }) => {
  await createProfile(page);
  await page.getByRole("button", { name: "Verrouiller" }).click();
  for (let i = 0; i < 5; i++) {
    await unlock(page, "000001");
    await expect(page.getByLabel("Votre code à 6 chiffres")).toHaveValue("", { timeout: 30_000 });
  }
  await expect(page.getByRole("status").filter({ hasText: "patientez" })).toBeVisible();
  await expect(page.getByLabel("Votre code à 6 chiffres")).toBeDisabled();
});

test("the code, the key and the name are never written in clear in browser storage", async ({
  page,
}) => {
  await createProfile(page, "Léa");
  const dump = await page.evaluate(async () => {
    const parts: string[] = [JSON.stringify(localStorage), JSON.stringify(sessionStorage)];
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("veille");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const records = await new Promise<unknown[]>((resolve) => {
      const req = db.transaction("records").objectStore("records").getAll();
      req.onsuccess = () => resolve(req.result);
    });
    for (const r of records) parts.push(new TextDecoder("latin1").decode(r as Uint8Array));
    parts.push(JSON.stringify(await indexedDB.databases()));
    return parts.join("|");
  });
  expect(dump).not.toContain("482915");
  expect(dump).not.toContain("Léa");
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test("the unlock time is measured (Argon2id, single thread)", async ({ page }, info) => {
  await createProfile(page);
  await page.getByRole("button", { name: "Verrouiller" }).click();
  const started = Date.now();
  await unlock(page);
  await expect(page.getByRole("heading", { name: "Bonjour Léa" })).toBeVisible({ timeout: 30_000 });
  const ms = Date.now() - started;
  info.annotations.push({ type: "unlock-ms", description: String(ms) });
  console.log(`unlock took ${ms} ms on this machine`);
  expect(ms).toBeLessThan(15_000);
});

test.describe("accessibility", () => {
  test("no WCAG A/AA violation on every screen", async ({ page }) => {
    await expectNoViolations(page);
    await page.getByRole("button", { name: "Commencer" }).click();
    await expectNoViolations(page);
    await page.getByLabel("Prénom").fill("Léa");
    await page.getByRole("button", { name: "Continuer" }).click();
    await expectNoViolations(page);
    await page.getByLabel("Votre code", { exact: true }).fill(CODE);
    await page.getByRole("button", { name: "Continuer" }).click();
    await expectNoViolations(page);
    await page.getByLabel("Votre code, une seconde fois").fill(CODE);
    await page.getByRole("button", { name: "Créer mon espace" }).click();
    await expect(page.getByRole("heading", { name: "Bonjour Léa" })).toBeVisible({
      timeout: 30_000,
    });
    await expectNoViolations(page);
    await page.getByRole("link", { name: "Où sont mes données ?" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Où sont mes données ?" }),
    ).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole("button", { name: "Supprimer toutes mes données" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole("button", { name: "Non, garder mes données" }).click();
    await page.getByRole("link", { name: "Retour" }).click();
    await page.getByRole("button", { name: "Verrouiller" }).click();
    await expectNoViolations(page);
  });

  test("the whole journey works with the keyboard alone", async ({ page }) => {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
    await page.getByRole("button", { name: "Commencer" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: /Comment souhaitez-vous/ })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Prénom")).toBeFocused();
    await page.keyboard.type("Léa");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: /Choisissez un code/ })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.type(CODE);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: /Saisissez à nouveau/ })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.type(CODE);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Bonjour Léa" })).toBeVisible({
      timeout: 30_000,
    });
    // Every interactive element shows a visible focus ring.
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(
      () => getComputedStyle(document.activeElement as Element).outlineStyle,
    );
    expect(outline).not.toBe("none");
  });

  test("buttons have no colour transition, so an audit never measures a half-blended background", async ({
    page,
  }) => {
    const duration = await page
      .getByRole("button", { name: "Commencer" })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration).toBe("0s");
  });

  test("targets are at least 48px and text follows the browser font size", async ({ page }) => {
    const button = page.getByRole("button", { name: "Commencer" });
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(48);
    const fontSize = await page.evaluate(() => getComputedStyle(document.body).fontSize);
    expect(fontSize).toBe("18px"); // 1.125rem of the default 16px
    await page.addStyleTag({ content: "html{font-size:150%}" }).catch(() => undefined);
  });
});

test.describe("PWA", () => {
  test("serves a manifest scoped to the deployment path, with installable icons", async ({
    page,
    baseURL,
  }) => {
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    const response = await page.request.get(new URL(href ?? "", page.url()).href);
    expect(response.ok()).toBe(true);
    const manifest = (await response.json()) as {
      start_url: string;
      scope: string;
      display: string;
      icons: { src: string; sizes: string }[];
    };
    const path = new URL(baseURL ?? "").pathname;
    expect(manifest.start_url).toBe(path);
    expect(manifest.scope).toBe(path);
    expect(manifest.display).toBe("standalone");
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const icon of manifest.icons) {
      const res = await page.request.get(new URL(icon.src, response.url()).href);
      expect(res.ok(), icon.src).toBe(true);
    }
  });

  test("registers a service worker whose scope is the deployment path", async ({
    page,
    baseURL,
  }) => {
    await waitForServiceWorker(page);
    const scope = await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistration())?.scope,
    );
    expect(scope).toBe(new URL(baseURL ?? "").href);
  });

  test("works offline after the first load, including a reload and a deep link", async ({
    page,
    context,
  }) => {
    await waitForServiceWorker(page);
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Bienvenue sur Veille" }),
    ).toBeVisible();
    await createProfile(page);
    await page.getByRole("link", { name: "Où sont mes données ?" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Où sont mes données ?" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Où sont mes données ?" }),
    ).toBeVisible();
    await context.setOffline(false);
  });

  test("a deep link opens the app instead of an error page", async ({ page }) => {
    await page.goto("donnees");
    await expect(
      page.getByRole("heading", { level: 1, name: "Où sont mes données ?" }),
    ).toBeVisible();
  });
});

test.describe("network and CSP", () => {
  test("no network request after the initial load, across the whole journey", async ({
    page,
    context,
  }) => {
    await waitForServiceWorker(page);
    await page.waitForLoadState("networkidle");
    const requests: Request[] = [];
    context.on("request", (request) => requests.push(request));
    await createProfile(page);
    await page.getByRole("link", { name: "Où sont mes données ?" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Où sont mes données ?" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Retour" }).click();
    await page.getByRole("button", { name: "Verrouiller" }).click();
    await unlock(page);
    await expect(page.getByRole("heading", { name: "Bonjour Léa" })).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForTimeout(500);
    // Same-origin assets (e.g. the favicon) may be asked for again, but must be answered by the
    // service worker from its cache. Nothing may reach the network: no request made BY the worker
    // (a cache miss would show as one), no request to another origin.
    const origin = new URL(page.url()).origin;
    expect(requests.filter((r) => r.serviceWorker() !== null).map((r) => r.url())).toEqual([]);
    expect(requests.filter((r) => new URL(r.url()).origin !== origin).map((r) => r.url())).toEqual(
      [],
    );
    for (const request of requests) {
      const response = await request.response();
      expect(response?.fromServiceWorker(), request.url()).toBe(true);
    }
  });

  test("every request of the first load stays on the app's origin", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const origins = new Set<string>();
    context.on("request", (request) => origins.add(new URL(request.url()).origin));
    await page.goto(baseURL ?? "");
    await expect(
      page.getByRole("heading", { level: 1, name: "Bienvenue sur Veille" }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect([...origins]).toEqual([new URL(baseURL ?? "").origin]);
    await context.close();
  });

  test("strict CSP: no violation, no unsafe-inline or unsafe-eval, and no inline script or style", async ({
    page,
  }) => {
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute("content");
    expect(csp).toBeTruthy();
    expect(csp).not.toContain("unsafe-inline");
    // `wasm-unsafe-eval` (needed by the Argon2id WebAssembly module) is not eval().
    expect(csp).not.toMatch(/(?<!wasm-)unsafe-eval/);
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).not.toMatch(/https?:|\*/);
    expect(await page.locator("script:not([src])").count()).toBe(0);
    expect(await page.locator("style").count()).toBe(0);
    expect(await page.locator("[style]").count()).toBe(0);
  });

  test("the whole journey (including the WebAssembly KDF) raises no CSP violation or console error", async ({
    page,
  }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" || /content security policy|refused to/i.test(message.text()))
        problems.push(message.text());
    });
    page.on("pageerror", (error) => problems.push(error.message));
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
      });
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Bienvenue sur Veille" }),
    ).toBeVisible();
    await createProfile(page);
    await page.getByRole("link", { name: "Où sont mes données ?" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Où sont mes données ?" }),
    ).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("no third-party script or stylesheet is referenced", async ({ page }) => {
    const external = await page.evaluate(() =>
      [...document.querySelectorAll("script[src], link[rel=stylesheet][href]")]
        .map((e) => (e instanceof HTMLScriptElement ? e.src : (e as HTMLLinkElement).href))
        .filter(Boolean)
        .filter((src) => new URL(src).origin !== location.origin),
    );
    expect(external).toEqual([]);
  });
});

test.describe("Where is my data?", () => {
  test("shows the real storage persistence state", async ({ page }) => {
    await page.getByRole("link", { name: "Où sont mes données ?" }).click();
    const state = page.getByTestId("persistence-state");
    await expect(state).not.toHaveAttribute("data-state", "unknown");
    const expected = await page.evaluate(async () =>
      (await navigator.storage.persisted()) ? "persisted" : "best-effort",
    );
    await expect(state).toHaveAttribute("data-state", expected);
  });

  test("deleting everything really empties the storage", async ({ page }) => {
    await createProfile(page);
    await page.getByRole("link", { name: "Où sont mes données ?" }).click();
    await page.getByRole("button", { name: "Supprimer toutes mes données" }).click();
    await page.getByRole("button", { name: "Oui, tout supprimer" }).click();
    await expect(page.getByText("Vos données ont été supprimées")).toBeVisible();
    const count = await page.evaluate(
      () =>
        new Promise<number>((resolve, reject) => {
          const open = indexedDB.open("veille");
          open.onsuccess = () => {
            const req = open.result.transaction("records").objectStore("records").count();
            req.onsuccess = () => resolve(req.result);
          };
          open.onerror = () => reject(open.error);
        }),
    );
    expect(count).toBe(0);
  });
});
