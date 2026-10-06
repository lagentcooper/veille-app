export * from './model';
export * from './findings';
export * from './environment';
export { assessDossier, type DossierAssessment, type WillDossier } from './assess';
export { assessWillDraft } from './rules-draft';
export { assessWishesDocument } from './rules-wishes';
export { assessPhysicalWillRecord } from './rules-physical-record';
export {
  FINDING_MESSAGE_KEYS,
  HANDWRITING_GUIDE_STEP_KEYS,
  NOTARY_STEP_KEY,
  WILL_DISCLAIMER_KEYS,
} from './messages';
export { canonicalJson } from './canonical';
export {
  appendVersion,
  createHistory,
  verifyHistory,
  type AppendResult,
  type VersionHistory,
  type VersionIssue,
  type VersionIssueCode,
  type WillVersion,
} from './versions';
export {
  parsePhysicalWillRecord,
  parseWillDraft,
  parseWillVersion,
  parseWishesDocument,
  type ParseIssue,
  type ParseIssueCode,
  type ParseResult,
} from './parse';
export { buildWillJsonSchema } from './vea-schema';
export {
  deserializeWillFromVea,
  serializeWillToVea,
  VEA_WILL_SCHEMA_PATH,
  VEA_WILL_STATE_PATH,
  type VeaFile,
  type VeaReadError,
  type VeaReadResult,
  type WillWorkspace,
} from './vea';
