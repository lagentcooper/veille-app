import type {
  Clock,
  CryptoProvider,
  KdfParams,
  KeyHandle,
  Logger,
  SecureKeyStore,
  StorageProvider,
} from "@veille/core/ports";
import { checkCode } from "../domain/code-policy";
import {
  afterFailure,
  lockoutStatus,
  NO_FAILURE,
  type AttemptState,
} from "../domain/lockout-policy";
import {
  isValidFirstName,
  normalizeFirstName,
  PROFILE_SCHEMA_VERSION,
  type Profile,
} from "../domain/profile";
import { fromBase64, toBase64 } from "./bytes";

const COLLECTION = "profile";
const KEY = "main";
const KEK_ALIAS = "kek";
const AAD = new TextEncoder().encode("veille.profile.v1");

/** Argon2id, single-threaded (no SharedArrayBuffer on GitHub Pages — ADR-0012). To be calibrated on device. */
export const DEFAULT_KDF: KdfParams = {
  algorithm: "argon2id",
  memoryKiB: 32 * 1024,
  iterations: 3,
  parallelism: 1,
};

/** Persisted shape. The code and the KEK are never in it; the name is only inside the ciphertext. */
interface StoredProfile {
  schemaVersion: number;
  kdf: KdfParams;
  salt: string;
  iv: string;
  ciphertext: string;
  failedAttempts: number;
  lastFailureAt: number | null;
}

export type UnlockResult =
  | { status: "unlocked"; profile: Profile }
  | { status: "wrong-code"; attemptsLeft: number }
  | { status: "locked-out"; retryAfterMs: number }
  | { status: "no-profile" };

export type CreateResult =
  { status: "created"; profile: Profile } | { status: "invalid" } | { status: "exists" };

export interface ProfileServiceDeps {
  storage: StorageProvider;
  crypto: CryptoProvider;
  keys: SecureKeyStore;
  clock: Clock;
  logger: Logger;
  kdf?: KdfParams;
}

const encode = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value));

export class ProfileService {
  private readonly kdf: KdfParams;

  constructor(private readonly deps: ProfileServiceDeps) {
    this.kdf = deps.kdf ?? DEFAULT_KDF;
  }

  async exists(): Promise<boolean> {
    return (await this.deps.storage.get(COLLECTION, KEY)) !== null;
  }

  /** Current attempt state, so the lock screen can show a wait before any derivation. */
  async lockout() {
    const stored = await this.read();
    return stored ? lockoutStatus(attempts(stored), this.deps.clock.now()) : null;
  }

  async create(input: { firstName: string; code: string }): Promise<CreateResult> {
    if (!isValidFirstName(input.firstName) || checkCode(input.code) !== null)
      return { status: "invalid" };
    if (await this.exists()) return { status: "exists" };

    const { crypto, storage, keys, logger } = this.deps;
    const salt = crypto.randomBytes(16);
    const kek = await crypto.deriveKey(input.code, salt, this.kdf);
    const profile: Profile = {
      schemaVersion: PROFILE_SCHEMA_VERSION,
      firstName: normalizeFirstName(input.firstName),
    };
    const sealed = await crypto.encrypt(kek, encode(profile), AAD);
    const stored: StoredProfile = {
      schemaVersion: PROFILE_SCHEMA_VERSION,
      kdf: this.kdf,
      salt: toBase64(salt),
      iv: toBase64(sealed.iv),
      ciphertext: toBase64(sealed.ciphertext),
      ...NO_FAILURE,
    };
    await storage.put(COLLECTION, KEY, encode(stored));
    keys.set(KEK_ALIAS, kek);
    logger.info("profile.created");
    return { status: "created", profile };
  }

  async unlock(code: string): Promise<UnlockResult> {
    const { crypto, keys, clock, logger } = this.deps;
    const stored = await this.read();
    if (!stored) return { status: "no-profile" };

    const before = lockoutStatus(attempts(stored), clock.now());
    if (before.locked) return { status: "locked-out", retryAfterMs: before.retryAfterMs };

    // The failure is recorded BEFORE the slow derivation: closing the tab mid-attempt must not be free.
    const pending = afterFailure(attempts(stored), clock.now());
    await this.write({ ...stored, ...pending });

    let kek: KeyHandle | null = null;
    let profile: Profile | null = null;
    if (checkCode(code) === null) {
      kek = await crypto.deriveKey(code, fromBase64(stored.salt), stored.kdf);
      const plain = await crypto.decrypt(
        kek,
        { iv: fromBase64(stored.iv), ciphertext: fromBase64(stored.ciphertext) },
        AAD,
      );
      profile = plain ? (JSON.parse(new TextDecoder().decode(plain)) as Profile) : null;
    }

    if (kek && profile) {
      await this.write({ ...stored, ...NO_FAILURE });
      keys.set(KEK_ALIAS, kek);
      logger.info("unlock.succeeded");
      return { status: "unlocked", profile };
    }

    logger.warn("unlock.failed", { failedAttempts: pending.failedAttempts });
    const after = lockoutStatus(pending, clock.now());
    return after.locked
      ? { status: "locked-out", retryAfterMs: after.retryAfterMs }
      : { status: "wrong-code", attemptsLeft: after.attemptsLeft };
  }

  lock(): void {
    this.deps.keys.clear();
    this.deps.logger.info("app.locked");
  }

  isUnlocked(): boolean {
    return !this.deps.keys.isEmpty();
  }

  /** Real deletion of every local record (AGENTS.md §6.6). */
  async deleteEverything(): Promise<void> {
    this.deps.keys.clear();
    await this.deps.storage.clear();
    this.deps.logger.info("data.deleted");
  }

  private async read(): Promise<StoredProfile | null> {
    const bytes = await this.deps.storage.get(COLLECTION, KEY);
    return bytes ? (JSON.parse(new TextDecoder().decode(bytes)) as StoredProfile) : null;
  }

  private async write(stored: StoredProfile): Promise<void> {
    await this.deps.storage.put(COLLECTION, KEY, encode(stored));
  }
}

function attempts(stored: StoredProfile): AttemptState {
  return { failedAttempts: stored.failedAttempts, lastFailureAt: stored.lastFailureAt };
}
