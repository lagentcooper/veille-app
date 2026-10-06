import { describe, expect, it } from "vitest";
import { parsePhysicalWillRecord, parseWillDraft, parseWishesDocument } from "../../src/will";
import { completeDraft, completeRecord, completeWishes } from "./helpers";

describe("boundary validation", () => {
  it("accepts well-formed entities", () => {
    expect(parseWillDraft(completeDraft()).ok).toBe(true);
    expect(parseWishesDocument(completeWishes()).ok).toBe(true);
    expect(parsePhysicalWillRecord(completeRecord()).ok).toBe(true);
  });

  it("rejects non-objects and arrays", () => {
    for (const bad of [null, 42, "x", [], undefined]) expect(parseWillDraft(bad).ok).toBe(false);
  });

  it("rejects unknown properties (strict) and reports their path", () => {
    const r = parseWillDraft({ ...completeDraft(), extra: 1 });
    expect(r).toEqual({ ok: false, issues: [{ path: "extra", code: "unexpected-property" }] });
  });

  it("rejects missing properties", () => {
    const { testatorFullName: _omitted, ...rest } = completeDraft();
    expect(parseWillDraft(rest)).toEqual({
      ok: false,
      issues: [{ path: "testatorFullName", code: "missing-property" }],
    });
  });

  it("rejects values outside an enumeration, at the nested path", () => {
    const d = completeDraft();
    const r = parseWillDraft({
      ...d,
      situation: { ...d.situation, maritalStatus: "it-is-complicated" },
    });
    expect(r).toEqual({
      ok: false,
      issues: [{ path: "situation.maritalStatus", code: "invalid-enum" }],
    });
  });

  it("bounds strings and arrays", () => {
    expect(parseWillDraft({ ...completeDraft(), testatorFullName: "x".repeat(201) }).ok).toBe(
      false,
    );
    const many = Array.from({ length: 201 }, (_, i) => ({
      id: `m${i}`,
      recipientLabel: "a",
      text: "b",
    }));
    expect(parseWishesDocument({ ...completeWishes(), messages: many }).ok).toBe(false);
  });

  it("rejects wrong primitive types", () => {
    expect(parseWillDraft({ ...completeDraft(), handwritingGuideAcknowledged: "yes" }).ok).toBe(
      false,
    );
    expect(parseWillDraft({ ...completeDraft(), testatorFullName: 12 }).ok).toBe(false);
  });

  it("rejects an unsupported schemaVersion", () => {
    expect(parseWishesDocument({ ...completeWishes(), schemaVersion: 2 })).toEqual({
      ok: false,
      issues: [{ path: "schemaVersion", code: "unsupported-schema-version" }],
    });
  });

  it("does not treat prototype-polluting keys as valid input", () => {
    const evil = JSON.parse('{"__proto__": {"polluted": true}}') as object;
    expect(parseWillDraft({ ...completeDraft(), ...evil, ["__proto__"]: undefined }).ok).toBe(true);
    expect(parseWillDraft(JSON.parse(`{"__proto__": {"x":1}, "schemaVersion":1}`)).ok).toBe(false);
  });

  it("issues never contain the offending value", () => {
    const r = parseWillDraft({ ...completeDraft(), testatorFullName: "x".repeat(500) + "SECRET" });
    expect(JSON.stringify(r)).not.toContain("SECRET");
  });
});
