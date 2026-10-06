/**
 * Injected capabilities of the will domain.
 *
 * `packages/core` may not touch `crypto`, `Date.now` wiring or any browser API, so time and hashing
 * are provided by the caller. Both are structurally compatible with the `Clock` / `CryptoProvider`
 * ports of `packages/core/src/ports` (ADR-0004) and can be adapted to them without change here.
 */

export interface WillClock {
  /** Current instant as an ISO-8601 UTC string (e.g. `2026-10-06T08:00:00.000Z`). */
  nowIso(): string;
}

export interface WillHasher {
  readonly algorithm: "sha-256";
  /** Lowercase hex digest of the UTF-8 encoding of `input`. */
  hashHex(input: string): Promise<string>;
}

export interface WillEnvironment {
  readonly clock: WillClock;
  readonly hasher: WillHasher;
}
