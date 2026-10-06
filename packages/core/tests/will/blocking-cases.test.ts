import { describe, expect, it } from "vitest";
import {
  assessWillDraft,
  assessWishesDocument,
  BLOCKING_CASES,
  type BlockingCase,
  type WillDraft,
} from "../../src/will";
import { completeDraft, completeWishes } from "./helpers";

type Situation = WillDraft["situation"];

const withSituation = (patch: Partial<Situation>): WillDraft => {
  const d = completeDraft();
  d.situation = { ...d.situation, ...patch };
  return d;
};

interface Case {
  situation: string;
  blockCase: BlockingCase;
  trigger: string;
  draft: WillDraft;
}

const cases: Case[] = [
  {
    situation: "a child is alive (héritier réservataire)",
    blockCase: "reserved-heirs",
    trigger: "children",
    draft: withSituation({ hasChildren: "yes", hasMinorChildren: "no", blendedFamily: "no" }),
  },
  {
    situation: "no child but a spouse (réservataire à défaut)",
    blockCase: "reserved-heirs",
    trigger: "spouse",
    draft: withSituation({ maritalStatus: "married", hasChildren: "no" }),
  },
  {
    situation: "the user owns real estate",
    blockCase: "real-estate-or-business",
    trigger: "real-estate",
    draft: withSituation({ ownsRealEstate: "yes" }),
  },
  {
    situation: "the user owns a business, shares or a farm",
    blockCase: "real-estate-or-business",
    trigger: "business",
    draft: withSituation({ ownsBusinessInterests: "yes" }),
  },
  {
    situation: "an asset is located abroad (extranéité)",
    blockCase: "foreign-element",
    trigger: "assets-abroad",
    draft: withSituation({ assetsAbroad: "yes" }),
  },
  {
    situation: "the user lives outside France (extranéité)",
    blockCase: "foreign-element",
    trigger: "residence-abroad",
    draft: withSituation({ residesOutsideFrance: "yes" }),
  },
  {
    situation: "the user has a foreign nationality (extranéité)",
    blockCase: "foreign-element",
    trigger: "foreign-nationality",
    draft: withSituation({ foreignNationality: "yes" }),
  },
  {
    situation: "the user is married (régime matrimonial)",
    blockCase: "marital-regime-pacs-or-life-insurance",
    trigger: "marital-regime",
    draft: withSituation({ maritalStatus: "married", hasChildren: "no" }),
  },
  {
    situation: "the user is bound by a PACS",
    blockCase: "marital-regime-pacs-or-life-insurance",
    trigger: "pacs",
    draft: withSituation({ maritalStatus: "pacs" }),
  },
  {
    situation: "a donation between spouses exists",
    blockCase: "marital-regime-pacs-or-life-insurance",
    trigger: "spousal-donation",
    draft: withSituation({ maritalStatus: "divorced", spousalDonation: "yes" }),
  },
  {
    situation: "a life-insurance contract exists (hors succession)",
    blockCase: "marital-regime-pacs-or-life-insurance",
    trigger: "life-insurance",
    draft: withSituation({ lifeInsurance: "yes" }),
  },
  {
    situation: "the user is under guardianship (tutelle)",
    blockCase: "minor-or-protected-person",
    trigger: "testator-protected",
    draft: withSituation({ legalProtection: "guardianship" }),
  },
  {
    situation: "the user is under curatorship (curatelle)",
    blockCase: "minor-or-protected-person",
    trigger: "testator-protected",
    draft: withSituation({ legalProtection: "curatorship" }),
  },
  {
    situation: "another protection regime or incapacity applies",
    blockCase: "minor-or-protected-person",
    trigger: "testator-protected",
    draft: withSituation({ legalProtection: "other" }),
  },
  {
    situation: "the user has a minor child",
    blockCase: "minor-or-protected-person",
    trigger: "minor-child",
    draft: withSituation({ hasChildren: "yes", hasMinorChildren: "yes", blendedFamily: "no" }),
  },
  {
    situation: "a beneficiary is a minor",
    blockCase: "minor-or-protected-person",
    trigger: "minor-beneficiary",
    draft: {
      ...completeDraft(),
      beneficiaries: [{ id: "b1", kind: "natural-person", displayName: "X", isMinor: "yes" }],
    },
  },
  {
    situation: "the legacy goes to an association or foundation (personne morale)",
    blockCase: "legal-entity-beneficiary",
    trigger: "legal-entity",
    draft: {
      ...completeDraft(),
      beneficiaries: [{ id: "b1", kind: "legal-entity", displayName: "Asso", isMinor: "unknown" }],
    },
  },
  {
    situation: "children come from different unions (famille recomposée)",
    blockCase: "blended-family",
    trigger: "blended-family",
    draft: withSituation({ hasChildren: "yes", hasMinorChildren: "no", blendedFamily: "yes" }),
  },
  {
    situation: "a gift is subject to a condition",
    blockCase: "conditional-clause",
    trigger: "condition",
    draft: {
      ...completeDraft(),
      provisions: [{ id: "p1", beneficiaryId: "b1", subject: "Mon vélo", clause: "condition" }],
    },
  },
  {
    situation: "a gift carries a charge",
    blockCase: "conditional-clause",
    trigger: "charge",
    draft: {
      ...completeDraft(),
      provisions: [{ id: "p1", beneficiaryId: "b1", subject: "Mon vélo", clause: "charge" }],
    },
  },
];

describe("blocking cases — the review step is blocked and a notary is required", () => {
  it.each(cases)("$situation → $blockCase ($trigger)", ({ blockCase, trigger, draft }) => {
    const a = assessWillDraft(draft);
    expect(a.level).toBe("professional-required");
    expect(a.blocksReviewStep).toBe(true);
    expect(a.notaryAdvice).toBe("required");
    const f = a.findings.find(
      (x) => x.code === `blocking.${blockCase}` && x.params?.["trigger"] === trigger,
    );
    expect(f, `expected finding blocking.${blockCase}/${trigger}`).toBeDefined();
    expect(f?.level).toBe("professional-required");
    expect(f?.messageKey).toBe(`will.finding.blocking.${blockCase}`);
  });

  it("organ or body donation wishes (volontés relatives au corps) block the wishes document", () => {
    const a = assessWishesDocument({ ...completeWishes(), hasBodyWishes: "yes" });
    expect(a.level).toBe("professional-required");
    expect(a.blocksReviewStep).toBe(true);
    expect(a.findings.map((f) => f.code)).toContain("blocking.body-wishes");
  });

  it("every blocking case of the brief is exercised by at least one test above", () => {
    const covered = new Set<BlockingCase>([...cases.map((c) => c.blockCase), "body-wishes"]);
    expect([...covered].sort()).toEqual([...BLOCKING_CASES].sort());
  });

  it("a blocked draft still reports its missing information alongside the 🛑", () => {
    const d = withSituation({ ownsRealEstate: "yes", hasChildren: "unknown" });
    const c = assessWillDraft(d).findings.map((f) => f.code);
    expect(c).toContain("blocking.real-estate-or-business");
    expect(c).toContain("missing.situation.hasChildren");
  });

  it("no blocking case is raised for an adult single user with none of the listed situations", () => {
    expect(assessWillDraft(completeDraft()).findings.filter((f) => f.kind === "blocking")).toEqual(
      [],
    );
  });

  it("a blocking case on the draft does not block the independent wishes document", () => {
    expect(assessWishesDocument(completeWishes()).blocksReviewStep).toBe(false);
  });
});
