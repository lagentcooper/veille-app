import { describe, expect, it } from "vitest";
import {
  appendVersion,
  buildWillJsonSchema,
  createEmptyPhysicalWillRecord,
  createEmptyWillDraft,
  createEmptyWishesDocument,
  createHistory,
  deserializeWillFromVea,
  serializeWillToVea,
  VEA_WILL_STATE_PATH,
  type VeaFile,
  type WillWorkspace,
} from "../../src/will";
import { completeDraft, completeRecord, completeWishes, testEnv, testHasher } from "./helpers";

async function workspace(): Promise<WillWorkspace> {
  const env = testEnv();
  const draft = completeDraft();
  const wishes = completeWishes();
  const physicalRecord = completeRecord();
  let dh = createHistory<typeof draft>("will-draft");
  dh = (await appendVersion(dh, createEmptyWillDraft(), env)).history;
  dh = (await appendVersion(dh, draft, env)).history;
  const wh = (await appendVersion(createHistory<typeof wishes>("wishes-document"), wishes, env))
    .history;
  const ph = (
    await appendVersion(
      createHistory<typeof physicalRecord>("physical-will-record"),
      physicalRecord,
      env,
    )
  ).history;
  return {
    draft,
    wishes,
    physicalRecord,
    histories: { draft: dh, wishes: wh, physicalRecord: ph },
  };
}

const replace = (files: VeaFile[], path: string, f: (c: string) => string): VeaFile[] =>
  files.map((x) => (x.path === path ? { ...x, content: f(x.content) } : x));

describe("VEA serialization of the will", () => {
  it("produces the documented layout, sorted, with the schema and one file per version", async () => {
    const paths = serializeWillToVea(await workspace()).map((f) => f.path);
    expect(paths).toEqual([
      "data/will/versions/physical-will-record-0001.json",
      "data/will/versions/will-draft-0001.json",
      "data/will/versions/will-draft-0002.json",
      "data/will/versions/wishes-document-0001.json",
      "data/will/will.json",
      "schemas/will.schema.json",
    ]);
  });

  it("round-trips: serialize → deserialize gives an identical workspace", async () => {
    const ws = await workspace();
    const r = await deserializeWillFromVea(serializeWillToVea(ws), testHasher);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.workspace).toEqual(ws);
  });

  it("is deterministic: same state, same bytes", async () => {
    const ws = await workspace();
    expect(serializeWillToVea(ws)).toEqual(serializeWillToVea(ws));
  });

  it("files are plain readable JSON (open format, no binary)", async () => {
    for (const f of serializeWillToVea(await workspace()))
      expect(() => JSON.parse(f.content)).not.toThrow();
  });

  it("carries schemaVersion on every entity and on every version", async () => {
    for (const f of serializeWillToVea(await workspace())) {
      if (f.path.startsWith("schemas/")) continue;
      expect(f.content).toContain('"schemaVersion": 1');
    }
  });

  it("rejects the whole import when a past version was altered", async () => {
    const files = replace(
      serializeWillToVea(await workspace()),
      "data/will/versions/will-draft-0002.json",
      (c) => c.replace("Personne Fictive", "Falsifié"),
    );
    const r = await deserializeWillFromVea(files, testHasher);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors).toContainEqual(
        expect.objectContaining({ code: "altered-history", subject: "will-draft" }),
      );
  });

  it("rejects the import when a version file was deleted from the archive", async () => {
    const files = serializeWillToVea(await workspace()).filter(
      (f) => !f.path.endsWith("will-draft-0001.json"),
    );
    const r = await deserializeWillFromVea(files, testHasher);
    expect(r.ok).toBe(false);
  });

  it("rejects a version file whose name does not match its content", async () => {
    const files = serializeWillToVea(await workspace()).map((f) =>
      f.path.endsWith("will-draft-0002.json")
        ? { ...f, path: "data/will/versions/will-draft-0007.json" }
        : f,
    );
    const r = await deserializeWillFromVea(files, testHasher);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.code)).toContain("path-mismatch");
  });

  it("rejects a missing state file, invalid JSON and an unsupported schemaVersion", async () => {
    const files = serializeWillToVea(await workspace());
    const noState = await deserializeWillFromVea(
      files.filter((f) => f.path !== VEA_WILL_STATE_PATH),
      testHasher,
    );
    expect(noState).toEqual({
      ok: false,
      errors: [{ code: "missing-file", path: VEA_WILL_STATE_PATH }],
    });

    const badJson = await deserializeWillFromVea(
      replace(files, VEA_WILL_STATE_PATH, () => "{nope"),
      testHasher,
    );
    expect(badJson).toEqual({
      ok: false,
      errors: [{ code: "invalid-json", path: VEA_WILL_STATE_PATH }],
    });

    const future = await deserializeWillFromVea(
      replace(files, VEA_WILL_STATE_PATH, (c) =>
        c.replace('"schemaVersion": 1', '"schemaVersion": 2'),
      ),
      testHasher,
    );
    expect(future.ok).toBe(false);
    if (!future.ok) expect(JSON.stringify(future.errors)).toContain("unsupported-schema-version");
  });

  it("import errors never echo the offending content (privacy)", async () => {
    const files = replace(serializeWillToVea(await workspace()), VEA_WILL_STATE_PATH, (c) =>
      c.replace('"clause": "none"', '"clause": "Secret Cité"'),
    );
    const r = await deserializeWillFromVea(files, testHasher);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain("Secret Cité");
  });

  it("an empty workspace round-trips too", async () => {
    const ws: WillWorkspace = {
      draft: createEmptyWillDraft(),
      wishes: createEmptyWishesDocument(),
      physicalRecord: createEmptyPhysicalWillRecord(),
      histories: {
        draft: createHistory("will-draft"),
        wishes: createHistory("wishes-document"),
        physicalRecord: createHistory("physical-will-record"),
      },
    };
    const r = await deserializeWillFromVea(serializeWillToVea(ws), testHasher);
    expect(r.ok && r.workspace).toEqual(ws);
  });
});

describe("will JSON Schema", () => {
  const defs = (
    buildWillJsonSchema() as { $defs: Record<string, { properties: Record<string, unknown> }> }
  ).$defs;
  const keys = (o: object): string[] => Object.keys(o).sort();

  it("lists exactly the properties of each entity (schema and model cannot drift)", () => {
    expect(keys(defs["WillDraft"]!.properties)).toEqual(keys(createEmptyWillDraft()));
    expect(keys(defs["WishesDocument"]!.properties)).toEqual(keys(createEmptyWishesDocument()));
    expect(keys(defs["PhysicalWillRecord"]!.properties)).toEqual(
      keys(createEmptyPhysicalWillRecord()),
    );
    expect(
      keys((defs["WillDraft"]!.properties["situation"] as { properties: object }).properties),
    ).toEqual(keys(createEmptyWillDraft().situation));
  });
});
