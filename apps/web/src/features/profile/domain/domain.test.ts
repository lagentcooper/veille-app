import { checkCode } from "./code-policy";
import {
  afterFailure,
  delayAfter,
  FREE_ATTEMPTS,
  lockoutStatus,
  NO_FAILURE,
} from "./lockout-policy";
import { isValidFirstName, normalizeFirstName } from "./profile";
import { toDuration, toMegabytes } from "../../shell/domain/format";

describe("code policy", () => {
  it.each(["", "12345", "1234567", "12a456", "      ", "١٢٣٤٥٦"])(
    "rejects bad format %j",
    (code) => {
      expect(checkCode(code)).toBe("format");
    },
  );
  it.each(["000000", "777777"])("rejects repeated digits %s", (code) => {
    expect(checkCode(code)).toBe("repeated");
  });
  it.each(["123456", "234567", "654321", "012345"])("rejects sequences %s", (code) => {
    expect(checkCode(code)).toBe("sequence");
  });
  it.each(["482915", "135792", "100200"])("accepts %s", (code) => {
    expect(checkCode(code)).toBeNull();
  });
});

describe("lockout policy", () => {
  it("allows the free attempts without delay", () => {
    let state = NO_FAILURE;
    for (let i = 1; i < FREE_ATTEMPTS; i++) {
      state = afterFailure(state, 1000);
      expect(lockoutStatus(state, 1000)).toEqual({
        locked: false,
        attemptsLeft: FREE_ATTEMPTS - i,
      });
    }
  });
  it("locks after the free attempts, with an escalating delay capped at one hour", () => {
    expect(delayAfter(FREE_ATTEMPTS)).toBe(30_000);
    expect(delayAfter(FREE_ATTEMPTS + 1)).toBe(60_000);
    expect(delayAfter(FREE_ATTEMPTS + 2)).toBe(120_000);
    expect(delayAfter(FREE_ATTEMPTS + 100)).toBe(3_600_000);
  });
  it("counts the wait down and releases it", () => {
    const state = { failedAttempts: FREE_ATTEMPTS, lastFailureAt: 10_000 };
    expect(lockoutStatus(state, 10_000)).toEqual({ locked: true, retryAfterMs: 30_000 });
    expect(lockoutStatus(state, 25_000)).toEqual({ locked: true, retryAfterMs: 15_000 });
    expect(lockoutStatus(state, 40_000)).toEqual({ locked: false, attemptsLeft: 0 });
  });
  it("does not shorten nor extend the wait when the clock moves backwards", () => {
    const state = { failedAttempts: FREE_ATTEMPTS, lastFailureAt: 10_000 };
    expect(lockoutStatus(state, -500_000)).toEqual({ locked: true, retryAfterMs: 30_000 });
  });
});

describe("profile and formatting", () => {
  it("normalizes names", () => {
    expect(normalizeFirstName("  Anne   Claire ")).toBe("Anne Claire");
    expect(normalizeFirstName("x".repeat(100))).toHaveLength(40);
    expect(isValidFirstName("   ")).toBe(false);
    expect(isValidFirstName("Léa")).toBe(true);
  });
  it("rounds waits up", () => {
    expect(toDuration(100)).toEqual({ unit: "seconds", count: 1 });
    expect(toDuration(30_000)).toEqual({ unit: "seconds", count: 30 });
    expect(toDuration(120_000)).toEqual({ unit: "minutes", count: 2 });
    expect(toMegabytes(10)).toBe(0.1);
    expect(toMegabytes(5 * 1_048_576)).toBe(5);
  });
});
