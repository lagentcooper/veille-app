import {
  FINDING_MESSAGE_KEYS,
  HANDWRITING_GUIDE_STEP_KEYS,
  NOTARY_STEP_KEY,
  WILL_DISCLAIMER_KEYS,
  BLOCKING_CASES,
  createEmptyWillDraft,
  type WillDraft,
} from "@veille/core/will";
import { draftSteps } from "../features/will/domain/draft-steps";
import { recordSteps } from "../features/will/domain/record-steps";
import { wishesSteps } from "../features/will/domain/wishes-steps";
import { createEmptyPhysicalWillRecord, createEmptyWishesDocument } from "@veille/core/will";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { initI18n } from ".";
import { fr } from "./fr";

let i18n: Awaited<ReturnType<typeof initI18n>>;
beforeAll(async () => {
  i18n = await initI18n();
});

function flatten(value: unknown, path = ""): Array<[string, string]> {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => flatten(v, path ? `${path}.${k}` : k));
  return [];
}
const texts = flatten(fr.will);

describe("French texts of the will journey", () => {
  it("define every key the domain can emit", () => {
    const required = [
      ...FINDING_MESSAGE_KEYS,
      ...WILL_DISCLAIMER_KEYS,
      ...HANDWRITING_GUIDE_STEP_KEYS,
      NOTARY_STEP_KEY,
    ];
    const missing = required.filter((key) => !i18n.exists(key));
    expect(missing).toEqual([]);
  });

  it("explain every blocking case in plain words", () => {
    for (const c of BLOCKING_CASES) {
      expect(i18n.exists(`will.finding.blocking.${c}`), c).toBe(true);
      expect(i18n.t(`will.finding.blocking.${c}`)).toMatch(/notaire|professionnel|organisme/);
    }
  });

  it("define a title (and the options of choices) for every screen of every flow", () => {
    const rich: WillDraft = {
      ...createEmptyWillDraft(),
      situation: {
        ...createEmptyWillDraft().situation,
        maritalStatus: "married",
        hasChildren: "yes",
      },
      beneficiaries: [
        { id: "a", kind: "natural-person", displayName: "A", isMinor: "no" },
        { id: "b", kind: "natural-person", displayName: "B", isMinor: "no" },
      ],
      provisions: [{ id: "p", beneficiaryId: "a", subject: "x", clause: "none" }],
    };
    const wishes = {
      ...createEmptyWishesDocument(),
      hasBodyWishes: "yes" as const,
      messages: [{ id: "m", recipientLabel: "A", text: "B" }],
      papers: [{ id: "p", label: "A", location: "B" }],
    };
    const record = { ...createEmptyPhysicalWillRecord(), existence: "exists" as const };
    const steps = [...draftSteps(rich), ...wishesSteps(wishes), ...recordSteps(record)];
    for (const step of steps) {
      const base = `will.q.${step.key}`;
      const hasTitle =
        i18n.exists(`${base}.title`) || (step.kind === "more" && i18n.exists(`${base}.first`));
      expect(hasTitle, base).toBe(true);
      if (step.kind === "more")
        for (const k of ["first", "title", "yes", "no"])
          expect(i18n.exists(`${base}.${k}`), `${base}.${k}`).toBe(true);
      if (step.kind === "choice")
        for (const o of step.options)
          if (o.label === undefined)
            expect(i18n.exists(`${base}.options.${o.value}`), `${base}.options.${o.value}`).toBe(
              true,
            );
      if (step.kind === "ack") expect(i18n.exists(`${base}.label`), base).toBe(true);
    }
  });

  it("never say that anything is 'valide' (the application only says 'complet selon notre checklist')", () => {
    const offenders = texts.filter(([, text]) => /\bvalid/i.test(text)).map(([key]) => key);
    expect(offenders).toEqual([]);
    expect(i18n.t("will.status.complete")).toBe("Complet selon notre checklist");
  });

  it("never claim legal compliance", () => {
    const offenders = texts
      .filter(([, text]) => /conforme|garanti|certifi/i.test(text))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it("keep the legal limits visible: not a notary, not a will until handwritten, notary recommended", () => {
    expect(i18n.t(WILL_DISCLAIMER_KEYS[0])).toMatch(/ne remplace pas un notaire/);
    expect(i18n.t(WILL_DISCLAIMER_KEYS[1])).toMatch(/n'est pas un testament/);
    expect(i18n.t(WILL_DISCLAIMER_KEYS[1])).toMatch(/à la main, daté et signé/);
    expect(i18n.t(WILL_DISCLAIMER_KEYS[2])).toMatch(/notaire/);
  });

  it("avoid legal jargon in the user-facing journey", () => {
    const jargon =
      /réservataire|quotité|ab intestat|de cujus|dévolution|légataire|testateur|extranéité|usufruit|nue-propriété/i;
    const offenders = texts
      .filter(([key, text]) => !key.startsWith("pdf") && jargon.test(text))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it("do not guess anyone's gender from a name: a named person is never referred to as il/elle", () => {
    // "s'agit-il" is impersonal and "La personne … a-t-elle" agrees with the noun, not with the name.
    const offenders = texts
      .filter(([, text]) => /\{\{name\}\}/.test(text) && /\b(il|elle|lui)\b/i.test(text))
      .filter(([, text]) => !/s'agit-il|La personne/.test(text))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it("define a label for every object status shown by the pill", async () => {
    const { StatusPill } = await import("../features/will/ui/StatusPill");
    expect(StatusPill).toBeDefined();
    for (const label of ["notStarted", "complete", "incomplete", "professional-required"])
      expect(i18n.exists(`will.status.${label}`), label).toBe(true);
  });

  it("define every literal key the will screens ask for (no raw key can reach the screen)", () => {
    const dir = join(__dirname, "../features/will/ui");
    const missing: string[] = [];
    for (const file of readdirSync(dir).filter((f) => /\.tsx$/.test(f) && !f.includes(".test."))) {
      const source = readFileSync(join(dir, file), "utf8");
      for (const m of source.matchAll(/\bt\(\s*"((?:will|home)\.[^"$]+)"/g))
        if (!i18n.exists(m[1]!)) missing.push(`${file}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it("explain the forms of will simply: the handwritten one needs no notary, and Veille targets it", () => {
    const text = (key: string) => i18n.t(`will.explainer.forms.${key}`);
    expect(text("handwritten.term")).toMatch(/olographe/);
    expect(text("handwritten.text")).toMatch(/pas besoin de notaire/);
    expect(text("handwritten.text")).toMatch(/entier de votre main.*daté|datez/);
    expect(text("handwritten.text")).toMatch(/même valeur/);
    expect(text("handwritten.text")).toMatch(/perdu|contesté/);
    expect(text("authentic.text")).toMatch(/notaire/);
    expect(text("authentic.text")).toMatch(/payant/);
    expect(text("mystic.term")).toMatch(/Mystique/);
    expect(text("intro")).toMatch(/écrite à la main/);
    expect(text("notaryOptional")).toMatch(/facultatif/);
  });

  it("never present the notary as mandatory for a handwritten will", () => {
    const mandatory =
      /(obligatoire|vous devez voir un notaire|un notaire doit|il faut (voir )?un notaire)/i;
    const offenders = texts
      .filter(([, text]) => mandatory.test(text))
      // "n'est pas obligatoire" is exactly the reassurance we want to keep.
      .filter(([, text]) => !/pas (besoin|obligatoire)|n'est pas obligatoire/i.test(text))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });
});
