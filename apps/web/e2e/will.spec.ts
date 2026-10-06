import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request } from "@playwright/test";
import { CODE, createProfile, unlock, waitForServiceWorker } from "./helpers";
import {
  answer,
  backToHub,
  deriveKek,
  dumpBrowserStorage,
  encodings,
  fillDraft,
  fillWishes,
  findIn,
  next,
  openLegs,
  SENTINELS,
  startCard,
  waitSaved,
} from "./will-helpers";

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

async function readDownload(page: Page, click: () => Promise<void>) {
  const [download] = await Promise.all([page.waitForEvent("download"), click()]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return { name: download.suggestedFilename(), bytes: Buffer.concat(chunks) };
}

test.describe("the will journey", () => {
  test("a person with nothing special completes the whole journey and gets two distinct PDFs", async ({
    page,
  }, info) => {
    await createProfile(page);
    const started = Date.now();
    await openLegs(page);
    const { screens } = await fillDraft(page);
    await expect(page.getByText("Tout est complet selon notre checklist")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/\bvalide?s?\b/i);
    await expect(page.getByText("Dernière étape : faire relire chez un notaire")).toBeVisible();

    await backToHub(page);
    await fillWishes(page);
    await page.getByRole("link", { name: "Obtenir mes documents (PDF)" }).click();

    const draft = await readDownload(page, () =>
      page.getByRole("button", { name: "Télécharger le brouillon à recopier (PDF)" }).click(),
    );
    const wishes = await readDownload(page, () =>
      page.getByRole("button", { name: "Télécharger mes volontés (PDF)" }).click(),
    );
    expect(draft.name).toBe("brouillon-testament-a-recopier.pdf");
    expect(wishes.name).toBe("document-de-volontes.pdf");
    expect(draft.bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(wishes.bytes.subarray(0, 5).toString()).toBe("%PDF-");
    const text = (b: Buffer) => b.toString("latin1");
    expect(text(draft.bytes)).toContain(SENTINELS.name);
    expect(text(draft.bytes)).toContain("Je laisse \xe0 Alex Exemple");
    expect(text(draft.bytes)).not.toContain("sentinelle 9981");
    expect(text(wishes.bytes)).toContain("C\xe9r\xe9monie sentinelle 9981");
    expect(text(wishes.bytes)).not.toContain(SENTINELS.name);
    expect(draft.bytes.equals(wishes.bytes)).toBe(false);

    // The automated walk-through is only a floor for the "under 15 minutes" criterion: the real
    // measure is the user test. What it does prove is the length of the journey.
    const ms = Date.now() - started;
    info.annotations.push({ type: "draft-screens", description: String(screens) });
    info.annotations.push({ type: "scripted-journey-ms", description: String(ms) });
    console.log(
      `draft flow: ${screens} screens; scripted journey (draft + wishes + PDF): ${ms} ms`,
    );
    expect(screens).toBeLessThanOrEqual(25);
  });

  test("a situation that needs a professional blocks the review and offers no text to copy", async ({
    page,
  }) => {
    await createProfile(page);
    await openLegs(page);
    await fillDraft(page, { children: true });
    await expect(
      page.getByText(/Vous avez des enfants\. La loi leur réserve une part/),
    ).toBeVisible();
    await expect(page.getByText("À faire voir par un professionnel").first()).toBeVisible();
    await expect(
      page.getByText(/vous devez voir un notaire avant d'aller plus loin/),
    ).toBeVisible();
    await expect(page.getByText("Tout est complet selon notre checklist")).toHaveCount(0);
    await page.getByRole("link", { name: "Obtenir mes documents (PDF)" }).click();
    await expect(
      page.getByRole("button", { name: "Télécharger le brouillon à recopier (PDF)" }),
    ).toHaveCount(0);
    await expect(page.getByText(/cette partie demande l'avis d'un professionnel/)).toBeVisible();
  });

  test("answers are saved automatically and survive a reload and a new unlock", async ({
    page,
  }) => {
    await createProfile(page);
    await openLegs(page);
    await startCard(page, "Brouillon de testament à recopier à la main");
    await page.getByLabel("Prénom(s) et nom").fill(SENTINELS.name);
    await waitSaved(page);
    await page.reload();
    await unlock(page);
    await expect(page.getByLabel("Prénom(s) et nom")).toHaveValue(SENTINELS.name, {
      timeout: 30_000,
    });
  });

  test("the permanent warning is on every screen of the journey and cannot be dismissed", async ({
    page,
  }) => {
    await createProfile(page);
    await openLegs(page);
    const warning = page.getByTestId("will-disclaimer");
    const seen: string[] = [];
    const check = async () => {
      await expect(warning).toBeVisible();
      await expect(warning).toContainText("Veille ne remplace pas un notaire");
      await expect(warning).toContainText("n'est pas un testament");
      expect(await warning.getByRole("button").count()).toBe(0);
      seen.push(page.url());
    };
    await check();
    await startCard(page, "Brouillon de testament à recopier à la main");
    await check();
    await next(page);
    await check(); // a choice screen
    await backToHub(page);
    for (const name of [
      "Faire le point",
      "Obtenir mes documents (PDF)",
      "Historique des versions",
    ]) {
      await page.getByRole("link", { name }).first().click();
      await check();
      await backToHub(page);
    }
    expect(new Set(seen).size).toBeGreaterThanOrEqual(5);
  });

  test("each finished part leaves a version in the history", async ({ page }) => {
    await createProfile(page);
    await openLegs(page);
    await fillDraft(page);
    await backToHub(page);
    await page.getByRole("link", { name: "Historique des versions" }).click();
    await expect(page.getByText(/^Version 1 — /)).toBeVisible();
    await page.getByText(/^Version 1 — /).click();
    await expect(page.getByText(/Empreinte : [0-9a-f]{12}/)).toBeVisible();
    await expect(page.getByText(SENTINELS.provision)).toBeVisible();
    await expect(page.getByText(/ne constitue pas une preuve juridique/)).toBeVisible();
  });
});

test.describe("encryption at rest", () => {
  async function journeyWithSentinels(page: Page) {
    await createProfile(page);
    await openLegs(page);
    await fillDraft(page);
    await backToHub(page);
    await fillWishes(page);
    await waitSaved(page);
  }

  test("no text typed by the user is stored in clear in IndexedDB, OPFS, Web Storage or the cache", async ({
    page,
  }) => {
    await journeyWithSentinels(page);
    const blobs = await dumpBrowserStorage(page);

    // Something was really stored (the test is not vacuous)…
    const records = blobs.filter((b) => b.where.startsWith("idb:veille/records/will/"));
    expect(records.map((r) => r.where).sort()).toEqual([
      "idb:veille/records/will/will-draft",
      "idb:veille/records/will/wishes-document",
    ]);
    for (const r of records) expect(Buffer.from(r.base64, "base64").length).toBeGreaterThan(100);

    // …and none of what the user typed appears anywhere.
    const needles = [
      ...Object.values(SENTINELS).flatMap((s) => encodings(s)),
      ...encodings("Contrats"),
      ...encodings("Mes proches"),
      ...encodings("Personne"),
      ...encodings("testatorFullName"),
      ...encodings("funeralWishes"),
    ];
    // The service worker cache holds the application's own code, which legitimately contains field
    // names; only user data is searched for there.
    const userDataBlobs = blobs.filter((b) => !b.where.startsWith("cache:"));
    expect(findIn(userDataBlobs, needles)).toEqual([]);
    expect(
      findIn(
        blobs.filter((b) => b.where.startsWith("cache:")),
        Object.values(SENTINELS).flatMap((s) => encodings(s)),
      ),
    ).toEqual([]);

    // Web Storage and OPFS are not used at all.
    expect(blobs.find((b) => b.where === "localStorage")?.base64).toBe(
      Buffer.from("{}").toString("base64"),
    );
    expect(blobs.find((b) => b.where === "sessionStorage")?.base64).toBe(
      Buffer.from("{}").toString("base64"),
    );
    expect(blobs.filter((b) => b.where.startsWith("opfs:"))).toEqual([]);
  });

  test("the KEK and the code are written nowhere, before or after unlocking again", async ({
    page,
  }) => {
    await journeyWithSentinels(page);
    const kek = await deriveKek(await dumpBrowserStorage(page), CODE);
    expect(kek.length).toBe(32);
    const needles = [...encodings(kek), ...encodings(CODE)];

    const unlocked = await dumpBrowserStorage(page);
    expect(findIn(unlocked, needles)).toEqual([]);

    await page.getByRole("button", { name: "Verrouiller" }).click();
    await unlock(page);
    // Unlocking brings the user back to the screen they were on.
    await expect(page.getByRole("heading", { level: 1, name: "Faire le point" })).toBeVisible({
      timeout: 30_000,
    });
    expect(findIn(await dumpBrowserStorage(page), needles)).toEqual([]);

    // Locking really drops access: nothing of the will can be shown without the code.
    await page.getByRole("button", { name: "Verrouiller" }).click();
    await expect(page.getByRole("heading", { name: "Déverrouiller Veille" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(SENTINELS.name);
    await expect(page.locator("body")).not.toContainText(SENTINELS.provision);
  });

  test("each document has its own wrapped data key, and a record cannot be swapped for another", async ({
    page,
  }) => {
    await journeyWithSentinels(page);
    const blobs = await dumpBrowserStorage(page);
    const read = (name: string) =>
      JSON.parse(
        Buffer.from(
          blobs.find((b) => b.where === `idb:veille/records/will/${name}`)!.base64,
          "base64",
        ).toString(),
      ) as { wrappedDek: { ciphertext: string } };
    expect(read("will-draft").wrappedDek.ciphertext).not.toBe(
      read("wishes-document").wrappedDek.ciphertext,
    );

    // Put the draft's record under the wishes' key: the app must refuse to read it.
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("veille");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const store = (mode: IDBTransactionMode) =>
        db.transaction("records", mode).objectStore("records");
      const draft = await new Promise<unknown>((r) => {
        const q = store("readonly").get("will/will-draft");
        q.onsuccess = () => r(q.result);
      });
      await new Promise<void>((r) => {
        const q = store("readwrite").put(draft, "will/wishes-document");
        q.onsuccess = () => r();
      });
      db.close();
    });
    await page.reload();
    await unlock(page);
    await expect(page.getByText("Impossible de relire vos documents")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { level: 1, name: "Faire le point" })).toHaveCount(0);
    await expect(page.getByTestId("will-disclaimer")).toBeVisible();
  });
});

test.describe("network and CSP", () => {
  test("nothing leaves the device during the whole will journey, including the downloads", async ({
    page,
    context,
  }) => {
    await waitForServiceWorker(page);
    await page.waitForLoadState("networkidle");
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" || /content security policy|refused to/i.test(m.text()))
        problems.push(m.text());
    });
    page.on("pageerror", (e) => problems.push(e.message));
    await page.addInitScript(() =>
      document.addEventListener("securitypolicyviolation", (e) =>
        console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`),
      ),
    );
    const requests: Request[] = [];
    context.on("request", (r) => requests.push(r));

    await createProfile(page);
    await openLegs(page);
    await fillDraft(page);
    await backToHub(page);
    await fillWishes(page);
    await page.getByRole("link", { name: "Obtenir mes documents (PDF)" }).click();
    await readDownload(page, () =>
      page.getByRole("button", { name: "Télécharger le brouillon à recopier (PDF)" }).click(),
    );
    await readDownload(page, () =>
      page.getByRole("button", { name: "Télécharger mes volontés (PDF)" }).click(),
    );

    const origin = new URL(page.url()).origin;
    expect(requests.filter((r) => r.serviceWorker() !== null).map((r) => r.url())).toEqual([]);
    expect(
      requests
        .filter((r) => !r.url().startsWith("blob:") && new URL(r.url()).origin !== origin)
        .map((r) => r.url()),
    ).toEqual([]);
    expect(problems).toEqual([]);
  });

  test("the journey works offline after the first load", async ({ page, context }) => {
    await waitForServiceWorker(page);
    await context.setOffline(true);
    await page.reload();
    await createProfile(page);
    await openLegs(page);
    await startCard(page, "Brouillon de testament à recopier à la main");
    await page.getByLabel("Prénom(s) et nom").fill(SENTINELS.name);
    await waitSaved(page);
    await context.setOffline(false);
  });
});

test.describe("accessibility of the will journey", () => {
  test("no WCAG A/AA violation on the screens of the journey", async ({ page }) => {
    await createProfile(page);
    await openLegs(page);
    await expectNoViolations(page); // hub
    await startCard(page, "Brouillon de testament à recopier à la main");
    await expectNoViolations(page); // text screen
    await next(page);
    await expectNoViolations(page); // choice screen
    await answer(page, "Célibataire");
    await expectNoViolations(page); // yes/no screen
    await backToHub(page);
    await fillDraft(page, { children: true });
    await expectNoViolations(page); // review with a blocking case
    await page.getByRole("link", { name: "Obtenir mes documents (PDF)" }).click();
    await expectNoViolations(page); // export, blocked
    await backToHub(page);
    await page.getByRole("link", { name: "Historique des versions" }).click();
    await expectNoViolations(page);
    await backToHub(page);
    await startCard(page, "Mes volontés (hors testament)");
    await expectNoViolations(page); // long text screen
    await page.getByLabel("Vos souhaits").fill("x");
    await next(page);
    await next(page);
    await expectNoViolations(page); // 'add a message' screen
  });

  test("a whole question can be answered with the keyboard alone, focus following the question", async ({
    page,
  }) => {
    await createProfile(page);
    await openLegs(page);
    await page.getByRole("link", { name: /Commencer — Brouillon/ }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 1, name: "Quel est votre nom complet ?" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Prénom(s) et nom")).toBeFocused();
    await page.keyboard.type("Personne Fictive");
    await page.keyboard.press("Enter"); // submits the form: next question
    await expect(
      page.getByRole("heading", { level: 1, name: /situation familiale/ }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("radio").first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: "Marié(e)" })).toBeChecked();
  });

  test("on a small screen the question stays readable and every control is at least 48px", async ({
    page,
  }) => {
    await createProfile(page);
    await openLegs(page);
    await startCard(page, "Brouillon de testament à recopier à la main");
    await next(page);
    for (const radio of await page.getByRole("radio").all()) {
      const box = await radio.locator("xpath=ancestor::label").boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(48);
    }
    for (const button of await page.getByRole("button").all()) {
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(48);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });
});
