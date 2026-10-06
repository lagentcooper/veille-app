import { buildAssessment, missing, type Assessment, type Finding } from "./findings";
import type { PhysicalWillRecord } from "./model";

export const RECORD_MISSING_FIELDS = [
  "existence",
  "locationKind",
  "locationDetail",
  "registeredInCentralFile",
] as const;

/**
 * Purely declarative: Veille does not hold, verify or vouch for the handwritten will — it only
 * remembers where it is so that the relatives can find it. No blocking case applies.
 */
export function assessPhysicalWillRecord(record: PhysicalWillRecord): Assessment {
  const out: Finding[] = [];
  if (record.existence === "unknown") out.push(missing("existence"));
  if (record.existence === "exists") {
    if (record.locationKind === "unspecified") out.push(missing("locationKind"));
    if (record.locationDetail.trim().length === 0) out.push(missing("locationDetail"));
    if (record.registeredInCentralFile === "unknown") out.push(missing("registeredInCentralFile"));
  }
  return buildAssessment(out);
}
