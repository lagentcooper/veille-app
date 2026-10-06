import type { Finding } from "@veille/core/will";
import type { Step } from "./steps";

/**
 * The checklist, regrouped by what the person can DO about it, instead of one long list of
 * sentences: questions still to answer, things to double-check, and situations that need a
 * professional. Pure function of the flow and the findings: no React, no browser API.
 */
export interface ReviewGroups<T> {
  /** Situations that stop the review step: see a notary. */
  blocking: Finding[];
  /** Screens of the flow that still have an unanswered question, in the order of the flow. */
  toAnswer: Step<T>[];
  /** Inconsistencies, discouraged content, and anything no screen covers. */
  toCheck: Finding[];
  /** Questions of the flow (excluding "add another" screens) and how many are not flagged. */
  answered: number;
  total: number;
}

export function groupFindings<T>(
  steps: readonly Step<T>[],
  findings: readonly Finding[],
): ReviewGroups<T> {
  const blocking = findings.filter((f) => f.kind === "blocking");
  const toCheck: Finding[] = [];
  const flagged = new Set<string>();

  for (const f of findings) {
    if (f.kind === "blocking") continue;
    const step =
      f.kind === "missing"
        ? steps.find((s) => f.field !== undefined && s.fields.includes(f.field))
        : undefined;
    if (step) flagged.add(step.id);
    else toCheck.push(f);
  }

  const toAnswer = steps.filter((s) => flagged.has(s.id));
  const questions = steps.filter((s) => s.kind !== "more");
  const open = questions.filter((s) => flagged.has(s.id)).length;
  return {
    blocking,
    toAnswer,
    toCheck,
    answered: questions.length - open,
    total: questions.length,
  };
}
