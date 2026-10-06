import {
  LEGAL_PROTECTIONS,
  LIMITS,
  MARITAL_STATUSES,
  type Answer,
  type Beneficiary,
  type Provision,
  type TestatorSituation,
  type WillDraft,
} from "@veille/core/will";
import type { Step } from "./steps";

type AnswerField = {
  [K in keyof TestatorSituation]: TestatorSituation[K] extends Answer ? K : never;
}[keyof TestatorSituation];

const answer = (field: AnswerField): Step<WillDraft> => ({
  id: field,
  key: field,
  kind: "answer",
  fields: [`situation.${field}`],
  get: (d) => d.situation[field],
  set: (d, v) => ({ ...d, situation: { ...d.situation, [field]: v } }),
});

const without = <V extends string>(values: readonly V[], excluded: V): { value: V }[] =>
  values.filter((v) => v !== excluded).map((value) => ({ value }));

function replaceAt<V>(items: readonly V[], index: number, next: V): V[] {
  return items.map((item, i) => (i === index ? next : item));
}

const beneficiaryName = (d: WillDraft, id: string): string =>
  d.beneficiaries.find((b) => b.id === id)?.displayName ?? "";

/** Situation questions come first: a user who needs a professional learns it early, not at the end. */
function situationSteps(d: WillDraft): Step<WillDraft>[] {
  const s = d.situation;
  const steps: Step<WillDraft>[] = [
    {
      id: "maritalStatus",
      key: "maritalStatus",
      kind: "choice",
      fields: ["situation.maritalStatus"],
      options: without(MARITAL_STATUSES, "unknown"),
      get: (doc) => (doc.situation.maritalStatus === "unknown" ? "" : doc.situation.maritalStatus),
      set: (doc, v) => ({
        ...doc,
        situation: { ...doc.situation, maritalStatus: v as TestatorSituation["maritalStatus"] },
      }),
    },
  ];
  if (s.maritalStatus !== "single") steps.push(answer("spousalDonation"));
  steps.push(answer("hasChildren"));
  if (s.hasChildren === "yes") steps.push(answer("hasMinorChildren"), answer("blendedFamily"));
  steps.push(
    answer("lifeInsurance"),
    answer("ownsRealEstate"),
    answer("ownsBusinessInterests"),
    answer("assetsAbroad"),
    answer("residesOutsideFrance"),
    answer("foreignNationality"),
    {
      id: "legalProtection",
      key: "legalProtection",
      kind: "choice",
      fields: ["situation.legalProtection"],
      options: without(LEGAL_PROTECTIONS, "unknown"),
      get: (doc) =>
        doc.situation.legalProtection === "unknown" ? "" : doc.situation.legalProtection,
      set: (doc, v) => ({
        ...doc,
        situation: { ...doc.situation, legalProtection: v as TestatorSituation["legalProtection"] },
      }),
    },
  );
  return steps;
}

function beneficiarySteps(d: WillDraft): Step<WillDraft>[] {
  const steps: Step<WillDraft>[] = [];
  d.beneficiaries.forEach((b, i) => {
    const at = (patch: Partial<Beneficiary>) => (doc: WillDraft) => ({
      ...doc,
      beneficiaries: replaceAt(doc.beneficiaries, i, { ...doc.beneficiaries[i]!, ...patch }),
    });
    const params = { name: b.displayName };
    steps.push(
      {
        id: `beneficiary:${i}:name`,
        key: "beneficiary.name",
        kind: "text",
        maxLength: LIMITS.shortText,
        fields: [`beneficiaries.${i}.displayName`],
        get: (doc) => doc.beneficiaries[i]?.displayName ?? "",
        set: (doc, v) => at({ displayName: v })(doc),
      },
      {
        id: `beneficiary:${i}:kind`,
        key: "beneficiary.kind",
        kind: "choice",
        params,
        fields: [`beneficiaries.${i}.kind`],
        options: [{ value: "natural-person" }, { value: "legal-entity" }],
        get: (doc) => doc.beneficiaries[i]?.kind ?? "",
        set: (doc, v) => at({ kind: v as Beneficiary["kind"] })(doc),
      },
    );
    if (b.kind === "natural-person") {
      steps.push({
        id: `beneficiary:${i}:minor`,
        key: "beneficiary.minor",
        kind: "answer",
        params,
        fields: [`beneficiaries.${i}.isMinor`],
        get: (doc) => doc.beneficiaries[i]?.isMinor ?? "unknown",
        set: (doc, v) => at({ isMinor: v })(doc),
      });
    }
  });
  steps.push({
    id: "beneficiaries:more",
    key: "beneficiary.more",
    kind: "more",
    hasAny: d.beneficiaries.length > 0,
    // With nobody designated yet, the "nothing to leave" finding also leads here.
    fields: d.beneficiaries.length > 0 ? ["beneficiaries"] : ["beneficiaries", "provisions"],
    add: (doc, newId) => ({
      doc: {
        ...doc,
        beneficiaries: [
          ...doc.beneficiaries,
          { id: newId(), kind: "natural-person", displayName: "", isMinor: "unknown" },
        ],
      },
      goto: `beneficiary:${doc.beneficiaries.length}:name`,
    }),
  });
  return steps;
}

function provisionSteps(d: WillDraft): Step<WillDraft>[] {
  // Nothing to leave to nobody: the section only exists once someone is designated.
  if (d.beneficiaries.length === 0) return [];
  const steps: Step<WillDraft>[] = [];
  d.provisions.forEach((p, i) => {
    const at = (patch: Partial<Provision>) => (doc: WillDraft) => ({
      ...doc,
      provisions: replaceAt(doc.provisions, i, { ...doc.provisions[i]!, ...patch }),
    });
    const params = { name: beneficiaryName(d, p.beneficiaryId) };
    if (d.beneficiaries.length > 1) {
      steps.push({
        id: `provision:${i}:beneficiary`,
        key: "provision.beneficiary",
        kind: "choice",
        fields: [`provisions.${i}.beneficiaryId`],
        options: d.beneficiaries.map((b) => ({ value: b.id, label: b.displayName })),
        get: (doc) => doc.provisions[i]?.beneficiaryId ?? "",
        set: (doc, v) => at({ beneficiaryId: v })(doc),
      });
    }
    steps.push(
      {
        id: `provision:${i}:subject`,
        key: "provision.subject",
        kind: "longText",
        maxLength: LIMITS.longText,
        params,
        fields: [`provisions.${i}.subject`],
        get: (doc) => doc.provisions[i]?.subject ?? "",
        set: (doc, v) => at({ subject: v })(doc),
      },
      {
        id: `provision:${i}:clause`,
        key: "provision.clause",
        kind: "choice",
        fields: [`provisions.${i}.clause`],
        options: [{ value: "none" }, { value: "condition" }, { value: "charge" }],
        get: (doc) => doc.provisions[i]?.clause ?? "",
        set: (doc, v) => at({ clause: v as Provision["clause"] })(doc),
      },
    );
  });
  steps.push({
    id: "provisions:more",
    key: "provision.more",
    kind: "more",
    hasAny: d.provisions.length > 0,
    // A beneficiary who receives nothing is reported on this screen too.
    fields: ["provisions", ...d.beneficiaries.map((_, i) => `beneficiaries.${i}.id`)],
    add: (doc, newId) => {
      const only = doc.beneficiaries.length === 1 ? doc.beneficiaries[0]!.id : "";
      return {
        doc: {
          ...doc,
          provisions: [
            ...doc.provisions,
            { id: newId(), beneficiaryId: only, subject: "", clause: "none" },
          ],
        },
        goto: `provision:${doc.provisions.length}:${only ? "subject" : "beneficiary"}`,
      };
    },
  });
  return steps;
}

export function draftSteps(d: WillDraft): Step<WillDraft>[] {
  return [
    {
      id: "testatorFullName",
      key: "testatorFullName",
      kind: "text",
      maxLength: LIMITS.shortText,
      fields: ["testatorFullName"],
      get: (doc) => doc.testatorFullName,
      set: (doc, v) => ({ ...doc, testatorFullName: v }),
    },
    ...situationSteps(d),
    ...beneficiarySteps(d),
    ...provisionSteps(d),
    {
      id: "handwritingGuide",
      key: "handwritingGuide",
      kind: "ack",
      showGuide: true,
      fields: ["handwritingGuideAcknowledged"],
      get: (doc) => doc.handwritingGuideAcknowledged,
      set: (doc, v) => ({ ...doc, handwritingGuideAcknowledged: v }),
    },
  ];
}
