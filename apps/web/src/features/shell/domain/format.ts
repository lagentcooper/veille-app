export interface Duration {
  unit: "seconds" | "minutes";
  count: number;
}

/** Rounds a wait up so the user is never told "0 seconds" while still locked out. */
export function toDuration(ms: number): Duration {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  return seconds < 90
    ? { unit: "seconds", count: seconds }
    : { unit: "minutes", count: Math.ceil(seconds / 60) };
}

export function toMegabytes(bytes: number): number {
  return Math.max(0.1, Math.round((bytes / 1_048_576) * 10) / 10);
}
