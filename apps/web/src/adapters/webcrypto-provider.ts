import { argon2id } from "hash-wasm";
import type { CryptoProvider, EncryptedPayload, KdfParams, KeyHandle } from "@veille/core/ports";

const asHandle = (key: CryptoKey): KeyHandle => key as unknown as KeyHandle;
/** TS 5.9 distinguishes ArrayBuffer-backed arrays; every array here is ArrayBuffer-backed. */
const buf = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => bytes as Uint8Array<ArrayBuffer>;
const asKey = (handle: KeyHandle): CryptoKey => handle as unknown as CryptoKey;

/**
 * WebCrypto adapter (AES-256-GCM, envelope encryption) with Argon2id from `hash-wasm`
 * (audited primitive; no home-made cryptography — AGENTS.md §5.8).
 * The KEK is imported as a NON-extractible CryptoKey and is never written anywhere.
 */
export class WebCryptoProvider implements CryptoProvider {
  constructor(private readonly subtle: SubtleCrypto = crypto.subtle) {}

  randomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  async deriveKey(code: string, salt: Uint8Array, params: KdfParams): Promise<KeyHandle> {
    const raw = await argon2id({
      password: code,
      salt: buf(salt),
      parallelism: params.parallelism,
      iterations: params.iterations,
      memorySize: params.memoryKiB,
      hashLength: 32,
      outputType: "binary",
    });
    const kek = await this.subtle.importKey("raw", buf(raw), "AES-GCM", false, [
      "encrypt",
      "decrypt",
      "wrapKey",
      "unwrapKey",
    ]);
    raw.fill(0);
    return asHandle(kek);
  }

  async generateDataKey(): Promise<KeyHandle> {
    // Extractable only so that wrapKey can export it under the KEK; it never leaves this adapter in clear.
    const dek = await this.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
      "encrypt",
      "decrypt",
    ]);
    return asHandle(dek);
  }

  async wrapKey(kek: KeyHandle, dek: KeyHandle): Promise<EncryptedPayload> {
    const iv = this.randomBytes(12);
    const ciphertext = await this.subtle.wrapKey("raw", asKey(dek), asKey(kek), {
      name: "AES-GCM",
      iv: buf(iv),
    });
    return { iv, ciphertext: new Uint8Array(ciphertext) };
  }

  async unwrapKey(kek: KeyHandle, wrapped: EncryptedPayload): Promise<KeyHandle> {
    const dek = await this.subtle.unwrapKey(
      "raw",
      buf(wrapped.ciphertext),
      asKey(kek),
      { name: "AES-GCM", iv: buf(wrapped.iv) },
      "AES-GCM",
      false,
      ["encrypt", "decrypt"],
    );
    return asHandle(dek);
  }

  async encrypt(
    key: KeyHandle,
    plaintext: Uint8Array,
    aad?: Uint8Array,
  ): Promise<EncryptedPayload> {
    const iv = this.randomBytes(12);
    const ciphertext = await this.subtle.encrypt(
      { name: "AES-GCM", iv: buf(iv), ...(aad ? { additionalData: buf(aad) } : {}) },
      asKey(key),
      buf(plaintext),
    );
    return { iv, ciphertext: new Uint8Array(ciphertext) };
  }

  async decrypt(
    key: KeyHandle,
    payload: EncryptedPayload,
    aad?: Uint8Array,
  ): Promise<Uint8Array | null> {
    try {
      const plain = await this.subtle.decrypt(
        { name: "AES-GCM", iv: buf(payload.iv), ...(aad ? { additionalData: buf(aad) } : {}) },
        asKey(key),
        buf(payload.ciphertext),
      );
      return new Uint8Array(plain);
    } catch {
      return null;
    }
  }
}
