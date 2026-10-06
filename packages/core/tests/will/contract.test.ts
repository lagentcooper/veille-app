import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assessWillDraft,
  assessWishesDocument,
  BLOCKING_CASES,
  FINDING_MESSAGE_KEYS,
  HANDWRITING_GUIDE_STEP_KEYS,
  NOTARY_STEP_KEY,
  WILL_DISCLAIMER_KEYS,
  buildWillJsonSchema,
  createEmptyPhysicalWillRecord,
  createEmptyWillDraft,
  createEmptyWishesDocument,
  assessPhysicalWillRecord,
  type Finding,
} from '../../src/will';
import { completeDraft, completeWishes } from './helpers';

const SRC = join(__dirname, '../../src/will');
const sources = readdirSync(SRC)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => ({ file: f, text: readFileSync(join(SRC, f), 'utf8') }));

describe('purity of packages/core/src/will (AGENTS.md §4)', () => {
  it('imports no framework, no Node module and no browser API', () => {
    for (const { file, text: raw } of sources) {
      const imports = [...raw.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]!);
      // Inspect code only: comments and string literals may legitimately mention these words.
      const text = raw
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, "''");
      for (const i of imports) expect(i.startsWith('.'), `${file} imports ${i}`).toBe(true);
      expect(text, file).not.toMatch(/\b(window|document|indexedDB|localStorage|sessionStorage|navigator|globalThis\.crypto)\b/);
      expect(text, file).not.toMatch(/(?<![.\w])crypto\./);
      expect(text, file).not.toMatch(/\bDate\.now\(|new Date\(\)|Math\.random\(|console\./);
    }
  });
});

describe('domain vocabulary', () => {
  it('never produces the word "valid" in an emitted key, code or message', () => {
    const emitted = [
      ...FINDING_MESSAGE_KEYS,
      ...WILL_DISCLAIMER_KEYS,
      ...HANDWRITING_GUIDE_STEP_KEYS,
      NOTARY_STEP_KEY,
      ...BLOCKING_CASES,
    ];
    for (const k of emitted) expect(k).not.toMatch(/valid/i);
  });

  it('every finding the engine can emit has a key in the catalogue', () => {
    const findings: Finding[] = [
      ...assessWillDraft(createEmptyWillDraft()).findings,
      ...assessWishesDocument(createEmptyWishesDocument()).findings,
      ...assessPhysicalWillRecord({ ...createEmptyPhysicalWillRecord(), existence: 'exists' }).findings,
      ...assessWillDraft({
        ...completeDraft(),
        beneficiaries: [
          { id: 'b1', kind: 'legal-entity', displayName: '', isMinor: 'unknown' },
          { id: 'b2', kind: 'natural-person', displayName: '', isMinor: 'unknown' },
        ],
        provisions: [{ id: 'b1', beneficiaryId: 'zz', subject: '', clause: 'charge' }],
      }).findings,
      ...assessWishesDocument({ ...completeWishes(), hasBodyWishes: 'yes', papers: [{ id: 'x', label: '', location: 'password' }] }).findings,
    ];
    expect(findings.length).toBeGreaterThan(10);
    for (const f of findings) {
      expect(FINDING_MESSAGE_KEYS, `${f.code} → ${f.messageKey}`).toContain(f.messageKey);
      expect(f.messageKey.startsWith('will.finding.')).toBe(true);
    }
  });

  it('the schema never claims validity and states that hashes are not legal proof', () => {
    const text = JSON.stringify(buildWillJsonSchema());
    expect(text).toContain('None of them is a valid will');
    expect(text).toContain('not legal proof');
  });

  it('the review-step guidance is always present: notary is "recommended" at the very least', () => {
    expect(['recommended', 'required']).toContain(assessWillDraft(completeDraft()).notaryAdvice);
  });
});
