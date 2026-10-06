import { LIMITS, type PhysicalWillRecord } from "@veille/core/will";
import type { Step } from "./steps";

export function recordSteps(d: PhysicalWillRecord): Step<PhysicalWillRecord>[] {
  const steps: Step<PhysicalWillRecord>[] = [
    {
      id: "existence",
      key: "existence",
      kind: "choice",
      fields: ["existence"],
      options: [{ value: "exists" }, { value: "none" }],
      get: (doc) => (doc.existence === "unknown" ? "" : doc.existence),
      set: (doc, v) => ({ ...doc, existence: v as PhysicalWillRecord["existence"] }),
    },
  ];
  if (d.existence === "exists") {
    steps.push(
      {
        id: "locationKind",
        key: "locationKind",
        kind: "choice",
        fields: ["locationKind"],
        options: [
          { value: "home" },
          { value: "notary" },
          { value: "relative" },
          { value: "bank-safe" },
          { value: "other" },
        ],
        get: (doc) => (doc.locationKind === "unspecified" ? "" : doc.locationKind),
        set: (doc, v) => ({ ...doc, locationKind: v as PhysicalWillRecord["locationKind"] }),
      },
      {
        id: "locationDetail",
        key: "locationDetail",
        kind: "longText",
        maxLength: LIMITS.longText,
        fields: ["locationDetail"],
        get: (doc) => doc.locationDetail,
        set: (doc, v) => ({ ...doc, locationDetail: v }),
      },
      {
        id: "registeredInCentralFile",
        key: "registeredInCentralFile",
        kind: "answer",
        fields: ["registeredInCentralFile"],
        get: (doc) => doc.registeredInCentralFile,
        set: (doc, v) => ({ ...doc, registeredInCentralFile: v }),
      },
    );
  }
  return steps;
}
