import { describe, expect, it } from 'vitest';
import { appendVersion, createHistory, verifyHistory, type VersionHistory, type WillDraft } from '../../src/will';
import { completeDraft, testEnv, testHasher } from './helpers';

async function historyOf(...drafts: WillDraft[]): Promise<VersionHistory<WillDraft>> {
  const env = testEnv();
  let h = createHistory<WillDraft>('will-draft');
  for (const d of drafts) h = (await appendVersion(h, d, env)).history;
  return h;
}

const edited = (n: number): WillDraft => ({ ...completeDraft(), testatorFullName: `Personne ${n}` });

describe('WillVersion history', () => {
  it('records snapshot, timestamp and hash, chained from the first version', async () => {
    const h = await historyOf(completeDraft(), edited(2));
    const [v1, v2] = h.versions;
    expect(v1?.sequence).toBe(1);
    expect(v1?.previousHash).toBeNull();
    expect(v2?.previousHash).toBe(v1?.hash);
    expect(v1?.createdAt).toMatch(/^2026-10-06T08:00:0\d\.000Z$/);
    expect(v1?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(v1?.hash).not.toBe(v2?.hash);
  });

  it('keeps the complete history and never rewrites an earlier version', async () => {
    const h1 = await historyOf(completeDraft());
    const h2 = (await appendVersion(h1, edited(2), testEnv())).history;
    expect(h2.versions).toHaveLength(2);
    expect(h2.versions[0]).toBe(h1.versions[0]);
    expect(h1.versions).toHaveLength(1);
  });

  it('versions are deeply frozen: mutation is impossible, not just discouraged', async () => {
    const h = await historyOf(completeDraft());
    const v = h.versions[0]!;
    expect(() => {
      (v as { sequence: number }).sequence = 9;
    }).toThrow(TypeError);
    expect(() => {
      v.snapshot.beneficiaries.push(v.snapshot.beneficiaries[0]!);
    }).toThrow(TypeError);
  });

  it('the snapshot is a copy: editing the source draft later does not alter the version', async () => {
    const draft = completeDraft();
    const h = await historyOf(draft);
    draft.testatorFullName = 'Changé après coup';
    expect(h.versions[0]?.snapshot.testatorFullName).toBe('Personne Fictive');
  });

  it('does not record an empty version when nothing changed', async () => {
    const env = testEnv();
    const h1 = (await appendVersion(createHistory<WillDraft>('will-draft'), completeDraft(), env)).history;
    const r = await appendVersion(h1, completeDraft(), env);
    expect(r.created).toBe(false);
    expect(r.history).toBe(h1);
  });

  it('the hash does not depend on key order', async () => {
    const a = completeDraft();
    const reordered = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(a).reverse()))) as WillDraft;
    const env1 = testEnv();
    const env2 = testEnv();
    const h1 = (await appendVersion(createHistory<WillDraft>('will-draft'), a, env1)).history;
    const h2 = (await appendVersion(createHistory<WillDraft>('will-draft'), reordered, env2)).history;
    expect(h1.versions[0]?.hash).toBe(h2.versions[0]?.hash);
  });

  it('a pristine history verifies cleanly', async () => {
    expect(await verifyHistory(await historyOf(completeDraft(), edited(2), edited(3)), testHasher)).toEqual([]);
  });

  it('detects an altered snapshot (hash-mismatch)', async () => {
    const h = await historyOf(completeDraft(), edited(2));
    const forged = structuredClone(h) as unknown as { versions: WillDraftVersionLike[] };
    forged.versions[0]!.snapshot.testatorFullName = 'Falsifié';
    expect(await verifyHistory(forged as unknown as VersionHistory, testHasher)).toContainEqual({
      sequence: 1,
      code: 'hash-mismatch',
    });
  });

  it('detects a removed intermediate version (sequence gap and broken chain)', async () => {
    const h = await historyOf(completeDraft(), edited(2), edited(3));
    const gapped: VersionHistory = { subject: h.subject, versions: [h.versions[0]!, h.versions[2]!] };
    const codes = (await verifyHistory(gapped, testHasher)).map((i) => i.code);
    expect(codes).toContain('sequence-gap');
    expect(codes).toContain('chain-broken');
  });

  it('detects a version whose subject differs from its history', async () => {
    const h = await historyOf(completeDraft());
    const wrong: VersionHistory = { subject: 'wishes-document', versions: h.versions };
    expect((await verifyHistory(wrong, testHasher)).map((i) => i.code)).toContain('subject-mismatch');
  });
});

interface WillDraftLike { testatorFullName: string }
interface WillDraftVersionLike { snapshot: WillDraftLike }

describe('WillVersion history — foreign formats', () => {
  it('flags an unsupported schema version and hash algorithm', async () => {
    const h = await historyOf(completeDraft());
    const foreign = { subject: h.subject, versions: [{ ...h.versions[0]!, schemaVersion: 2, hashAlgorithm: 'sha-512' }] };
    const codes = (await verifyHistory(foreign as unknown as VersionHistory, testHasher)).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['unsupported-schema-version', 'unsupported-hash-algorithm']));
  });
});
