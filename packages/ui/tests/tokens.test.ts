// @vitest-environment node
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match?.[1]) throw new Error(`token --${name} not found`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("disabled control colours (WCAG 1.4.3, AA = 4.5:1)", () => {
  it("primary disabled text is readable on its background", () => {
    expect(
      contrast(token("v-color-on-disabled"), token("v-color-disabled-bg")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("secondary disabled text is readable on the page and on cards", () => {
    expect(contrast(token("v-color-disabled-text"), token("v-color-bg"))).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(
      contrast(token("v-color-disabled-text"), token("v-color-surface")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("a disabled control still looks different from an enabled one", () => {
    expect(token("v-color-disabled-bg")).not.toBe(token("v-color-primary"));
    expect(token("v-color-disabled-text")).not.toBe(token("v-color-primary"));
    // grey and clearly lighter than the enabled blue, so it reads as inactive without fading
    expect(contrast(token("v-color-disabled-bg"), token("v-color-primary"))).toBeGreaterThan(1.4);
  });
});

/** Every pair the interface actually draws: [foreground, background]. */
const TEXT_PAIRS: ReadonlyArray<[string, string]> = [
  ["v-color-text", "v-color-bg"],
  ["v-color-text", "v-color-surface"],
  ["v-color-text-muted", "v-color-bg"],
  ["v-color-text-muted", "v-color-surface"],
  ["v-color-text-muted", "v-color-surface-alt"],
  ["v-color-on-primary", "v-color-primary"],
  ["v-color-on-primary", "v-color-primary-hover"],
  ["v-color-on-tint", "v-color-tint"],
  ["v-color-on-tint", "v-color-tint-hover"],
  ["v-color-primary", "v-color-surface"],
  ["v-color-primary", "v-color-bg"],
  ["v-color-primary", "v-color-surface-alt"],
  ["v-color-success-text", "v-color-success-bg"],
  ["v-color-warning-text", "v-color-warning-bg"],
  ["v-color-danger-text", "v-color-danger-bg"],
  ["v-color-neutral-text", "v-color-neutral-bg"],
  ["v-color-danger-text", "v-color-surface"],
  ["v-color-banner-text", "v-color-banner-bg"],
  ["v-color-disabled-text", "v-color-surface-alt"],
  ["v-color-on-primary", "v-color-danger"],
];

/** Non-text parts that carry meaning (borders of controls, coloured spines, icons): 3:1 (WCAG 1.4.11). */
const UI_PAIRS: ReadonlyArray<[string, string]> = [
  ["v-color-border-strong", "v-color-surface"],
  ["v-color-border-strong", "v-color-bg"],
  ["v-color-success-accent", "v-color-surface"],
  ["v-color-warning-accent", "v-color-surface"],
  ["v-color-danger", "v-color-surface"],
  ["v-color-neutral-accent", "v-color-surface"],
  ["v-color-focus", "v-color-surface"],
  ["v-color-focus", "v-color-bg"],
];

describe("palette", () => {
  it.each(TEXT_PAIRS)("text %s on %s is at least 4.5:1", (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)("meaningful graphic %s on %s is at least 3:1", (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(3);
  });

  it("keeps the four state tints distinct from one another", () => {
    const tints = ["success", "warning", "danger", "neutral"].map((n) => token(`v-color-${n}-bg`));
    expect(new Set(tints).size).toBe(4);
  });
});

describe("button styles", () => {
  it("never fade a control with opacity (it composes text and background with what is behind)", () => {
    expect(css).not.toMatch(/opacity\s*:/);
  });

  it("styles aria-disabled and :disabled the same way", () => {
    expect(css).toContain('.v-button[aria-disabled="true"]');
    expect(css).toContain(".v-button:disabled");
  });

  it("has no colour transition on buttons (an audit during the transition measures a false contrast)", () => {
    expect(css).not.toMatch(/transition\s*:/);
  });
});
