import type { ObjectKey } from "../domain/status";

export const LEGS = "/legs";
export const REVIEW = `${LEGS}/synthese`;
export const EXPORT = `${LEGS}/pdf`;
export const HISTORY = `${LEGS}/historique`;

export const SEGMENT: Record<ObjectKey, string> = {
  draft: "brouillon",
  wishes: "volontes",
  physicalRecord: "testament-manuscrit",
};

export const stepPath = (key: ObjectKey, stepId?: string | null): string =>
  stepId ? `${LEGS}/${SEGMENT[key]}/${encodeURIComponent(stepId)}` : `${LEGS}/${SEGMENT[key]}`;
