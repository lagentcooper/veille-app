/**
 * Data model of the will domain — three distinct objects (ADR-0008, decision D2 option (c)):
 *
 *  - `WillDraft`          draft meant to be COPIED BY HAND by the user (art. 970 C. civ.);
 *  - `WishesDocument`     non-testamentary wishes, useful with or without any valid will;
 *  - `PhysicalWillRecord` declaration of WHERE an existing handwritten will is kept.
 *
 * ⚖️ **VALIDATION JURIDIQUE REQUISE** — the shape of these objects follows
 * `docs/product/02-contraintes-juridiques.md` and has not been reviewed by a lawyer.
 *
 * Data minimization (AGENTS.md §6.1): every field below serves an identified use in the completeness
 * engine or in the document to be copied. Free text is bounded (see `LIMITS`).
 */

export const WILL_SCHEMA_VERSION = 1 as const;
export type WillSchemaVersion = typeof WILL_SCHEMA_VERSION;

export const LIMITS = {
  shortText: 200,
  longText: 10_000,
  items: 200,
} as const;

/** Tri-state answer: `unknown` means "not answered yet" and is reported as missing information. */
export const ANSWERS = ["yes", "no", "unknown"] as const;
export type Answer = (typeof ANSWERS)[number];

export const MARITAL_STATUSES = [
  "single",
  "married",
  "pacs",
  "divorced",
  "widowed",
  "unknown",
] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const LEGAL_PROTECTIONS = [
  "none",
  "guardianship",
  "curatorship",
  "other",
  "unknown",
] as const;
export type LegalProtection = (typeof LEGAL_PROTECTIONS)[number];

/** Facts declared by the user; they drive the "consult a professional" cases (§2.2). */
export interface TestatorSituation {
  maritalStatus: MaritalStatus;
  /** Donation between spouses (not asked when `maritalStatus` is `single`). */
  spousalDonation: Answer;
  hasChildren: Answer;
  hasMinorChildren: Answer;
  /** Children from different unions / blended family. */
  blendedFamily: Answer;
  lifeInsurance: Answer;
  ownsRealEstate: Answer;
  /** Business, company shares, farm holding. */
  ownsBusinessInterests: Answer;
  assetsAbroad: Answer;
  residesOutsideFrance: Answer;
  foreignNationality: Answer;
  /** Tutelle / curatelle / other protection regime of the person writing. */
  legalProtection: LegalProtection;
}

export const BENEFICIARY_KINDS = ["natural-person", "legal-entity"] as const;
export type BeneficiaryKind = (typeof BENEFICIARY_KINDS)[number];

export interface Beneficiary {
  id: string;
  kind: BeneficiaryKind;
  displayName: string;
  /** Only meaningful for a natural person; `unknown` is reported as missing information. */
  isMinor: Answer;
}

export const PROVISION_CLAUSES = ["none", "condition", "charge"] as const;
export type ProvisionClause = (typeof PROVISION_CLAUSES)[number];

export interface Provision {
  id: string;
  beneficiaryId: string;
  /** What is left to the beneficiary, in the user's own words. */
  subject: string;
  /** Any condition or charge attached to the gift (blocking case). */
  clause: ProvisionClause;
}

export interface WillDraft {
  schemaVersion: WillSchemaVersion;
  testatorFullName: string;
  situation: TestatorSituation;
  beneficiaries: Beneficiary[];
  provisions: Provision[];
  /** The user has read the handwriting guide (write it all by hand, date it, sign it, keep it). */
  handwritingGuideAcknowledged: boolean;
}

export interface WishMessage {
  id: string;
  recipientLabel: string;
  text: string;
}

export interface PapersLocation {
  id: string;
  label: string;
  location: string;
}

export interface WishesDocument {
  schemaVersion: WillSchemaVersion;
  funeralWishes: string;
  messages: WishMessage[];
  papers: PapersLocation[];
  /** Organ / body donation: specific regimes, blocking case (§2.2). */
  hasBodyWishes: Answer;
  bodyWishesNote: string;
}

export const WILL_EXISTENCES = ["unknown", "none", "exists"] as const;
export type WillExistence = (typeof WILL_EXISTENCES)[number];

export const WILL_LOCATION_KINDS = [
  "unspecified",
  "home",
  "notary",
  "relative",
  "bank-safe",
  "other",
] as const;
export type WillLocationKind = (typeof WILL_LOCATION_KINDS)[number];

export interface PhysicalWillRecord {
  schemaVersion: WillSchemaVersion;
  existence: WillExistence;
  locationKind: WillLocationKind;
  locationDetail: string;
  /** Registered in the Fichier Central des Dispositions de Dernières Volontés. */
  registeredInCentralFile: Answer;
}

export type WillSubject = "will-draft" | "wishes-document" | "physical-will-record";
export const WILL_SUBJECTS: readonly WillSubject[] = [
  "will-draft",
  "wishes-document",
  "physical-will-record",
];

export type WillSnapshot = WillDraft | WishesDocument | PhysicalWillRecord;

export function createEmptyWillDraft(): WillDraft {
  return {
    schemaVersion: WILL_SCHEMA_VERSION,
    testatorFullName: "",
    situation: {
      maritalStatus: "unknown",
      spousalDonation: "unknown",
      hasChildren: "unknown",
      hasMinorChildren: "unknown",
      blendedFamily: "unknown",
      lifeInsurance: "unknown",
      ownsRealEstate: "unknown",
      ownsBusinessInterests: "unknown",
      assetsAbroad: "unknown",
      residesOutsideFrance: "unknown",
      foreignNationality: "unknown",
      legalProtection: "unknown",
    },
    beneficiaries: [],
    provisions: [],
    handwritingGuideAcknowledged: false,
  };
}

export function createEmptyWishesDocument(): WishesDocument {
  return {
    schemaVersion: WILL_SCHEMA_VERSION,
    funeralWishes: "",
    messages: [],
    papers: [],
    hasBodyWishes: "unknown",
    bodyWishesNote: "",
  };
}

export function createEmptyPhysicalWillRecord(): PhysicalWillRecord {
  return {
    schemaVersion: WILL_SCHEMA_VERSION,
    existence: "unknown",
    locationKind: "unspecified",
    locationDetail: "",
    registeredInCentralFile: "unknown",
  };
}
