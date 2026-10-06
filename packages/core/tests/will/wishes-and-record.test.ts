import { describe, expect, it } from 'vitest';
import {
  assessDossier,
  assessPhysicalWillRecord,
  assessWishesDocument,
  createEmptyPhysicalWillRecord,
  createEmptyWillDraft,
  createEmptyWishesDocument,
} from '../../src/will';
import { completeDraft, completeRecord, completeWishes } from './helpers';

const wishCodes = (d = completeWishes()): string[] => assessWishesDocument(d).findings.map((f) => f.code);

describe('WishesDocument completeness', () => {
  it('a filled-in document is complete', () => {
    expect(assessWishesDocument(completeWishes()).level).toBe('complete');
  });

  it('an empty document reports missing content and unanswered body wishes', () => {
    const a = assessWishesDocument(createEmptyWishesDocument());
    expect(a.level).toBe('incomplete');
    expect(a.findings.map((f) => f.code)).toEqual(['missing.content', 'missing.hasBodyWishes']);
  });

  it('a message without recipient or text, and papers without location, are reported by path', () => {
    const d = completeWishes();
    d.messages = [{ id: 'm1', recipientLabel: '', text: '' }];
    d.papers = [{ id: 'k1', label: '', location: '' }];
    const fields = assessWishesDocument(d).findings.map((f) => f.field);
    expect(fields).toEqual(
      expect.arrayContaining(['messages.0.recipientLabel', 'messages.0.text', 'papers.0.label', 'papers.0.location']),
    );
  });

  it('warns (⚠️, not 🛑) when a password seems to be stored for the heirs', () => {
    const d = completeWishes();
    d.papers = [{ id: 'k1', label: 'Banque', location: 'Mon mot de passe est dans le carnet' }];
    const a = assessWishesDocument(d);
    expect(a.level).toBe('incomplete');
    expect(a.findings.find((f) => f.kind === 'discouraged')?.field).toBe('papers.0.location');
  });

  it('does not warn when the text only says where papers are', () => {
    expect(wishCodes()).not.toContain('discouraged.credentialsStored');
  });
});

describe('PhysicalWillRecord completeness', () => {
  it('an undeclared existence is missing information', () => {
    expect(assessPhysicalWillRecord(createEmptyPhysicalWillRecord()).findings.map((f) => f.code)).toEqual([
      'missing.existence',
    ]);
  });

  it('declaring that no handwritten will exists is complete', () => {
    expect(assessPhysicalWillRecord({ ...createEmptyPhysicalWillRecord(), existence: 'none' }).level).toBe('complete');
  });

  it('an existing will needs a location kind, a detail and the central-file answer', () => {
    const codes = assessPhysicalWillRecord({ ...createEmptyPhysicalWillRecord(), existence: 'exists' }).findings.map(
      (f) => f.code,
    );
    expect(codes).toEqual(['missing.locationKind', 'missing.locationDetail', 'missing.registeredInCentralFile']);
  });

  it('a fully declared location is complete and never blocks', () => {
    const a = assessPhysicalWillRecord(completeRecord());
    expect(a.level).toBe('complete');
    expect(a.blocksReviewStep).toBe(false);
  });
});

describe('dossier assessment', () => {
  it('keeps each object independent and summarises with the worst level present', () => {
    const blocked = completeDraft();
    blocked.situation = { ...blocked.situation, ownsRealEstate: 'yes' };
    const a = assessDossier({ draft: blocked, wishes: completeWishes(), physicalRecord: completeRecord() });
    expect(a.draft?.level).toBe('professional-required');
    expect(a.wishes?.level).toBe('complete');
    expect(a.physicalRecord?.level).toBe('complete');
    expect(a.level).toBe('professional-required');
  });

  it('ignores objects that do not exist yet', () => {
    const a = assessDossier({ wishes: completeWishes() });
    expect(a.level).toBe('complete');
    expect(a.draft).toBeUndefined();
  });

  it('an empty dossier is trivially complete (nothing started, nothing missing)', () => {
    expect(assessDossier({}).level).toBe('complete');
    expect(assessDossier({ draft: createEmptyWillDraft() }).level).toBe('incomplete');
  });
});
