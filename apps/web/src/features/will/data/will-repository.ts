import type {
  CryptoProvider,
  EncryptedPayload,
  KeyHandle,
  Logger,
  SecureKeyStore,
  StorageProvider,
} from "@veille/core/ports";
import {
  createEmptyPhysicalWillRecord,
  createEmptyWillDraft,
  createEmptyWishesDocument,
  createHistory,
  parsePhysicalWillRecord,
  parseWillDraft,
  parseWillVersion,
  parseWishesDocument,
  verifyHistory,
  WILL_SUBJECTS,
  type ParseResult,
  type PhysicalWillRecord,
  type VersionHistory,
  type WillDraft,
  type WillHasher,
  type WillSnapshot,
  type WillSubject,
  type WillVersion,
  type WillWorkspace,
  type WishesDocument,
} from "@veille/core/will";
import { KEK_ALIAS } from "../../profile/data/profile-service";
import { fromBase64, toBase64 } from "../../profile/data/bytes";

const COLLECTION = "will";
const STORE_VERSION = 1;
const dekAlias = (subject: WillSubject) => `will-dek:${subject}`;
/** The subject is authenticated with the ciphertext: a record cannot be swapped for another one. */
const aadFor = (subject: WillSubject) => new TextEncoder().encode(`veille.will.v1:${subject}`);

/**
 * What lands in storage: base64 of ciphertexts only. The content (names, wishes, versions) exists
 * in clear nowhere on disk; the DEK is wrapped under the KEK, which itself is never persisted.
 */
interface StoredDocument {
  storeVersion: number;
  wrappedDek: { iv: string; ciphertext: string };
  iv: string;
  ciphertext: string;
}

/** Decrypted payload: the working copy and the complete, append-only history. */
interface Payload {
  current: unknown;
  versions: unknown[];
}

export class WillLockedError extends Error {
  constructor() {
    super("will.locked");
  }
}

/** A record exists but cannot be read back (wrong key, altered data, unknown format). */
export class WillUnreadableError extends Error {
  constructor(readonly subject: WillSubject) {
    super("will.unreadable");
  }
}

export interface SubjectState<S extends WillSnapshot> {
  current: S;
  history: VersionHistory<S>;
}

export interface WillRepositoryDeps {
  storage: StorageProvider;
  crypto: CryptoProvider;
  keys: SecureKeyStore;
  hasher: WillHasher;
  logger: Logger;
}

const PARSERS: Record<WillSubject, (input: unknown) => ParseResult<WillSnapshot>> = {
  "will-draft": parseWillDraft,
  "wishes-document": parseWishesDocument,
  "physical-will-record": parsePhysicalWillRecord,
};

/**
 * Encrypted persistence of the three will objects (AES-256-GCM, envelope encryption, one DEK per
 * document, KEK from the key store). ADR-0003, Phase 1 variant.
 */
export class WillRepository {
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly deps: WillRepositoryDeps) {}

  /** Reads and decrypts the three objects; missing ones start empty. Throws if one is unreadable. */
  async load(): Promise<WillWorkspace> {
    const [draft, wishes, record] = await Promise.all([
      this.loadSubject<WillDraft>("will-draft", createEmptyWillDraft),
      this.loadSubject<WishesDocument>("wishes-document", createEmptyWishesDocument),
      this.loadSubject<PhysicalWillRecord>("physical-will-record", createEmptyPhysicalWillRecord),
    ]);
    return {
      draft: draft.current,
      wishes: wishes.current,
      physicalRecord: record.current,
      histories: { draft: draft.history, wishes: wishes.history, physicalRecord: record.history },
    };
  }

  /** Saves are serialized: a later write never overtakes an earlier one. */
  save<S extends WillSnapshot>(subject: WillSubject, state: SubjectState<S>): Promise<void> {
    const run = this.chain.then(() => this.write(subject, state));
    this.chain = run.catch(() => undefined);
    return run;
  }

  private kek(): KeyHandle {
    const kek = this.deps.keys.get(KEK_ALIAS);
    if (!kek) throw new WillLockedError();
    return kek;
  }

  private async read(subject: WillSubject): Promise<StoredDocument | null> {
    const bytes = await this.deps.storage.get(COLLECTION, subject);
    if (!bytes) return null;
    try {
      const stored = JSON.parse(new TextDecoder().decode(bytes)) as StoredDocument;
      if (stored.storeVersion !== STORE_VERSION) throw new WillUnreadableError(subject);
      return stored;
    } catch {
      throw new WillUnreadableError(subject);
    }
  }

  private async dek(subject: WillSubject, stored: StoredDocument): Promise<KeyHandle> {
    const cached = this.deps.keys.get(dekAlias(subject));
    if (cached) return cached;
    const wrapped: EncryptedPayload = {
      iv: fromBase64(stored.wrappedDek.iv),
      ciphertext: fromBase64(stored.wrappedDek.ciphertext),
    };
    try {
      const dek = await this.deps.crypto.unwrapKey(this.kek(), wrapped);
      this.deps.keys.set(dekAlias(subject), dek);
      return dek;
    } catch (error) {
      if (error instanceof WillLockedError) throw error;
      throw new WillUnreadableError(subject);
    }
  }

  private async loadSubject<S extends WillSnapshot>(
    subject: WillSubject,
    empty: () => S,
  ): Promise<SubjectState<S>> {
    const stored = await this.read(subject);
    if (!stored) return { current: empty(), history: createHistory<S>(subject) };

    const dek = await this.dek(subject, stored);
    const plain = await this.deps.crypto.decrypt(
      dek,
      { iv: fromBase64(stored.iv), ciphertext: fromBase64(stored.ciphertext) },
      aadFor(subject),
    );
    if (!plain) throw new WillUnreadableError(subject);

    // Everything read back is validated again: storage is a trust boundary (AGENTS.md §5.6).
    let payload: Payload;
    try {
      payload = JSON.parse(new TextDecoder().decode(plain)) as Payload;
    } catch {
      throw new WillUnreadableError(subject);
    }
    const current = PARSERS[subject](payload.current);
    if (!current.ok || !Array.isArray(payload.versions)) throw new WillUnreadableError(subject);
    const versions: WillVersion[] = [];
    for (const raw of payload.versions) {
      const version = parseWillVersion(raw);
      if (!version.ok) throw new WillUnreadableError(subject);
      versions.push(version.value);
    }
    const history: VersionHistory = { subject, versions };
    if ((await verifyHistory(history, this.deps.hasher)).length > 0)
      throw new WillUnreadableError(subject);
    return { current: current.value as S, history: history as VersionHistory<S> };
  }

  private async write<S extends WillSnapshot>(
    subject: WillSubject,
    state: SubjectState<S>,
  ): Promise<void> {
    const { crypto, storage, keys, logger } = this.deps;
    const existing = await this.read(subject);

    let dek: KeyHandle;
    let wrappedDek: StoredDocument["wrappedDek"];
    if (existing) {
      dek = await this.dek(subject, existing);
      wrappedDek = existing.wrappedDek;
    } else {
      const kek = this.kek();
      dek = await crypto.generateDataKey();
      const wrapped = await crypto.wrapKey(kek, dek);
      wrappedDek = { iv: toBase64(wrapped.iv), ciphertext: toBase64(wrapped.ciphertext) };
      keys.set(dekAlias(subject), dek);
    }

    const payload: Payload = { current: state.current, versions: [...state.history.versions] };
    const sealed = await crypto.encrypt(
      dek,
      new TextEncoder().encode(JSON.stringify(payload)),
      aadFor(subject),
    );
    const record: StoredDocument = {
      storeVersion: STORE_VERSION,
      wrappedDek,
      iv: toBase64(sealed.iv),
      ciphertext: toBase64(sealed.ciphertext),
    };
    await storage.put(COLLECTION, subject, new TextEncoder().encode(JSON.stringify(record)));
    // Counts only: no content in logs (AGENTS.md §6.3).
    logger.info("will.saved", { versions: state.history.versions.length });
  }

  /** The subjects this repository knows how to store. */
  static readonly subjects = WILL_SUBJECTS;
}
