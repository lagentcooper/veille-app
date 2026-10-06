export interface Clock {
  /** Milliseconds since the Unix epoch. */
  now(): number;
}
