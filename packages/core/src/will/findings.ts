/**
 * Result vocabulary of the completeness engine.
 *
 * Three levels, mirroring the product contract: ✅ `complete` · ⚠️ `incomplete` ·
 * 🛑 `professional-required`. The domain never says a document is "valid": the strongest positive
 * statement is "complete according to the checklist" (ADR-0008 §2).
 *
 * Every user-facing text is an i18n KEY plus parameters — wording lives in `apps/web/src/i18n`.
 */

export type AssessmentLevel = "complete" | "incomplete" | "professional-required";

export type FindingKind = "missing" | "inconsistency" | "discouraged" | "blocking";

/** Situations from §2.2 that stop the review step and send the user to a notary / lawyer. */
export const BLOCKING_CASES = [
  "reserved-heirs",
  "real-estate-or-business",
  "foreign-element",
  "marital-regime-pacs-or-life-insurance",
  "legal-entity-beneficiary",
  "minor-or-protected-person",
  "blended-family",
  "body-wishes",
  "conditional-clause",
] as const;
export type BlockingCase = (typeof BLOCKING_CASES)[number];

export interface Finding {
  kind: FindingKind;
  /** Stable machine code, e.g. `missing.testatorFullName` or `blocking.reserved-heirs`. */
  code: string;
  level: Exclude<AssessmentLevel, "complete">;
  /** i18n key, always under `will.finding.`. */
  messageKey: string;
  /** Dotted path of the field to fix, when there is one. */
  field?: string;
  /** Interpolation parameters; never contains free text typed by the user. */
  params?: Readonly<Record<string, string | number>>;
}

export type NotaryAdvice = "recommended" | "required";

export interface Assessment {
  level: AssessmentLevel;
  findings: readonly Finding[];
  /** The review step is blocked as soon as one 🛑 finding exists. */
  blocksReviewStep: boolean;
  /**
   * Going to a notary is the good practice in every case; it becomes `required` when a blocking case
   * applies. The final step of the journey always presents it.
   */
  notaryAdvice: NotaryAdvice;
}

const RANK: Record<AssessmentLevel, number> = {
  complete: 0,
  incomplete: 1,
  "professional-required": 2,
};

export function worstLevel(levels: readonly AssessmentLevel[]): AssessmentLevel {
  return levels.reduce<AssessmentLevel>((acc, l) => (RANK[l] > RANK[acc] ? l : acc), "complete");
}

export function buildAssessment(findings: readonly Finding[]): Assessment {
  const level = worstLevel(findings.map((f): AssessmentLevel => f.level));
  return {
    level,
    findings,
    blocksReviewStep: level === "professional-required",
    notaryAdvice: level === "professional-required" ? "required" : "recommended",
  };
}

export function missing(field: string, extra?: Pick<Finding, "params">): Finding {
  return {
    kind: "missing",
    code: `missing.${field}`,
    level: "incomplete",
    messageKey: `will.finding.missing.${field}`,
    field,
    ...extra,
  };
}

export function inconsistency(code: string, field?: string, params?: Finding["params"]): Finding {
  return {
    kind: "inconsistency",
    code: `inconsistency.${code}`,
    level: "incomplete",
    messageKey: `will.finding.inconsistency.${code}`,
    ...(field === undefined ? {} : { field }),
    ...(params === undefined ? {} : { params }),
  };
}

export function blocking(blockCase: BlockingCase, trigger: string, field?: string): Finding {
  return {
    kind: "blocking",
    code: `blocking.${blockCase}`,
    level: "professional-required",
    messageKey: `will.finding.blocking.${blockCase}`,
    ...(field === undefined ? {} : { field }),
    params: { trigger },
  };
}
