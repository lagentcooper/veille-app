import { BLOCKING_CASES } from './findings';
import { DRAFT_INCONSISTENCIES, DRAFT_MISSING_FIELDS } from './rules-draft';
import { RECORD_MISSING_FIELDS } from './rules-physical-record';
import { WISHES_DISCOURAGED, WISHES_MISSING_FIELDS } from './rules-wishes';

/**
 * Catalogue of every i18n key the will domain can emit. The French wording lives in
 * `apps/web/src/i18n` (Session C) and is ⚖️ to be validated by a lawyer; a test guarantees the
 * catalogue and the engine never drift apart.
 */
export const FINDING_MESSAGE_KEYS: readonly string[] = [
  ...new Set([
    ...DRAFT_MISSING_FIELDS.map((f) => `will.finding.missing.${f}`),
    ...WISHES_MISSING_FIELDS.map((f) => `will.finding.missing.${f}`),
    ...RECORD_MISSING_FIELDS.map((f) => `will.finding.missing.${f}`),
    ...DRAFT_INCONSISTENCIES.map((c) => `will.finding.inconsistency.${c}`),
    'will.finding.inconsistency.duplicateId',
    ...WISHES_DISCOURAGED.map((c) => `will.finding.discouraged.${c}`),
    ...BLOCKING_CASES.map((c) => `will.finding.blocking.${c}`),
  ]),
];

/** Disclaimers the UI must show permanently and non-dismissibly on the will screens (§2.7.3). */
export const WILL_DISCLAIMER_KEYS = [
  'will.disclaimer.notLegalAdvice',
  'will.disclaimer.handwrittenFormRequired',
  'will.disclaimer.consultNotary',
] as const;

/** Steps of the handwriting guide that accompanies `WillDraft` (art. 970 C. civ. — ⚖️ to validate). */
export const HANDWRITING_GUIDE_STEP_KEYS = [
  'will.guide.writeEverythingByHand',
  'will.guide.dateIt',
  'will.guide.signIt',
  'will.guide.keepItSafe',
  'will.guide.declareItsLocation',
  'will.guide.haveItReviewedByNotary',
] as const;

/** Closing step of the journey: presented as the good practice, never as a marginal option. */
export const NOTARY_STEP_KEY = 'will.step.reviewWithNotary';
