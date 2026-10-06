/** Failed attempts allowed before a waiting delay starts. */
export const FREE_ATTEMPTS = 5;
const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 60 * 60_000;

export interface AttemptState {
  /** Consecutive failures since the last successful unlock. */
  readonly failedAttempts: number;
  /** Epoch ms of the last failure, or null. */
  readonly lastFailureAt: number | null;
}

export type LockoutStatus =
  | { readonly locked: false; readonly attemptsLeft: number }
  | { readonly locked: true; readonly retryAfterMs: number };

/** Delay applied after the n-th consecutive failure (n >= FREE_ATTEMPTS): 30 s, 60 s, 120 s ... capped at 1 h. */
export function delayAfter(failedAttempts: number): number {
  if (failedAttempts < FREE_ATTEMPTS) return 0;
  const exponent = failedAttempts - FREE_ATTEMPTS;
  return Math.min(BASE_DELAY_MS * 2 ** Math.min(exponent, 20), MAX_DELAY_MS);
}

export function lockoutStatus(state: AttemptState, now: number): LockoutStatus {
  const delay = delayAfter(state.failedAttempts);
  if (delay > 0 && state.lastFailureAt !== null) {
    // A clock set backwards must not shorten the wait, nor extend it beyond the delay.
    const elapsed = Math.max(0, now - state.lastFailureAt);
    const remaining = Math.min(delay, delay - elapsed);
    if (remaining > 0) return { locked: true, retryAfterMs: remaining };
  }
  return { locked: false, attemptsLeft: Math.max(0, FREE_ATTEMPTS - state.failedAttempts) };
}

export function afterFailure(state: AttemptState, now: number): AttemptState {
  return { failedAttempts: state.failedAttempts + 1, lastFailureAt: now };
}

export const NO_FAILURE: AttemptState = { failedAttempts: 0, lastFailureAt: null };
