import { describe, expect, it } from "vitest";
import { assessWillDraft, createEmptyWillDraft, type WillDraft } from "../../src/will";
import { completeDraft } from "./helpers";

const codes = (d: WillDraft): string[] => assessWillDraft(d).findings.map((f) => f.code);

describe("WillDraft completeness", () => {
  it("a fully answered draft with no special situation is complete according to the checklist", () => {
    const a = assessWillDraft(completeDraft());
    expect(a.level).toBe("complete");
    expect(a.findings).toEqual([]);
    expect(a.blocksReviewStep).toBe(false);
  });

  it("even a complete draft recommends a notary (good practice, not an option)", () => {
    expect(assessWillDraft(completeDraft()).notaryAdvice).toBe("recommended");
  });

  it("an empty draft is incomplete and lists what is missing, without blocking", () => {
    const a = assessWillDraft(createEmptyWillDraft());
    expect(a.level).toBe("incomplete");
    expect(a.blocksReviewStep).toBe(false);
    expect(codes(createEmptyWillDraft())).toEqual(
      expect.arrayContaining([
        "missing.testatorFullName",
        "missing.beneficiaries",
        "missing.provisions",
        "missing.handwritingGuideAcknowledged",
        "missing.situation.maritalStatus",
        "missing.situation.hasChildren",
        "missing.situation.legalProtection",
      ]),
    );
  });

  it("a blank testator name (spaces only) counts as missing", () => {
    expect(codes({ ...completeDraft(), testatorFullName: "   " })).toContain(
      "missing.testatorFullName",
    );
  });

  it("children-dependent questions are only required once the user has children", () => {
    expect(codes(completeDraft())).not.toContain("missing.situation.hasMinorChildren");
    const d = completeDraft();
    d.situation = {
      ...d.situation,
      hasChildren: "yes",
      hasMinorChildren: "unknown",
      blendedFamily: "unknown",
    };
    expect(codes(d)).toEqual(
      expect.arrayContaining([
        "missing.situation.hasMinorChildren",
        "missing.situation.blendedFamily",
      ]),
    );
  });

  it("the spousal-donation question is skipped for a single person and required otherwise", () => {
    const d = completeDraft();
    d.situation = { ...d.situation, spousalDonation: "unknown" };
    expect(codes(d)).not.toContain("missing.situation.spousalDonation");
    d.situation = { ...d.situation, maritalStatus: "divorced" };
    expect(codes(d)).toContain("missing.situation.spousalDonation");
  });

  it("a natural-person beneficiary whose minority is unknown is reported at its own path", () => {
    const d = completeDraft();
    d.beneficiaries = [{ id: "b1", kind: "natural-person", displayName: "X", isMinor: "unknown" }];
    const f = assessWillDraft(d).findings.find((x) => x.code === "missing.beneficiary.isMinor");
    expect(f?.field).toBe("beneficiaries.0.isMinor");
  });

  it("a beneficiary without a name and a provision without a subject are reported", () => {
    const d = completeDraft();
    d.beneficiaries = [{ id: "b1", kind: "natural-person", displayName: " ", isMinor: "no" }];
    d.provisions = [{ id: "p1", beneficiaryId: "b1", subject: "", clause: "none" }];
    expect(codes(d)).toEqual(
      expect.arrayContaining(["missing.beneficiary.displayName", "missing.provision.subject"]),
    );
  });

  it("inconsistency: a provision pointing to an unknown beneficiary", () => {
    const d = completeDraft();
    d.provisions = [{ id: "p1", beneficiaryId: "ghost", subject: "Mon vélo", clause: "none" }];
    expect(codes(d)).toContain("inconsistency.provisionWithoutBeneficiary");
  });

  it("inconsistency: a beneficiary who receives nothing", () => {
    const d = completeDraft();
    d.beneficiaries = [
      ...d.beneficiaries,
      { id: "b2", kind: "natural-person", displayName: "Autre", isMinor: "no" },
    ];
    expect(codes(d)).toContain("inconsistency.beneficiaryWithoutProvision");
  });

  it("inconsistency: duplicate identifiers", () => {
    const d = completeDraft();
    d.provisions = [...d.provisions, { ...d.provisions[0]!, subject: "Autre" }];
    expect(codes(d)).toContain("inconsistency.duplicateId");
  });

  it("findings never carry free text typed by the user (privacy)", () => {
    const d = completeDraft();
    d.beneficiaries = [
      { id: "b1", kind: "legal-entity", displayName: "Association Secrète", isMinor: "unknown" },
    ];
    expect(JSON.stringify(assessWillDraft(d))).not.toContain("Association Secrète");
  });
});
