import { expect, type Page } from "@playwright/test";

export const CODE = "482915";

/** Waits until the page is controlled by the service worker (first load is then cached). */
export async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
          once: true,
        }),
      );
    }
  });
}

export async function createProfile(page: Page, firstName = "Léa", code = CODE): Promise<void> {
  await page.getByRole("button", { name: "Commencer" }).click();
  await page.getByLabel("Prénom").fill(firstName);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Votre code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Votre code, une seconde fois").fill(code);
  await page.getByRole("button", { name: "Créer mon espace" }).click();
  await expect(page.getByRole("heading", { name: `Bonjour ${firstName}` })).toBeVisible({
    timeout: 30_000,
  });
}

export async function unlock(page: Page, code = CODE): Promise<void> {
  await page.getByLabel("Votre code à 6 chiffres").fill(code);
  await page.getByRole("button", { name: "Déverrouiller" }).click();
}
