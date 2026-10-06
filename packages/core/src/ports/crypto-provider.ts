/**
 * Opaque handle to a key. The raw bytes are never reachable through this port:
 * Phase 1 backs it with a non-extractible WebCrypto `CryptoKey`, Phase 3 with
 * the hardware Keychain/Keystore. Callers must not inspect it.
 */
declare const keyHandleBrand: unique symbol;
export type KeyHandle = { readonly [keyHandleBrand]: true };

/** Argon2id cost parameters. Persisted next to the salt so they can be raised later. */
export interface KdfParams {
  readonly algorithm: "argon2id";
  /** Memory cost in KiB. */
  readonly memoryKiB: number;
  readonly iterations: number;
  readonly parallelism: number;
}

export interface EncryptedPayload {
  readonly iv: Uint8Array;
  /** AES-256-GCM ciphertext with its authentication tag appended. */
  readonly ciphertext: Uint8Array;
}

export interface CryptoProvider {
  randomBytes(length: number): Uint8Array;
  /** Derives the key-encryption key (KEK) from the application code. Never persisted. */
  deriveKey(code: string, salt: Uint8Array, params: KdfParams): Promise<KeyHandle>;
  /** Fresh random data-encryption key (DEK), one per document. */
  generateDataKey(): Promise<KeyHandle>;
  /** Envelope encryption: wraps `dek` under `kek`. */
  wrapKey(kek: KeyHandle, dek: KeyHandle): Promise<EncryptedPayload>;
  unwrapKey(kek: KeyHandle, wrapped: EncryptedPayload): Promise<KeyHandle>;
  /** AES-256-GCM with a fresh random IV. `aad` is authenticated but not encrypted. */
  encrypt(key: KeyHandle, plaintext: Uint8Array, aad?: Uint8Array): Promise<EncryptedPayload>;
  /** Resolves `null` on wrong key or tampered data; never reveals which. */
  decrypt(key: KeyHandle, payload: EncryptedPayload, aad?: Uint8Array): Promise<Uint8Array | null>;
}
