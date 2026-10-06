import { canonicalJson, deepFreeze } from "./canonical";
import type { WillEnvironment, WillHasher } from "./environment";
import {
  WILL_SCHEMA_VERSION,
  type WillSchemaVersion,
  type WillSnapshot,
  type WillSubject,
} from "./model";

/**
 * Immutable version of one will object: snapshot + timestamp + hash, chained to the previous
 * version (`previousHash`) so that tampering with any past version is detectable.
 *
 * Integrity only: the chain is NOT a legal proof of date or authorship (§2.4) and must never be
 * presented as such.
 */
export interface WillVersion<S extends WillSnapshot = WillSnapshot> {
  readonly schemaVersion: WillSchemaVersion;
  readonly subject: WillSubject;
  /** 1-based, strictly increasing, no gaps. */
  readonly sequence: number;
  readonly createdAt: string;
  readonly hashAlgorithm: "sha-256";
  readonly previousHash: string | null;
  readonly hash: string;
  readonly snapshot: S;
}

/** Append-only. There is deliberately no function that removes or rewrites a version. */
export interface VersionHistory<S extends WillSnapshot = WillSnapshot> {
  readonly subject: WillSubject;
  readonly versions: readonly WillVersion<S>[];
}

export function createHistory<S extends WillSnapshot>(subject: WillSubject): VersionHistory<S> {
  return deepFreeze({ subject, versions: [] });
}

export interface AppendResult<S extends WillSnapshot> {
  history: VersionHistory<S>;
  /** The new version, or the unchanged head when `created` is false. */
  version: WillVersion<S> | null;
  /** False when the snapshot is identical to the head: no empty version is recorded. */
  created: boolean;
}

type HashedFields = Omit<WillVersion, "hash" | "snapshot"> & { snapshot: WillSnapshot };

async function computeHash(hasher: WillHasher, v: HashedFields): Promise<string> {
  return hasher.hashHex(
    canonicalJson({
      schemaVersion: v.schemaVersion,
      subject: v.subject,
      sequence: v.sequence,
      createdAt: v.createdAt,
      hashAlgorithm: v.hashAlgorithm,
      previousHash: v.previousHash,
      snapshot: v.snapshot,
    }),
  );
}

export async function appendVersion<S extends WillSnapshot>(
  history: VersionHistory<S>,
  snapshot: S,
  env: WillEnvironment,
): Promise<AppendResult<S>> {
  const head = history.versions.at(-1) ?? null;
  const frozenSnapshot = deepFreeze(JSON.parse(canonicalJson(snapshot)) as S);
  if (head && canonicalJson(head.snapshot) === canonicalJson(frozenSnapshot)) {
    return { history, version: head, created: false };
  }
  const draft: HashedFields = {
    schemaVersion: WILL_SCHEMA_VERSION,
    subject: history.subject,
    sequence: (head?.sequence ?? 0) + 1,
    createdAt: env.clock.nowIso(),
    hashAlgorithm: env.hasher.algorithm,
    previousHash: head?.hash ?? null,
    snapshot: frozenSnapshot,
  };
  const version = deepFreeze({
    ...draft,
    hash: await computeHash(env.hasher, draft),
  }) as WillVersion<S>;
  const next = deepFreeze({ subject: history.subject, versions: [...history.versions, version] });
  return { history: next, version, created: true };
}

export type VersionIssueCode =
  | "subject-mismatch"
  | "sequence-gap"
  | "chain-broken"
  | "hash-mismatch"
  | "unsupported-schema-version"
  | "unsupported-hash-algorithm";

export interface VersionIssue {
  sequence: number;
  code: VersionIssueCode;
}

/** Recomputes every hash and the chain. An empty result means the history is intact. */
export async function verifyHistory(
  history: VersionHistory,
  hasher: WillHasher,
): Promise<VersionIssue[]> {
  const issues: VersionIssue[] = [];
  let previous: WillVersion | null = null;
  for (const [index, v] of history.versions.entries()) {
    const push = (code: VersionIssueCode): void => void issues.push({ sequence: v.sequence, code });
    if (v.subject !== history.subject) push("subject-mismatch");
    if (v.schemaVersion !== WILL_SCHEMA_VERSION) push("unsupported-schema-version");
    if (v.hashAlgorithm !== hasher.algorithm) push("unsupported-hash-algorithm");
    if (v.sequence !== index + 1) push("sequence-gap");
    if (v.previousHash !== (previous?.hash ?? null)) push("chain-broken");
    if ((await computeHash(hasher, v)) !== v.hash) push("hash-mismatch");
    previous = v;
  }
  return issues;
}
