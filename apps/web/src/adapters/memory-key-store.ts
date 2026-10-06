import type { KeyHandle, SecureKeyStore } from "@veille/core/ports";

/** Phase 1 key store: a Map in memory. Nothing is ever persisted (AGENTS.md §5.2). */
export class MemoryKeyStore implements SecureKeyStore {
  private readonly keys = new Map<string, KeyHandle>();

  set(alias: string, key: KeyHandle): void {
    this.keys.set(alias, key);
  }
  get(alias: string): KeyHandle | null {
    return this.keys.get(alias) ?? null;
  }
  clear(): void {
    this.keys.clear();
  }
  isEmpty(): boolean {
    return this.keys.size === 0;
  }
}
