import {
  canonicalJson,
  createEmptyPhysicalWillRecord,
  createEmptyWillDraft,
  createEmptyWishesDocument,
  type Assessment,
  type AssessmentLevel,
} from "@veille/core/will";
import type { Step } from "./steps";

export type ObjectKey = "draft" | "wishes" | "physicalRecord";

export type ObjectStatus = "not-started" | AssessmentLevel;

const EMPTY: Record<ObjectKey, string> = {
  draft: canonicalJson(createEmptyWillDraft()),
  wishes: canonicalJson(createEmptyWishesDocument()),
  physicalRecord: canonicalJson(createEmptyPhysicalWillRecord()),
};

/** True while the user has not changed anything: such an object is "not started", not "incomplete". */
export function isUntouched(key: ObjectKey, doc: unknown): boolean {
  return canonicalJson(doc) === EMPTY[key];
}

export function statusOf(key: ObjectKey, doc: unknown, assessment: Assessment): ObjectStatus {
  return isUntouched(key, doc) ? "not-started" : assessment.level;
}

/** First screen that lets the user fix something the checklist found; null when nothing to fix. */
export function resumeStepId<T>(steps: readonly Step<T>[], assessment: Assessment): string | null {
  const fixable = assessment.findings.filter((f) => f.kind !== "blocking");
  for (const step of steps) {
    if (fixable.some((f) => f.field !== undefined && step.fields.includes(f.field))) return step.id;
  }
  return null;
}
