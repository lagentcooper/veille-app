import { createHash } from 'node:crypto';
import {
  createEmptyPhysicalWillRecord,
  createEmptyWillDraft,
  createEmptyWishesDocument,
  type PhysicalWillRecord,
  type WillClock,
  type WillDraft,
  type WillEnvironment,
  type WillHasher,
  type WishesDocument,
} from '../../src/will';

/** Hasher for tests only: the domain itself never imports `crypto`. */
export const testHasher: WillHasher = {
  algorithm: 'sha-256',
  hashHex: async (input) => createHash('sha256').update(input, 'utf8').digest('hex'),
};

export function steppingClock(start = Date.UTC(2026, 9, 6, 8, 0, 0)): WillClock {
  let t = start;
  return { nowIso: () => new Date((t += 1000)).toISOString() };
}

export const testEnv = (): WillEnvironment => ({ clock: steppingClock(), hasher: testHasher });

/** Fictitious data only (AGENTS.md §6.4): no real name, address or amount. */
export function completeDraft(): WillDraft {
  return {
    ...createEmptyWillDraft(),
    testatorFullName: 'Personne Fictive',
    situation: {
      maritalStatus: 'single',
      spousalDonation: 'no',
      hasChildren: 'no',
      hasMinorChildren: 'no',
      blendedFamily: 'no',
      lifeInsurance: 'no',
      ownsRealEstate: 'no',
      ownsBusinessInterests: 'no',
      assetsAbroad: 'no',
      residesOutsideFrance: 'no',
      foreignNationality: 'no',
      legalProtection: 'none',
    },
    beneficiaries: [{ id: 'b1', kind: 'natural-person', displayName: 'Bénéficiaire Fictif', isMinor: 'no' }],
    provisions: [{ id: 'p1', beneficiaryId: 'b1', subject: 'Mon vélo', clause: 'none' }],
    handwritingGuideAcknowledged: true,
  };
}

export function completeWishes(): WishesDocument {
  return {
    ...createEmptyWishesDocument(),
    funeralWishes: 'Une cérémonie simple.',
    messages: [{ id: 'm1', recipientLabel: 'Mes proches', text: 'Merci pour tout.' }],
    papers: [{ id: 'k1', label: 'Contrats', location: 'Classeur bleu, bureau' }],
    hasBodyWishes: 'no',
  };
}

export function completeRecord(): PhysicalWillRecord {
  return {
    ...createEmptyPhysicalWillRecord(),
    existence: 'exists',
    locationKind: 'home',
    locationDetail: 'Tiroir du bureau',
    registeredInCentralFile: 'no',
  };
}
