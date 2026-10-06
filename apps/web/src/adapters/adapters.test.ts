// @vitest-environment node
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { IndexedDbStorage } from "./indexeddb-storage";
import { MemoryKeyStore } from "./memory-key-store";
import { WebCryptoProvider } from "./webcrypto-provider";

const FAST = { algorithm: "argon2id", memoryKiB: 64, iterations: 1, parallelism: 1 } as const;
const bytes = (text: string) => new TextEncoder().encode(text);

describe("WebCryptoProvider", () => {
  const crypto = new WebCryptoProvider();
  const salt = new Uint8Array(16).fill(3);

  it("derives the same key from the same code and salt, a different one otherwise", async () => {
    const a = await crypto.deriveKey("482915", salt, FAST);
    const b = await crypto.deriveKey("482915", salt, FAST);
    const c = await crypto.deriveKey("482916", salt, FAST);
    const sealed = await crypto.encrypt(a, bytes("secret"));
    expect(await crypto.decrypt(b, sealed)).toEqual(bytes("secret"));
    expect(await crypto.decrypt(c, sealed)).toBeNull();
  });

  it("makes the KEK non-extractible", async () => {
    const kek = (await crypto.deriveKey("482915", salt, FAST)) as unknown as CryptoKey;
    expect(kek.extractable).toBe(false);
    await expect(globalThis.crypto.subtle.exportKey("raw", kek)).rejects.toThrow();
  });

  it("uses a fresh IV each time and authenticates the associated data", async () => {
    const key = await crypto.generateDataKey();
    const one = await crypto.encrypt(key, bytes("x"), bytes("aad"));
    const two = await crypto.encrypt(key, bytes("x"), bytes("aad"));
    expect(one.iv).not.toEqual(two.iv);
    expect(one.ciphertext).not.toEqual(two.ciphertext);
    expect(await crypto.decrypt(key, one, bytes("aad"))).toEqual(bytes("x"));
    expect(await crypto.decrypt(key, one, bytes("other"))).toBeNull();
  });

  it("detects tampering", async () => {
    const key = await crypto.generateDataKey();
    const sealed = await crypto.encrypt(key, bytes("hello"));
    const tampered = {
      ...sealed,
      ciphertext: sealed.ciphertext.map((b, i) => (i === 0 ? b ^ 1 : b)),
    };
    expect(await crypto.decrypt(key, tampered)).toBeNull();
  });

  it("supports envelope encryption: a DEK wrapped under the KEK", async () => {
    const kek = await crypto.deriveKey("482915", salt, FAST);
    const dek = await crypto.generateDataKey();
    const sealed = await crypto.encrypt(dek, bytes("document"));
    const wrapped = await crypto.wrapKey(kek, dek);
    const restored = await crypto.unwrapKey(kek, wrapped);
    expect(await crypto.decrypt(restored, sealed)).toEqual(bytes("document"));
    expect((restored as unknown as CryptoKey).extractable).toBe(false);
    const other = await crypto.deriveKey("000001", salt, FAST);
    await expect(crypto.unwrapKey(other, wrapped)).rejects.toThrow();
  });
});

describe("IndexedDbStorage", () => {
  it("stores, lists, deletes and clears opaque records", async () => {
    const storage = new IndexedDbStorage(new IDBFactory());
    expect(await storage.get("c", "a")).toBeNull();
    await storage.put("c", "a", bytes("1"));
    await storage.put("c", "b", bytes("2"));
    await storage.put("other", "z", bytes("3"));
    expect(await storage.get("c", "a")).toEqual(bytes("1"));
    expect([...(await storage.keys("c"))].sort()).toEqual(["a", "b"]);
    await storage.delete("c", "a");
    expect(await storage.get("c", "a")).toBeNull();
    await storage.clear();
    expect(await storage.keys("other")).toEqual([]);
  });

  it("reports persistence as unsupported when the platform has no storage manager", async () => {
    const storage = new IndexedDbStorage(new IDBFactory());
    expect(await storage.persistence()).toBe("unsupported");
    expect(await storage.requestPersistence()).toBe("unsupported");
    expect(await storage.usage()).toEqual({ usedBytes: null, quotaBytes: null });
  });
});

describe("MemoryKeyStore", () => {
  it("holds keys in memory only and forgets them on clear", () => {
    const store = new MemoryKeyStore();
    expect(store.isEmpty()).toBe(true);
    store.set("kek", {} as never);
    expect(store.get("kek")).not.toBeNull();
    store.clear();
    expect(store.isEmpty()).toBe(true);
    expect(store.get("kek")).toBeNull();
  });
});
