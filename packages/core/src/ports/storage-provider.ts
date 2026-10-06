/**
 * Whether the platform promises not to evict stored data under disk pressure
 * (threat model R26). `persisted` is the permanent state on native platforms.
 */
export type PersistenceState = "persisted" | "best-effort" | "unsupported";

export interface StorageUsage {
  readonly usedBytes: number | null;
  readonly quotaBytes: number | null;
}

/**
 * Local-first record store. Values are opaque bytes: encryption is the caller's
 * job (CryptoProvider), so this port never sees plaintext business data.
 */
export interface StorageProvider {
  get(collection: string, key: string): Promise<Uint8Array | null>;
  put(collection: string, key: string, value: Uint8Array): Promise<void>;
  delete(collection: string, key: string): Promise<void>;
  keys(collection: string): Promise<readonly string[]>;
  /** Real deletion of everything this provider holds (no hidden trash). */
  clear(): Promise<void>;
  persistence(): Promise<PersistenceState>;
  /** Asks the platform to protect the data from eviction; returns the resulting state. */
  requestPersistence(): Promise<PersistenceState>;
  usage(): Promise<StorageUsage>;
}
