// @vitest-environment node
import {
  appendVersion,
  createEmptyWillDraft,
  createEmptyWishesDocument,
  createHistory,
  type WillDraft,
  type WishesDocument,
} from "@veille/core/will";
import { MemoryKeyStore } from "../../../adapters/memory-key-store";
import { IsoClock, WebCryptoHasher } from "../../../adapters/sha256-hasher";
import { WebCryptoProvider } from "../../../adapters/webcrypto-provider";
import { MemoryStorage, RecordingLogger } from "../../../test/doubles";
import { KEK_ALIAS } from "../../profile/data/profile-service";
import { WillLockedError, WillRepository, WillUnreadableError } from "./will-repository";

const FAST = { algorithm: "argon2id", memoryKiB: 64, iterations: 1, parallelism: 1 } as const;
const SALT = new Uint8Array(16).fill(5);
const crypto_ = new WebCryptoProvider();
const hasher = new WebCryptoHasher();
const env = { clock: new IsoClock(), hasher };

async function setup(code = "482915") {
  const storage = new MemoryStorage();
  const keys = new MemoryKeyStore();
  const logger = new RecordingLogger();
  keys.set(KEK_ALIAS, await crypto_.deriveKey(code, SALT, FAST));
  const repo = new WillRepository({ storage, crypto: crypto_, keys, hasher, logger });
  return { storage, keys, logger, repo };
}

/** Fictitious sentinel values, searched for in everything written to storage. */
const NAME = "Zoé Sentinelle";
const SECRET = "Mon-vélo-secret-4217";
const draft = (): WillDraft => ({
  ...createEmptyWillDraft(),
  testatorFullName: NAME,
  beneficiaries: [{ id: "b1", kind: "natural-person", displayName: "Alex", isMinor: "no" }],
  provisions: [{ id: "p1", beneficiaryId: "b1", subject: SECRET, clause: "none" }],
});

async function saveDraft(repo: WillRepository, d = draft()) {
  const history = (await appendVersion(createHistory<WillDraft>("will-draft"), d, env)).history;
  await repo.save("will-draft", { current: d, history });
  return history;
}

const everything = (storage: MemoryStorage): string =>
  [...storage.data.values()]
    .map((v) => {
      const text = new TextDecoder("latin1").decode(v);
      // Also look inside the base64 fields: the ciphertext must not hide a plaintext either.
      const decoded = [...text.matchAll(/"([A-Za-z0-9+/=]{16,})"/g)]
        .map((m) => Buffer.from(m[1]!, "base64").toString("latin1"))
        .join("|");
      return `${text}|${decoded}`;
    })
    .join("|");

describe("WillRepository — encryption at rest", () => {
  it("round-trips the three objects and their histories", async () => {
    const { repo } = await setup();
    const history = await saveDraft(repo);
    const loaded = await repo.load();
    expect(loaded.draft).toEqual(draft());
    expect(loaded.histories.draft.versions).toHaveLength(1);
    expect(loaded.histories.draft.versions[0]?.hash).toBe(history.versions[0]?.hash);
    expect(loaded.wishes).toEqual(createEmptyWishesDocument());
  });

  it("starts from empty objects when nothing was ever saved", async () => {
    const { repo } = await setup();
    const loaded = await repo.load();
    expect(loaded.draft).toEqual(createEmptyWillDraft());
    expect(loaded.histories.draft.versions).toEqual([]);
  });

  it("never writes a name, a wish or a version in clear — neither raw nor inside the ciphertext fields", async () => {
    const { repo, storage } = await setup();
    await saveDraft(repo);
    const dump = everything(storage);
    expect(dump).not.toContain(NAME);
    expect(dump).not.toContain(SECRET);
    expect(dump).not.toContain("Alex");
    expect(dump).not.toContain("testatorFullName");
    expect(dump).not.toContain("sha-256");
  });

  it("stores one record per object and uses a different data key for each", async () => {
    const { repo, storage } = await setup();
    await saveDraft(repo);
    const wishes: WishesDocument = { ...createEmptyWishesDocument(), funeralWishes: "Simple." };
    const wh = (await appendVersion(createHistory<WishesDocument>("wishes-document"), wishes, env))
      .history;
    await repo.save("wishes-document", { current: wishes, history: wh });
    const read = (key: string) =>
      JSON.parse(new TextDecoder().decode(storage.data.get(`will/${key}`)!));
    expect([...storage.data.keys()].sort()).toEqual(["will/will-draft", "will/wishes-document"]);
    expect(read("will-draft").wrappedDek.ciphertext).not.toBe(
      read("wishes-document").wrappedDek.ciphertext,
    );
  });

  it("keeps the same wrapped data key across saves but a fresh IV for each write", async () => {
    const { repo, storage } = await setup();
    await saveDraft(repo);
    const first = JSON.parse(new TextDecoder().decode(storage.data.get("will/will-draft")!));
    await saveDraft(repo, { ...draft(), testatorFullName: "Autre" });
    const second = JSON.parse(new TextDecoder().decode(storage.data.get("will/will-draft")!));
    expect(second.wrappedDek).toEqual(first.wrappedDek);
    expect(second.iv).not.toBe(first.iv);
  });

  it("cannot be read with another code (another KEK)", async () => {
    const { repo, storage } = await setup("482915");
    await saveDraft(repo);
    const other = await setup("000001");
    other.storage.data.set("will/will-draft", storage.data.get("will/will-draft")!);
    await expect(other.repo.load()).rejects.toBeInstanceOf(WillUnreadableError);
  });

  it("detects a tampered record", async () => {
    const { repo, storage, keys } = await setup();
    await saveDraft(repo);
    const stored = JSON.parse(new TextDecoder().decode(storage.data.get("will/will-draft")!));
    const bytes = Buffer.from(stored.ciphertext, "base64");
    bytes[0] = bytes[0]! ^ 1;
    stored.ciphertext = bytes.toString("base64");
    storage.data.set("will/will-draft", new TextEncoder().encode(JSON.stringify(stored)));
    keys.clear();
    keys.set(KEK_ALIAS, await crypto_.deriveKey("482915", SALT, FAST));
    await expect(repo.load()).rejects.toBeInstanceOf(WillUnreadableError);
  });

  it("refuses a record moved under another subject (the subject is authenticated)", async () => {
    const { repo, storage } = await setup();
    await saveDraft(repo);
    storage.data.set("will/wishes-document", storage.data.get("will/will-draft")!);
    await expect(repo.load()).rejects.toBeInstanceOf(WillUnreadableError);
  });

  it("refuses unreadable bytes and unknown formats rather than starting from empty", async () => {
    const { repo, storage } = await setup();
    storage.data.set("will/will-draft", new TextEncoder().encode("not json"));
    await expect(repo.load()).rejects.toBeInstanceOf(WillUnreadableError);
    storage.data.set(
      "will/will-draft",
      new TextEncoder().encode(JSON.stringify({ storeVersion: 99 })),
    );
    await expect(repo.load()).rejects.toBeInstanceOf(WillUnreadableError);
  });

  it("rejects a history whose chain of hashes was altered, even when decryption succeeds", async () => {
    const { repo } = await setup();
    const history = (await appendVersion(createHistory<WillDraft>("will-draft"), draft(), env))
      .history;
    const forged = structuredClone(history) as unknown as { versions: { snapshot: WillDraft }[] };
    forged.versions[0]!.snapshot.testatorFullName = "Falsifié";
    await repo.save("will-draft", { current: draft(), history: forged as never });
    await expect(repo.load()).rejects.toBeInstanceOf(WillUnreadableError);
  });

  it("validates the content it reads back (a stored object with a wrong shape is refused)", async () => {
    const { repo } = await setup();
    const history = createHistory<WillDraft>("will-draft");
    await repo.save("will-draft", { current: { ...draft(), schemaVersion: 7 } as never, history });
    await expect(repo.load()).rejects.toBeInstanceOf(WillUnreadableError);
  });

  it("does not overwrite a record it cannot read", async () => {
    const { repo, storage } = await setup();
    storage.data.set("will/will-draft", new TextEncoder().encode("garbage"));
    await expect(saveDraft(repo)).rejects.toBeInstanceOf(WillUnreadableError);
    expect(new TextDecoder().decode(storage.data.get("will/will-draft")!)).toBe("garbage");
  });
});

describe("WillRepository — key handling", () => {
  it("refuses to save or load while locked (no KEK in the key store)", async () => {
    const { repo, keys } = await setup();
    await saveDraft(repo);
    keys.clear();
    await expect(saveDraft(repo)).rejects.toBeInstanceOf(WillLockedError);
    await expect(repo.load()).rejects.toBeInstanceOf(WillLockedError);
  });

  it("keeps data keys only in the key store, so locking drops them too", async () => {
    const { repo, keys } = await setup();
    await saveDraft(repo);
    expect(keys.get("will-dek:will-draft")).not.toBeNull();
    keys.clear();
    expect(keys.isEmpty()).toBe(true);
  });

  it("the data key unwrapped after an unlock is not extractible", async () => {
    const { repo, storage } = await setup();
    await saveDraft(repo);
    // A new session: fresh key store, KEK re-derived, data key restored through unwrapKey.
    const keys = new MemoryKeyStore();
    keys.set(KEK_ALIAS, await crypto_.deriveKey("482915", SALT, FAST));
    const again = new WillRepository({
      storage,
      crypto: crypto_,
      keys,
      hasher,
      logger: new RecordingLogger(),
    });
    await again.load();
    const dek = keys.get("will-dek:will-draft") as unknown as CryptoKey;
    expect(dek.extractable).toBe(false);
  });

  it("serializes saves: the last edit wins even when writes are issued back to back", async () => {
    const { repo } = await setup();
    const history = createHistory<WillDraft>("will-draft");
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        repo.save("will-draft", { current: { ...draft(), testatorFullName: `Nom ${i}` }, history }),
      ),
    );
    expect((await repo.load()).draft.testatorFullName).toBe("Nom 7");
  });

  it("logs counts only, never content", async () => {
    const { repo, logger } = await setup();
    await saveDraft(repo);
    const logs = logger.lines.join("\n");
    expect(logs).toContain("will.saved");
    expect(logs).not.toContain(NAME);
    expect(logs).not.toContain(SECRET);
  });
});
