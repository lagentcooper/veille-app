import { expect, type Page } from "@playwright/test";
import { argon2id } from "hash-wasm";

/** Fictitious sentinels: if one of them shows up in storage, something was written in clear. */
export const SENTINELS = {
  name: "Zoé Sentinelle",
  beneficiary: "Alex Exemple",
  provision: "Mon vélo secret 4217",
  funeral: "Cérémonie sentinelle 9981",
  message: "Message sentinelle 5530",
  paperLocation: "Classeur sentinelle 7714",
} as const;

const NEXT = /^(Continuer|Passer cette question|Terminer)$/;

export async function openLegs(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Ouvrir" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mon document de legs" })).toBeVisible();
}

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

/** Clicks the main button, then waits until the screen really changed. */
export async function next(page: Page): Promise<void> {
  const before = await heading(page).innerText();
  await page.getByRole("button", { name: NEXT }).click();
  await expect(heading(page)).not.toHaveText(before);
}

export async function answer(page: Page, label: string): Promise<void> {
  await page.getByRole("radio", { name: label, exact: true }).check();
  await next(page);
}

export async function startCard(page: Page, title: string): Promise<void> {
  const card = page.getByRole("region", { name: title });
  await card.getByRole("link").click();
}

/** Counts the screens crossed, to report the length of the journey. */
export interface Counter {
  screens: number;
}

/**
 * Walks the draft flow for a person with nothing that needs a professional (or, with `children`,
 * a person with a child). Every sentinel typed here is later searched for in the browser storage.
 */
export async function fillDraft(page: Page, opts: { children?: boolean } = {}): Promise<Counter> {
  const c: Counter = { screens: 0 };
  const step = async (fn: () => Promise<void>) => {
    await fn();
    c.screens++;
  };
  await startCard(page, "Brouillon de testament à recopier à la main");
  await step(async () => {
    await page.getByLabel("Prénom(s) et nom").fill(SENTINELS.name);
    await next(page);
  });
  await step(() => answer(page, "Célibataire"));
  await step(() => answer(page, opts.children ? "Oui" : "Non")); // children
  if (opts.children) {
    await step(() => answer(page, "Non")); // minor children
    await step(() => answer(page, "Non")); // blended family
  }
  for (let i = 0; i < 6; i++) await step(() => answer(page, "Non")); // insurance … nationality
  await step(() => answer(page, "Non, aucune mesure"));
  await step(() => page.getByRole("button", { name: "Oui, ajouter quelqu'un" }).click());
  await step(async () => {
    await page.getByLabel("Nom de la personne ou de l'organisme").fill(SENTINELS.beneficiary);
    await next(page);
  });
  await step(() => answer(page, "Une personne"));
  await step(() => answer(page, "Non")); // minor
  await step(() => page.getByRole("button", { name: "Non, passer à la suite" }).click());
  await step(() => page.getByRole("button", { name: "Oui, ajouter une volonté" }).click());
  await step(async () => {
    await page.getByLabel("Ce que vous laissez").fill(SENTINELS.provision);
    await next(page);
  });
  await step(() => answer(page, "Non, rien de particulier"));
  await step(() => page.getByRole("button", { name: "Non, c'est tout" }).click());
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Terminer" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Faire le point" })).toBeVisible();
  c.screens++;
  return c;
}

export async function fillWishes(page: Page): Promise<void> {
  await startCard(page, "Mes volontés (hors testament)");
  await page.getByLabel("Vos souhaits").fill(SENTINELS.funeral);
  await next(page);
  await answer(page, "Non"); // body wishes
  await page.getByRole("button", { name: "Oui, ajouter un message" }).click();
  await page.getByLabel("Pour qui").fill("Mes proches");
  await next(page);
  await page.getByLabel("Votre message").fill(SENTINELS.message);
  await next(page);
  await page.getByRole("button", { name: "Non, passer à la suite" }).click();
  await page.getByRole("button", { name: "Oui, ajouter un papier" }).click();
  await page.getByLabel("Le papier ou le document").fill("Contrats");
  await next(page);
  await page.getByLabel("Son emplacement").fill(SENTINELS.paperLocation);
  await next(page);
  await page.getByRole("button", { name: "Non, j'ai terminé" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Faire le point" })).toBeVisible();
}

export async function backToHub(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Retour à mon document de legs" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mon document de legs" })).toBeVisible();
}

export async function waitSaved(page: Page): Promise<void> {
  await expect(page.getByRole("status").filter({ hasText: /Enregistré à/ })).toBeVisible();
}

export interface Blob64 {
  where: string;
  base64: string;
}

/** Everything the origin keeps on disk, as bytes: IndexedDB, OPFS, Web Storage, Cache Storage. */
export async function dumpBrowserStorage(page: Page): Promise<Blob64[]> {
  return page.evaluate(async () => {
    const toB64 = (bytes: Uint8Array) => {
      let s = "";
      for (const b of bytes) s += String.fromCharCode(b);
      return btoa(s);
    };
    const utf8 = (text: string) => toB64(new TextEncoder().encode(text));
    const out: { where: string; base64: string }[] = [];

    out.push({ where: "localStorage", base64: utf8(JSON.stringify({ ...localStorage })) });
    out.push({ where: "sessionStorage", base64: utf8(JSON.stringify({ ...sessionStorage })) });

    const dbs = await indexedDB.databases();
    out.push({ where: "indexedDB.databases", base64: utf8(JSON.stringify(dbs)) });
    for (const info of dbs) {
      if (!info.name) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(info.name as string);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      for (const store of Array.from(db.objectStoreNames)) {
        const tx = db.transaction(store);
        const os = tx.objectStore(store);
        const keys = await new Promise<IDBValidKey[]>((r) => {
          const q = os.getAllKeys();
          q.onsuccess = () => r(q.result);
        });
        const values = await new Promise<unknown[]>((r) => {
          const q = os.getAll();
          q.onsuccess = () => r(q.result);
        });
        out.push({ where: `idb:${info.name}/${store}:keys`, base64: utf8(JSON.stringify(keys)) });
        values.forEach((v, i) => {
          const bytes = v instanceof Uint8Array ? v : new TextEncoder().encode(JSON.stringify(v));
          out.push({ where: `idb:${info.name}/${store}/${String(keys[i])}`, base64: toB64(bytes) });
        });
      }
      db.close();
    }

    const walk = async (dir: FileSystemDirectoryHandle, path: string): Promise<void> => {
      // @ts-expect-error entries() is not in the DOM typings of this TypeScript version
      for await (const [name, handle] of dir.entries()) {
        out.push({ where: `opfs:${path}/${name}:name`, base64: utf8(name) });
        if (handle.kind === "file") {
          const file = await (handle as FileSystemFileHandle).getFile();
          out.push({
            where: `opfs:${path}/${name}`,
            base64: toB64(new Uint8Array(await file.arrayBuffer())),
          });
        } else await walk(handle as FileSystemDirectoryHandle, `${path}/${name}`);
      }
    };
    if (navigator.storage?.getDirectory) await walk(await navigator.storage.getDirectory(), "");

    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        out.push({ where: `cache:${name}:url`, base64: utf8(request.url) });
        const response = await cache.match(request);
        if (response)
          out.push({
            where: `cache:${request.url}`,
            base64: toB64(new Uint8Array(await response.arrayBuffer())),
          });
      }
    }
    return out;
  });
}

/** Re-derives the KEK exactly as the application does, to prove it is written nowhere. */
export async function deriveKek(blobs: Blob64[], code: string): Promise<Uint8Array> {
  const profile = blobs.find((b) => b.where === "idb:veille/records/profile/main");
  if (!profile) throw new Error("profile record not found");
  const stored = JSON.parse(Buffer.from(profile.base64, "base64").toString("utf8")) as {
    salt: string;
    kdf: { memoryKiB: number; iterations: number; parallelism: number };
  };
  return argon2id({
    password: code,
    salt: Buffer.from(stored.salt, "base64"),
    parallelism: stored.kdf.parallelism,
    iterations: stored.kdf.iterations,
    memorySize: stored.kdf.memoryKiB,
    hashLength: 32,
    outputType: "binary",
  });
}

/** Every representation in which a secret could plausibly be written down. */
export function encodings(secret: Uint8Array | string): Buffer[] {
  const raw = typeof secret === "string" ? Buffer.from(secret, "utf8") : Buffer.from(secret);
  return [
    raw,
    Buffer.from(raw.toString("hex"), "utf8"),
    Buffer.from(raw.toString("base64"), "utf8"),
    Buffer.from(raw.toString("base64url"), "utf8"),
    Buffer.from(JSON.stringify([...raw]), "utf8"),
  ];
}

/** Also decodes every base64 field found in JSON records, so a ciphertext cannot hide a plaintext. */
export function searchable(blob: Blob64): Buffer[] {
  const raw = Buffer.from(blob.base64, "base64");
  const text = raw.toString("latin1");
  const inner = [...text.matchAll(/"([A-Za-z0-9+/=]{16,})"/g)].map((m) =>
    Buffer.from(m[1]!, "base64"),
  );
  return [raw, ...inner];
}

export function findIn(blobs: Blob64[], needles: Buffer[]): string[] {
  const hits: string[] = [];
  for (const blob of blobs) {
    for (const hay of searchable(blob)) {
      for (const needle of needles) if (hay.includes(needle)) hits.push(blob.where);
    }
  }
  return hits;
}
