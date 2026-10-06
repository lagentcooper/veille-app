import { worstLevel, type Assessment, type AssessmentLevel } from './findings';
import type { PhysicalWillRecord, WillDraft, WishesDocument } from './model';
import { assessPhysicalWillRecord } from './rules-physical-record';
import { assessWillDraft } from './rules-draft';
import { assessWishesDocument } from './rules-wishes';

export interface WillDossier {
  draft?: WillDraft;
  wishes?: WishesDocument;
  physicalRecord?: PhysicalWillRecord;
}

export interface DossierAssessment {
  draft?: Assessment;
  wishes?: Assessment;
  physicalRecord?: Assessment;
  /** Worst level among the objects that exist. Objects are independent: each keeps its own level. */
  level: AssessmentLevel;
}

/**
 * The three objects are assessed independently (the wishes remain useful whatever the will draft
 * needs); the dossier level is only a summary of the objects actually present.
 */
export function assessDossier(dossier: WillDossier): DossierAssessment {
  const draft = dossier.draft && assessWillDraft(dossier.draft);
  const wishes = dossier.wishes && assessWishesDocument(dossier.wishes);
  const physicalRecord = dossier.physicalRecord && assessPhysicalWillRecord(dossier.physicalRecord);
  const present = [draft, wishes, physicalRecord].filter((a): a is Assessment => a !== undefined);
  return {
    ...(draft ? { draft } : {}),
    ...(wishes ? { wishes } : {}),
    ...(physicalRecord ? { physicalRecord } : {}),
    level: worstLevel(present.map((a) => a.level)),
  };
}
