import {
  assessPhysicalWillRecord,
  assessWillDraft,
  assessWishesDocument,
  createEmptyPhysicalWillRecord,
  createEmptyWillDraft,
  createEmptyWishesDocument,
  type WillDraft,
} from "@veille/core/will";
import { draftSteps } from "./draft-steps";
import { recordSteps } from "./record-steps";
import { resumeStepId, isUntouched, statusOf } from "./status";
import { stepForField, indexOfStep, type Step } from "./steps";
import { wishesSteps } from "./wishes-steps";

const ids = <T>(steps: readonly Step<T>[]) => steps.map((s) => s.id);
let counter = 0;
const newId = () => `id-${++counter}`;

/** Fictitious data only. */
function filled(): WillDraft {
  const d = createEmptyWillDraft();
  return {
    ...d,
    testatorFullName: "Personne Fictive",
    situation: {
      maritalStatus: "single",
      spousalDonation: "no",
      hasChildren: "no",
      hasMinorChildren: "no",
      blendedFamily: "no",
      lifeInsurance: "no",
      ownsRealEstate: "no",
      ownsBusinessInterests: "no",
      assetsAbroad: "no",
      residesOutsideFrance: "no",
      foreignNationality: "no",
      legalProtection: "none",
    },
    beneficiaries: [{ id: "b1", kind: "natural-person", displayName: "Alex", isMinor: "no" }],
    provisions: [{ id: "p1", beneficiaryId: "b1", subject: "Mon vélo", clause: "none" }],
    handwritingGuideAcknowledged: true,
  };
}

describe("draft flow — one question per screen, in a sensible order", () => {
  it("starts with the name, then the situation questions, and ends with the handwriting guide", () => {
    const steps = draftSteps(createEmptyWillDraft());
    expect(steps[0]?.id).toBe("testatorFullName");
    expect(steps[1]?.id).toBe("maritalStatus");
    expect(steps.at(-1)?.id).toBe("handwritingGuide");
  });

  it("asks the situation questions BEFORE the beneficiaries, so a user who needs a notary learns it early", () => {
    const order = ids(draftSteps(createEmptyWillDraft()));
    expect(order.indexOf("hasChildren")).toBeLessThan(order.indexOf("beneficiaries:more"));
    expect(order.indexOf("ownsRealEstate")).toBeLessThan(order.indexOf("beneficiaries:more"));
  });

  it("every screen id is unique", () => {
    const d = filled();
    d.beneficiaries.push({
      id: "b2",
      kind: "legal-entity",
      displayName: "Asso",
      isMinor: "unknown",
    });
    d.provisions.push({ id: "p2", beneficiaryId: "b2", subject: "Une somme", clause: "none" });
    const all = ids(draftSteps(d));
    expect(new Set(all).size).toBe(all.length);
  });

  it("skips the spousal-donation question for a single person only", () => {
    expect(ids(draftSteps(filled()))).not.toContain("spousalDonation");
    expect(ids(draftSteps(createEmptyWillDraft()))).toContain("spousalDonation");
    const married = filled();
    married.situation.maritalStatus = "married";
    expect(ids(draftSteps(married))).toContain("spousalDonation");
  });

  it("asks about minor children and blended family only once the user has children", () => {
    expect(ids(draftSteps(filled()))).not.toContain("hasMinorChildren");
    const d = filled();
    d.situation.hasChildren = "yes";
    expect(ids(draftSteps(d))).toEqual(
      expect.arrayContaining(["hasMinorChildren", "blendedFamily"]),
    );
  });

  it("asks whether a beneficiary is a minor for a person, not for an organisation", () => {
    const d = filled();
    expect(ids(draftSteps(d))).toContain("beneficiary:0:minor");
    d.beneficiaries[0]!.kind = "legal-entity";
    expect(ids(draftSteps(d))).not.toContain("beneficiary:0:minor");
  });

  it("offers the provisions section only once somebody is designated", () => {
    const d = createEmptyWillDraft();
    expect(ids(draftSteps(d)).some((id) => id.startsWith("provision"))).toBe(false);
    expect(ids(draftSteps(filled()))).toContain("provisions:more");
  });

  it("asks who receives a provision only when there are several beneficiaries", () => {
    const one = filled();
    expect(ids(draftSteps(one))).not.toContain("provision:0:beneficiary");
    const two = filled();
    two.beneficiaries.push({ id: "b2", kind: "natural-person", displayName: "Sam", isMinor: "no" });
    expect(ids(draftSteps(two))).toContain("provision:0:beneficiary");
  });

  it("'add a beneficiary' creates an empty one and jumps to its first screen", () => {
    const more = draftSteps(filled()).find((s) => s.id === "beneficiaries:more");
    if (more?.kind !== "more") throw new Error("expected a 'more' step");
    const { doc, goto } = more.add(filled(), newId);
    expect(doc.beneficiaries).toHaveLength(2);
    expect(doc.beneficiaries[1]).toMatchObject({
      displayName: "",
      kind: "natural-person",
      isMinor: "unknown",
    });
    expect(goto).toBe("beneficiary:1:name");
    expect(ids(draftSteps(doc))).toContain(goto);
  });

  it("'add a provision' pre-selects the only beneficiary and goes straight to the subject", () => {
    const more = draftSteps(filled()).find((s) => s.id === "provisions:more");
    if (more?.kind !== "more") throw new Error("expected a 'more' step");
    const { doc, goto } = more.add(filled(), newId);
    expect(doc.provisions[1]?.beneficiaryId).toBe("b1");
    expect(goto).toBe("provision:1:subject");
  });

  it("'add a provision' asks who receives it when there are several beneficiaries", () => {
    const two = filled();
    two.beneficiaries.push({ id: "b2", kind: "natural-person", displayName: "Sam", isMinor: "no" });
    const more = draftSteps(two).find((s) => s.id === "provisions:more");
    if (more?.kind !== "more") throw new Error("expected a 'more' step");
    const { doc, goto } = more.add(two, newId);
    expect(doc.provisions[1]?.beneficiaryId).toBe("");
    expect(goto).toBe("provision:1:beneficiary");
  });

  it("editing through a step returns a new document and leaves the old one untouched", () => {
    const d = filled();
    const step = draftSteps(d).find((s) => s.id === "testatorFullName");
    if (step?.kind !== "text") throw new Error("expected a text step");
    const next = step.set(d, "Autre Nom");
    expect(next.testatorFullName).toBe("Autre Nom");
    expect(d.testatorFullName).toBe("Personne Fictive");
  });

  it("choice steps expose 'nothing chosen yet' as an empty value", () => {
    const step = draftSteps(createEmptyWillDraft()).find((s) => s.id === "maritalStatus");
    if (step?.kind !== "choice") throw new Error("expected a choice step");
    expect(step.get(createEmptyWillDraft())).toBe("");
    expect(step.options.map((o) => o.value)).not.toContain("unknown");
  });
});

describe("wishes and record flows", () => {
  it("asks about body wishes, and for details only when the answer is yes", () => {
    const d = createEmptyWishesDocument();
    expect(ids(wishesSteps(d))).not.toContain("bodyWishesNote");
    expect(ids(wishesSteps({ ...d, hasBodyWishes: "yes" }))).toContain("bodyWishesNote");
  });

  it("repeats the screens for each message and each paper", () => {
    const d = {
      ...createEmptyWishesDocument(),
      messages: [{ id: "m", recipientLabel: "A", text: "B" }],
      papers: [{ id: "p", label: "A", location: "B" }],
    };
    expect(ids(wishesSteps(d))).toEqual(
      expect.arrayContaining([
        "message:0:recipient",
        "message:0:text",
        "paper:0:label",
        "paper:0:location",
      ]),
    );
    const more = wishesSteps(d).find((s) => s.id === "papers:more");
    if (more?.kind !== "more") throw new Error("expected a 'more' step");
    expect(more.add(d, newId).goto).toBe("paper:1:label");
  });

  it("asks where the handwritten will is only when one exists", () => {
    const none = createEmptyPhysicalWillRecord();
    expect(ids(recordSteps(none))).toEqual(["existence"]);
    expect(ids(recordSteps({ ...none, existence: "exists" }))).toEqual([
      "existence",
      "locationKind",
      "locationDetail",
      "registeredInCentralFile",
    ]);
  });
});

describe("findings can always be fixed from a screen", () => {
  it("every draft finding that points at a field maps to a screen of the flow", () => {
    const broken: WillDraft[] = [
      createEmptyWillDraft(),
      {
        ...filled(),
        situation: {
          ...filled().situation,
          hasChildren: "yes",
          hasMinorChildren: "unknown",
          blendedFamily: "unknown",
          maritalStatus: "married",
          spousalDonation: "unknown",
        },
        beneficiaries: [
          { id: "b1", kind: "natural-person", displayName: "", isMinor: "unknown" },
          { id: "b2", kind: "legal-entity", displayName: "Asso", isMinor: "unknown" },
          { id: "b3", kind: "natural-person", displayName: "Mineur", isMinor: "yes" },
        ],
        provisions: [
          { id: "p1", beneficiaryId: "ghost", subject: "", clause: "charge" },
          { id: "p2", beneficiaryId: "b1", subject: "x", clause: "condition" },
        ],
        handwritingGuideAcknowledged: false,
      },
      { ...filled(), beneficiaries: [], provisions: [] },
    ];
    for (const d of broken) {
      const steps = draftSteps(d);
      for (const f of assessWillDraft(d).findings.filter((x) => x.field !== undefined)) {
        expect(stepForField(steps, f.field), `${f.code} @ ${f.field}`).not.toBeNull();
      }
    }
  });

  it("every wishes and record finding that points at a field maps to a screen", () => {
    const wishes = {
      ...createEmptyWishesDocument(),
      hasBodyWishes: "yes" as const,
      messages: [{ id: "m", recipientLabel: "", text: "" }],
      papers: [{ id: "p", label: "", location: "mon mot de passe" }],
    };
    for (const f of assessWishesDocument(wishes).findings.filter((x) => x.field !== undefined))
      expect(stepForField(wishesSteps(wishes), f.field), f.code).not.toBeNull();
    expect(
      assessWishesDocument(createEmptyWishesDocument()).findings.every((f) =>
        stepForField(wishesSteps(createEmptyWishesDocument()), f.field),
      ),
    ).toBe(true);

    const record = { ...createEmptyPhysicalWillRecord(), existence: "exists" as const };
    for (const f of assessPhysicalWillRecord(record).findings)
      expect(stepForField(recordSteps(record), f.field), f.code).not.toBeNull();
  });

  it("resumes at the first screen that has something to fix, and nowhere when only a professional is needed", () => {
    const d = filled();
    d.testatorFullName = "";
    expect(resumeStepId(draftSteps(d), assessWillDraft(d))).toBe("testatorFullName");
    const blockedOnly = filled();
    blockedOnly.situation.ownsRealEstate = "yes";
    expect(resumeStepId(draftSteps(blockedOnly), assessWillDraft(blockedOnly))).toBeNull();
  });

  it("falls back to the first screen for an unknown id", () => {
    expect(indexOfStep(draftSteps(filled()), "does-not-exist")).toBe(0);
    expect(indexOfStep(draftSteps(filled()), null)).toBe(0);
  });
});

describe("object status", () => {
  it("an untouched object is 'not started', not 'incomplete'", () => {
    const d = createEmptyWillDraft();
    expect(isUntouched("draft", d)).toBe(true);
    expect(statusOf("draft", d, assessWillDraft(d))).toBe("not-started");
  });

  it("a touched object reports the level of its assessment", () => {
    const d = { ...createEmptyWillDraft(), testatorFullName: "A" };
    expect(statusOf("draft", d, assessWillDraft(d))).toBe("incomplete");
    expect(statusOf("draft", filled(), assessWillDraft(filled()))).toBe("complete");
  });
});
