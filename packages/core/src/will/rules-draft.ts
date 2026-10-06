import {
  blocking,
  buildAssessment,
  inconsistency,
  missing,
  type Assessment,
  type Finding,
} from "./findings";
import type { Answer, TestatorSituation, WillDraft } from "./model";

/** Situation questions that must be answered, whatever the other answers are. */
export const ALWAYS_ASKED_SITUATION_FIELDS = [
  "maritalStatus",
  "hasChildren",
  "lifeInsurance",
  "ownsRealEstate",
  "ownsBusinessInterests",
  "assetsAbroad",
  "residesOutsideFrance",
  "foreignNationality",
  "legalProtection",
] as const;

/** Questions that only make sense in some situations (see `situationFindings`). */
export const CONDITIONAL_SITUATION_FIELDS = [
  "spousalDonation",
  "hasMinorChildren",
  "blendedFamily",
] as const;

export const DRAFT_MISSING_FIELDS = [
  "testatorFullName",
  "beneficiaries",
  "provisions",
  "handwritingGuideAcknowledged",
  ...ALWAYS_ASKED_SITUATION_FIELDS.map((f) => `situation.${f}`),
  ...CONDITIONAL_SITUATION_FIELDS.map((f) => `situation.${f}`),
  "beneficiary.displayName",
  "beneficiary.isMinor",
  "provision.subject",
] as const;

export const DRAFT_INCONSISTENCIES = [
  "provisionWithoutBeneficiary",
  "beneficiaryWithoutProvision",
  "duplicateId",
] as const;

const isBlank = (s: string): boolean => s.trim().length === 0;

function unknownAnswer(value: Answer | string): boolean {
  return value === "unknown";
}

/**
 * ⚖️ **VALIDATION JURIDIQUE REQUISE** — each blocking trigger below transcribes a bullet of
 * `docs/product/02-contraintes-juridiques.md` §2.2; none of them computes a legal consequence.
 * The engine detects, warns and orients; it never calculates a reserve nor interprets a regime.
 */
function situationFindings(s: TestatorSituation): Finding[] {
  const out: Finding[] = [];
  const f = (name: string): string => `situation.${name}`;

  for (const name of ALWAYS_ASKED_SITUATION_FIELDS) {
    if (unknownAnswer(s[name])) out.push(missing(f(name)));
  }

  // 1. Héritiers réservataires: children, failing which the spouse (§2.2). No reserve is computed.
  if (s.hasChildren === "yes") out.push(blocking("reserved-heirs", "children", f("hasChildren")));
  else if (s.hasChildren === "no" && s.maritalStatus === "married")
    out.push(blocking("reserved-heirs", "spouse", f("maritalStatus")));

  // 2. Immobilier, entreprise, parts sociales, exploitation agricole.
  if (s.ownsRealEstate === "yes")
    out.push(blocking("real-estate-or-business", "real-estate", f("ownsRealEstate")));
  if (s.ownsBusinessInterests === "yes")
    out.push(blocking("real-estate-or-business", "business", f("ownsBusinessInterests")));

  // 3. Élément d'extranéité.
  if (s.assetsAbroad === "yes")
    out.push(blocking("foreign-element", "assets-abroad", f("assetsAbroad")));
  if (s.residesOutsideFrance === "yes")
    out.push(blocking("foreign-element", "residence-abroad", f("residesOutsideFrance")));
  if (s.foreignNationality === "yes")
    out.push(blocking("foreign-element", "foreign-nationality", f("foreignNationality")));

  // 4. Régime matrimonial, PACS, donation entre époux, assurance-vie.
  if (s.maritalStatus === "married")
    out.push(
      blocking("marital-regime-pacs-or-life-insurance", "marital-regime", f("maritalStatus")),
    );
  if (s.maritalStatus === "pacs")
    out.push(blocking("marital-regime-pacs-or-life-insurance", "pacs", f("maritalStatus")));
  if (s.spousalDonation === "yes")
    out.push(
      blocking("marital-regime-pacs-or-life-insurance", "spousal-donation", f("spousalDonation")),
    );
  if (s.lifeInsurance === "yes")
    out.push(
      blocking("marital-regime-pacs-or-life-insurance", "life-insurance", f("lifeInsurance")),
    );
  if (s.maritalStatus !== "single" && unknownAnswer(s.spousalDonation))
    out.push(missing(f("spousalDonation")));

  // 5. Mineur / majeur protégé / incapacité.
  if (
    s.legalProtection === "guardianship" ||
    s.legalProtection === "curatorship" ||
    s.legalProtection === "other"
  )
    out.push(blocking("minor-or-protected-person", "testator-protected", f("legalProtection")));

  // Children-dependent questions are only asked once we know there are children.
  if (s.hasChildren === "yes") {
    if (unknownAnswer(s.hasMinorChildren)) out.push(missing(f("hasMinorChildren")));
    if (s.hasMinorChildren === "yes")
      out.push(blocking("minor-or-protected-person", "minor-child", f("hasMinorChildren")));
    if (unknownAnswer(s.blendedFamily)) out.push(missing(f("blendedFamily")));
    if (s.blendedFamily === "yes")
      out.push(blocking("blended-family", "blended-family", f("blendedFamily")));
  }
  return out;
}

function contentFindings(d: WillDraft): Finding[] {
  const out: Finding[] = [];

  if (isBlank(d.testatorFullName)) out.push(missing("testatorFullName"));
  if (d.beneficiaries.length === 0) out.push(missing("beneficiaries"));
  if (d.provisions.length === 0) out.push(missing("provisions"));
  if (!d.handwritingGuideAcknowledged) out.push(missing("handwritingGuideAcknowledged"));

  const ids = [...d.beneficiaries.map((b) => b.id), ...d.provisions.map((p) => p.id)];
  if (new Set(ids).size !== ids.length) out.push(inconsistency("duplicateId"));

  const beneficiaryIds = new Set(d.beneficiaries.map((b) => b.id));
  const targeted = new Set(d.provisions.map((p) => p.beneficiaryId));

  d.beneficiaries.forEach((b, i) => {
    const base = `beneficiaries.${i}`;
    if (isBlank(b.displayName))
      out.push({ ...missing("beneficiary.displayName"), field: `${base}.displayName` });
    if (b.kind === "natural-person" && unknownAnswer(b.isMinor))
      out.push({ ...missing("beneficiary.isMinor"), field: `${base}.isMinor` });
    // 5. Legs à une personne morale.
    if (b.kind === "legal-entity")
      out.push(blocking("legal-entity-beneficiary", "legal-entity", `${base}.kind`));
    // 5. Mineur.
    if (b.kind === "natural-person" && b.isMinor === "yes")
      out.push(blocking("minor-or-protected-person", "minor-beneficiary", `${base}.isMinor`));
    if (!targeted.has(b.id)) out.push(inconsistency("beneficiaryWithoutProvision", `${base}.id`));
  });

  d.provisions.forEach((p, i) => {
    const base = `provisions.${i}`;
    if (isBlank(p.subject)) out.push({ ...missing("provision.subject"), field: `${base}.subject` });
    if (!beneficiaryIds.has(p.beneficiaryId))
      out.push(inconsistency("provisionWithoutBeneficiary", `${base}.beneficiaryId`));
    // 9. Toute clause conditionnelle ou de charge.
    if (p.clause !== "none") out.push(blocking("conditional-clause", p.clause, `${base}.clause`));
  });

  return out;
}

export function assessWillDraft(draft: WillDraft): Assessment {
  return buildAssessment([...situationFindings(draft.situation), ...contentFindings(draft)]);
}
