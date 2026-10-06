import type {
  Clock,
  CryptoProvider,
  EncryptedPayload,
  KeyHandle,
  Logger,
  LogFields,
  PersistenceState,
  StorageProvider,
  StorageUsage,
} from "@veille/core/ports";

export class MemoryStorage implements StorageProvider {
  readonly data = new Map<string, Uint8Array>();
  persistenceState: PersistenceState = "best-effort";
  persistRequests = 0;
  async get(c: string, k: string) {
    return this.data.get(`${c}/${k}`) ?? null;
  }
  async put(c: string, k: string, v: Uint8Array) {
    this.data.set(`${c}/${k}`, v);
  }
  async delete(c: string, k: string) {
    this.data.delete(`${c}/${k}`);
  }
  async keys(c: string) {
    return [...this.data.keys()]
      .filter((k) => k.startsWith(`${c}/`))
      .map((k) => k.slice(c.length + 1));
  }
  async clear() {
    this.data.clear();
  }
  async persistence() {
    return this.persistenceState;
  }
  async requestPersistence() {
    this.persistRequests++;
    this.persistenceState = "persisted";
    return this.persistenceState;
  }
  async usage(): Promise<StorageUsage> {
    return { usedBytes: 2_097_152, quotaBytes: 1_073_741_824 };
  }
}

export class FakeClock implements Clock {
  constructor(public time = 1_700_000_000_000) {}
  now() {
    return this.time;
  }
  advance(ms: number) {
    this.time += ms;
  }
}

export class RecordingLogger implements Logger {
  readonly lines: string[] = [];
  private push(level: string, event: string, fields?: LogFields) {
    this.lines.push(JSON.stringify({ level, event, fields }));
  }
  debug(e: string, f?: LogFields) {
    this.push("debug", e, f);
  }
  info(e: string, f?: LogFields) {
    this.push("info", e, f);
  }
  warn(e: string, f?: LogFields) {
    this.push("warn", e, f);
  }
  error(e: string, f?: LogFields) {
    this.push("error", e, f);
  }
}

/** Test double for component tests only: no real cryptography, instant. Real crypto is tested on WebCryptoProvider. */
export class FakeCrypto implements CryptoProvider {
  randomBytes(length: number) {
    return new Uint8Array(length).fill(7);
  }
  async deriveKey(code: string) {
    return { code } as unknown as KeyHandle;
  }
  async generateDataKey() {
    return { code: "dek" } as unknown as KeyHandle;
  }
  async wrapKey(): Promise<EncryptedPayload> {
    throw new Error("unused");
  }
  async unwrapKey(): Promise<KeyHandle> {
    throw new Error("unused");
  }
  async encrypt(key: KeyHandle, plaintext: Uint8Array): Promise<EncryptedPayload> {
    const tag = new TextEncoder().encode((key as unknown as { code: string }).code);
    const out = new Uint8Array(tag.length + plaintext.length);
    out.set(tag);
    out.set(plaintext, tag.length);
    return { iv: new Uint8Array(12), ciphertext: out };
  }
  async decrypt(key: KeyHandle, payload: EncryptedPayload) {
    const tag = new TextEncoder().encode((key as unknown as { code: string }).code);
    const head = payload.ciphertext.slice(0, tag.length);
    return head.every((b, i) => b === tag[i]) ? payload.ciphertext.slice(tag.length) : null;
  }
}
