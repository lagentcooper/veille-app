import type { PersistenceState, StorageProvider, StorageUsage } from "@veille/core/ports";

const DB_NAME = "veille";
const STORE = "records";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** IndexedDB adapter. Holds opaque bytes only; never receives plaintext business data or a key. */
export class IndexedDbStorage implements StorageProvider {
  private db: Promise<IDBDatabase> | null = null;

  constructor(private readonly factory: IDBFactory = indexedDB) {}

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const req = this.factory.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.db;
  }

  private static id(collection: string, key: string): string {
    return `${collection}/${key}`;
  }

  async get(collection: string, key: string): Promise<Uint8Array | null> {
    const db = await this.open();
    const value = await request<Uint8Array | undefined>(
      db.transaction(STORE).objectStore(STORE).get(IndexedDbStorage.id(collection, key)),
    );
    return value ?? null;
  }

  async put(collection: string, key: string, value: Uint8Array): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, IndexedDbStorage.id(collection, key));
    await done(tx);
  }

  async delete(collection: string, key: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(IndexedDbStorage.id(collection, key));
    await done(tx);
  }

  async keys(collection: string): Promise<readonly string[]> {
    const db = await this.open();
    const prefix = `${collection}/`;
    const all = await request<IDBValidKey[]>(db.transaction(STORE).objectStore(STORE).getAllKeys());
    return all
      .filter((k): k is string => typeof k === "string" && k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
  }

  async clear(): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    await done(tx);
  }

  async persistence(): Promise<PersistenceState> {
    if (!navigator.storage?.persisted) return "unsupported";
    return (await navigator.storage.persisted()) ? "persisted" : "best-effort";
  }

  async requestPersistence(): Promise<PersistenceState> {
    if (!navigator.storage?.persist) return "unsupported";
    await navigator.storage.persist();
    return this.persistence();
  }

  async usage(): Promise<StorageUsage> {
    if (!navigator.storage?.estimate) return { usedBytes: null, quotaBytes: null };
    const { usage, quota } = await navigator.storage.estimate();
    return { usedBytes: usage ?? null, quotaBytes: quota ?? null };
  }
}
