import type { KeyHandle } from "./crypto-provider";

/**
 * Holds unlocked keys for the current session.
 * Phase 1: process memory only, never written anywhere (AGENTS.md §5.2).
 * Phase 3: Keychain / Keystore.
 */
export interface SecureKeyStore {
  set(alias: string, key: KeyHandle): void;
  get(alias: string): KeyHandle | null;
  /** Drops every key: the application is locked. */
  clear(): void;
  isEmpty(): boolean;
}
