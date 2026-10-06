import type { Clock } from "@veille/core/ports";

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}
