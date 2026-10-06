// @vitest-environment node
import { spawnSync } from "node:child_process";
import { createEmptyWishesDocument, type WillDraft, type WishesDocument } from "@veille/core/will";
import { createEmptyWillDraft } from "@veille/core/will";
import { initI18n } from "../../../i18n";
import {
  composeHandwritingPdf,
  composeWishesPdf,
  DRAFT_PDF_FILENAME,
  WISHES_PDF_FILENAME,
  type Translate,
} from "./documents";
import { renderPdf } from "./pdf";

let t: Translate;
beforeAll(async () => {
  const i18n = await initI18n();
  t = (key, params) => i18n.t(key, params ?? {});
});

const draft = (): WillDraft => ({
  ...createEmptyWillDraft(),
  testatorFullName: "Personne Fictive",
  beneficiaries: [{ id: "b1", kind: "natural-person", displayName: "Alex Exemple", isMinor: "no" }],
  provisions: [{ id: "p1", beneficiaryId: "b1", subject: "Mon vélo rouge", clause: "none" }],
  handwritingGuideAcknowledged: true,
});
const wishes = (): WishesDocument => ({
  ...createEmptyWishesDocument(),
  funeralWishes: "Une cérémonie simple au bord de la mer.",
  messages: [{ id: "m1", recipientLabel: "Mes proches", text: "Merci pour tout." }],
  papers: [{ id: "k1", label: "Contrats", location: "Classeur bleu" }],
  hasBodyWishes: "no",
});

const readable = (bytes: Uint8Array): string => {
  const out = spawnSync("pdftotext", ["-layout", "-", "-"], { input: bytes, encoding: "utf8" });
  return out.status === 0 ? out.stdout : new TextDecoder("latin1").decode(bytes);
};
const flat = (s: string) => s.replace(/\s+/g, " ");

describe("the two PDFs", () => {
  let draftPdf: Uint8Array;
  let wishesPdf: Uint8Array;
  let draftText: string;
  let wishesText: string;
  beforeAll(() => {
    draftPdf = renderPdf(composeHandwritingPdf(draft(), t));
    wishesPdf = renderPdf(composeWishesPdf(wishes(), t));
    draftText = flat(readable(draftPdf));
    wishesText = flat(readable(wishesPdf));
  });

  it("are two different files with two different names, never merged", () => {
    expect(DRAFT_PDF_FILENAME).not.toBe(WISHES_PDF_FILENAME);
    expect(draftPdf).not.toEqual(wishesPdf);
    expect(draftText).not.toBe(wishesText);
  });

  it("the handwriting draft holds the text to copy and the how-to, and nothing from the wishes", () => {
    expect(draftText).toContain("Personne Fictive");
    expect(draftText).toContain("Je laisse à Alex Exemple : Mon vélo rouge.");
    expect(draftText).toContain("Recopiez le texte en entier, à la main");
    expect(draftText).toContain("Écrivez la date");
    expect(draftText).toContain("Signez de votre main");
    expect(draftText).not.toContain("cérémonie");
    expect(draftText).not.toContain("Classeur bleu");
  });

  it("the wishes document holds the wishes, and no testament text", () => {
    expect(wishesText).toContain("cérémonie simple au bord de la mer");
    expect(wishesText).toContain("Pour : Mes proches");
    expect(wishesText).toContain("Contrats : Classeur bleu");
    expect(wishesText).not.toContain("Ceci est mon testament");
    expect(wishesText).not.toContain("Alex Exemple");
  });

  it("both say plainly what they are not, and that Veille does not replace a notary", () => {
    expect(draftText).toContain("n'est pas un testament");
    expect(wishesText).toContain("Ce n'est pas un testament");
    for (const text of [draftText, wishesText]) {
      expect(text).toContain("ne remplace pas un notaire");
      expect(text).toContain("version d'évaluation");
    }
  });

  it("never claim validity", () => {
    for (const text of [draftText, wishesText]) expect(text).not.toMatch(/\bvalid/i);
  });

  it("omit empty sections of the wishes instead of printing blank headings", () => {
    const only = flat(
      readable(
        renderPdf(
          composeWishesPdf({ ...createEmptyWishesDocument(), funeralWishes: "Simple." }, t),
        ),
      ),
    );
    expect(only).toContain("Mes souhaits pour mes obsèques");
    expect(only).not.toContain("Mes messages");
    expect(only).not.toContain("Où trouver mes papiers");
  });
});
