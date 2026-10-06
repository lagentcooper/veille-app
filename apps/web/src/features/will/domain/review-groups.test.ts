import { assessWillDraft, createEmptyWillDraft, type Finding } from "@veille/core/will";
import { draftSteps } from "./draft-steps";
import { groupFindings } from "./review-groups";
import type { Step } from "./steps";

const missing = (field: string): Finding => ({
  kind: "missing",
  code: `missing.${field}`,
  level: "incomplete",
  messageKey: `will.finding.missing.${field}`,
  field,
});
const step = (id: string, fields: string[], kind: "text" | "more" = "text"): Step<unknown> =>
  (kind === "more"
    ? { id, key: id, fields, kind, hasAny: false, add: (d: unknown) => ({ doc: d, goto: id }) }
    : {
        id,
        key: id,
        fields,
        kind,
        maxLength: 10,
        get: () => "",
        set: (d: unknown) => d,
      }) as Step<unknown>;

describe("groupFindings", () => {
  const steps = [
    step("a", ["a"]),
    step("b", ["b", "b2"]),
    step("c", ["c"]),
    step("add", ["list"], "more"),
  ];

  it("turns several findings on one screen into a single question to answer", () => {
    const g = groupFindings(steps, [missing("b"), missing("b2")]);
    expect(g.toAnswer.map((s) => s.id)).toEqual(["b"]);
    expect(g.toCheck).toEqual([]);
  });

  it("keeps the order of the flow, not the order of the findings", () => {
    const g = groupFindings(steps, [missing("c"), missing("a")]);
    expect(g.toAnswer.map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("counts answered questions, ignoring 'add another' screens", () => {
    const g = groupFindings(steps, [missing("a"), missing("list")]);
    expect(g.total).toBe(3);
    expect(g.answered).toBe(2);
    expect(g.toAnswer.map((s) => s.id)).toEqual(["a", "add"]);
  });

  it("separates what a notary must see, and keeps findings no screen covers", () => {
    const blocking: Finding = {
      kind: "blocking",
      code: "blocking.reserved-heirs",
      level: "professional-required",
      messageKey: "will.finding.blocking.reserved-heirs",
      field: "a",
    };
    const loose: Finding = { ...missing("nowhere") };
    const incoherent: Finding = {
      kind: "inconsistency",
      code: "inconsistency.x",
      level: "incomplete",
      messageKey: "will.finding.inconsistency.x",
    };
    const g = groupFindings(steps, [blocking, loose, incoherent]);
    expect(g.blocking).toEqual([blocking]);
    expect(g.toAnswer).toEqual([]);
    expect(g.toCheck).toEqual([loose, incoherent]);
    expect(g.answered).toBe(3);
  });

  it("an empty draft has every question still to answer", () => {
    const draft = createEmptyWillDraft();
    const flow = draftSteps(draft);
    const g = groupFindings(flow, assessWillDraft(draft).findings);
    expect(g.total).toBeGreaterThan(5);
    expect(g.answered).toBeLessThan(g.total);
    expect(g.toAnswer.length).toBeGreaterThan(5);
  });

  it("a complete document has nothing to answer", () => {
    const g = groupFindings(steps, []);
    expect(g).toMatchObject({ blocking: [], toAnswer: [], toCheck: [], answered: 3, total: 3 });
  });
});
