import type { Answer } from "@veille/core/will";

/**
 * Declarative description of a guided flow: ONE question per screen.
 * The flow is a pure function of the document, so conditional questions (e.g. "minor children?"
 * only once the user has children) and repeated groups (one screen set per beneficiary) are
 * testable without rendering anything. No React, no browser API here.
 */

export interface ChoiceOption {
  value: string;
  /** i18n key suffix under `will.q.<key>.options.` — or a literal label when `label` is set. */
  label?: string;
}

interface Common {
  /** Unique within the flow, stable across renders (e.g. `beneficiary:0:name`). */
  id: string;
  /** i18n key under `will.q.` holding `title`, optional `hint`, and `options.<value>`. */
  key: string;
  /** Raw (untranslated) interpolation values, e.g. the beneficiary's name. */
  params?: Readonly<Record<string, string>>;
  /** Finding field paths this screen lets the user fix (see `Finding.field`). */
  fields: readonly string[];
}

export type Step<T> = Common &
  (
    | {
        kind: "text" | "longText";
        maxLength: number;
        get(doc: T): string;
        set(doc: T, v: string): T;
      }
    | { kind: "answer"; get(doc: T): Answer; set(doc: T, v: Answer): T }
    | {
        kind: "choice";
        options: readonly ChoiceOption[];
        /** Current value, or "" when nothing was chosen yet. */
        get(doc: T): string;
        set(doc: T, v: string): T;
      }
    | { kind: "ack"; showGuide?: boolean; get(doc: T): boolean; set(doc: T, v: boolean): T }
    | {
        kind: "more";
        /** False while the group is empty: the screen then asks for the first item. */
        hasAny: boolean;
        add(doc: T, newId: () => string): { doc: T; goto: string };
      }
  );

export type StepsOf<T> = (doc: T) => Step<T>[];

export function indexOfStep<T>(steps: readonly Step<T>[], id: string | null): number {
  const found = id === null ? -1 : steps.findIndex((s) => s.id === id);
  return found < 0 ? 0 : found;
}

/** The screen where a finding's field can be fixed, or null when no screen covers it. */
export function stepForField<T>(
  steps: readonly Step<T>[],
  field: string | undefined,
): string | null {
  if (!field) return null;
  return steps.find((s) => s.fields.includes(field))?.id ?? null;
}

export function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}
