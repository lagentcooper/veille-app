import { describe, expect, it } from "vitest";
import {
  assessWishesDocument,
  canonicalJson,
  createEmptyWishesDocument,
  deserializeWillFromVea,
  parseWillVersion,
  serializeWillToVea,
  appendVersion,
  createHistory,
  createEmptyPhysicalWillRecord,
  createEmptyWillDraft,
  type WillDraft,
  type WillWorkspace,
} from "../../src/will";
import { completeDraft, testEnv, testHasher } from "./helpers";

describe("canonicalJson", () => {
  it("sorts keys deeply and drops undefined", () => {
    expect(canonicalJson({ b: 1, a: { d: undefined, c: [3, { z: 1, y: 2 }] } })).toBe(
      '{"a":{"c":[3,{"y":2,"z":1}]},"b":1}',
    );
  });
  it("turns undefined array items into null, like JSON", () => {
    expect(canonicalJson([undefined, 1])).toBe("[null,1]");
  });
  it("refuses values that cannot be hashed deterministically", () => {
    expect(() => canonicalJson({ n: Number.NaN })).toThrow(TypeError);
    expect(() => canonicalJson({ f: () => 1 })).toThrow(TypeError);
  });
});

describe("wishes content detection", () => {
  it("a document holding only a message counts as having content", () => {
    const d = {
      ...createEmptyWishesDocument(),
      hasBodyWishes: "no" as const,
      messages: [{ id: "m", recipientLabel: "A", text: "B" }],
    };
    expect(assessWishesDocument(d).level).toBe("complete");
  });
  it("a document holding only papers counts as having content", () => {
    const d = {
      ...createEmptyWishesDocument(),
      hasBodyWishes: "no" as const,
      papers: [{ id: "p", label: "A", location: "B" }],
    };
    expect(assessWishesDocument(d).level).toBe("complete");
  });
  it("duplicate identifiers across messages and papers are an inconsistency", () => {
    const d = {
      ...createEmptyWishesDocument(),
      hasBodyWishes: "no" as const,
      messages: [{ id: "same", recipientLabel: "A", text: "B" }],
      papers: [{ id: "same", label: "A", location: "B" }],
    };
    expect(assessWishesDocument(d).findings.map((f) => f.code)).toContain(
      "inconsistency.duplicateId",
    );
  });
});

describe("VEA reader — malformed version files", () => {
  async function files() {
    const env = testEnv();
    const h = (await appendVersion(createHistory<WillDraft>("will-draft"), completeDraft(), env))
      .history;
    const ws: WillWorkspace = {
      draft: completeDraft(),
      wishes: createEmptyWishesDocument(),
      physicalRecord: createEmptyPhysicalWillRecord(),
      histories: {
        draft: h,
        wishes: createHistory("wishes-document"),
        physicalRecord: createHistory("physical-will-record"),
      },
    };
    return serializeWillToVea(ws);
  }

  it("rejects a version file that is not JSON", async () => {
    const f = (await files()).map((x) =>
      x.path.endsWith("will-draft-0001.json") ? { ...x, content: "<<<" } : x,
    );
    const r = await deserializeWillFromVea(f, testHasher);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors).toContainEqual({
        code: "invalid-json",
        path: "data/will/versions/will-draft-0001.json",
      });
  });

  it("rejects a version file with an invalid snapshot, without echoing it", async () => {
    const f = (await files()).map((x) =>
      x.path.endsWith("will-draft-0001.json")
        ? { ...x, content: x.content.replace('"clause": "none"', '"clause": "Interdit"') }
        : x,
    );
    const r = await deserializeWillFromVea(f, testHasher);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain("Interdit");
  });

  it("ignores files that are not part of the will", async () => {
    const r = await deserializeWillFromVea(
      [...(await files()), { path: "data/profile.json", content: "whatever" }],
      testHasher,
    );
    expect(r.ok).toBe(true);
  });
});

describe("version parsing", () => {
  it("rejects a version without snapshot, with a bad hash or a bad timestamp", () => {
    const base = {
      schemaVersion: 1,
      subject: "will-draft",
      sequence: 1,
      createdAt: "2026-10-06T08:00:00.000Z",
      hashAlgorithm: "sha-256",
      previousHash: null,
      hash: "a".repeat(64),
    };
    expect(parseWillVersion(base).ok).toBe(false);
    expect(parseWillVersion({ ...base, snapshot: createEmptyWillDraft(), hash: "xyz" }).ok).toBe(
      false,
    );
    expect(
      parseWillVersion({ ...base, snapshot: createEmptyWillDraft(), createdAt: "yesterday" }).ok,
    ).toBe(false);
    expect(parseWillVersion({ ...base, snapshot: createEmptyWillDraft(), sequence: -1 }).ok).toBe(
      false,
    );
    expect(parseWillVersion({ ...base, snapshot: createEmptyWillDraft() }).ok).toBe(true);
    expect(parseWillVersion(42).ok).toBe(false);
  });
});
