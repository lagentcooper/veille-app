import {
  HANDWRITING_GUIDE_STEP_KEYS,
  WILL_DISCLAIMER_KEYS,
  type WillDraft,
  type WishesDocument,
} from "@veille/core/will";
import type { PdfBlock, PdfInput } from "./pdf";

/** Translator injected by the caller; this module stays free of React and i18n libraries. */
export type Translate = (key: string, params?: Record<string, string | number>) => string;

export const DRAFT_PDF_FILENAME = "brouillon-testament-a-recopier.pdf";
export const WISHES_PDF_FILENAME = "document-de-volontes.pdf";

const common = (t: Translate) => ({
  header: t("will.pdf.evaluationHeader"),
  pageLabel: t("will.pdf.pageLabel"),
});

const body = (text: string): PdfBlock => ({ style: "body", text });
const heading = (text: string): PdfBlock => ({ style: "heading", text });

/**
 * PDF 1 — the text to COPY BY HAND, with the how-to. It is not a will until the user has written
 * it out entirely by hand, dated and signed it (⚖️ wording to be validated by a lawyer).
 * Never merged with the wishes document: they are two different objects (ADR-0008).
 */
export function composeHandwritingPdf(draft: WillDraft, t: Translate): PdfInput {
  const name = draft.testatorFullName.trim();
  const beneficiaryName = (id: string) =>
    draft.beneficiaries.find((b) => b.id === id)?.displayName.trim() ?? "";
  const blocks: PdfBlock[] = [
    { style: "title", text: t("will.pdf.draft.title") },
    { style: "note", text: t(WILL_DISCLAIMER_KEYS[1]) },
    heading(t("will.pdf.draft.howToTitle")),
    ...HANDWRITING_GUIDE_STEP_KEYS.map((key, i) => body(`${i + 1}. ${t(key)}`)),
    heading(t("will.pdf.draft.textTitle")),
    { style: "note", text: t("will.pdf.draft.textIntro") },
    body(t("will.pdf.draft.opening", { name })),
    ...draft.provisions.map((p, i) =>
      body(
        t("will.pdf.draft.bequest", {
          number: i + 1,
          beneficiary: beneficiaryName(p.beneficiaryId),
          subject: p.subject.trim(),
        }),
      ),
    ),
    body(t("will.pdf.draft.closing")),
  ];
  return {
    title: t("will.pdf.draft.title"),
    ...common(t),
    footer: `${t(WILL_DISCLAIMER_KEYS[0])} ${t(WILL_DISCLAIMER_KEYS[2])}`,
    blocks,
  };
}

/** PDF 2 — non-testamentary wishes. It says so on every page: it is not a will. */
export function composeWishesPdf(wishes: WishesDocument, t: Translate): PdfInput {
  const blocks: PdfBlock[] = [
    { style: "title", text: t("will.pdf.wishes.title") },
    { style: "note", text: t("will.pdf.wishes.notAWill") },
  ];
  if (wishes.funeralWishes.trim()) {
    blocks.push(heading(t("will.pdf.wishes.funeral")), body(wishes.funeralWishes.trim()));
  }
  if (wishes.messages.length > 0) {
    blocks.push(heading(t("will.pdf.wishes.messages")));
    for (const m of wishes.messages) {
      blocks.push(
        body(t("will.pdf.wishes.messageTo", { recipient: m.recipientLabel.trim() })),
        body(m.text.trim()),
      );
    }
  }
  if (wishes.papers.length > 0) {
    blocks.push(heading(t("will.pdf.wishes.papers")));
    for (const p of wishes.papers) {
      blocks.push(
        body(
          t("will.pdf.wishes.paperLine", { label: p.label.trim(), location: p.location.trim() }),
        ),
      );
    }
  }
  return {
    title: t("will.pdf.wishes.title"),
    ...common(t),
    footer: `${t(WILL_DISCLAIMER_KEYS[0])} ${t("will.pdf.wishes.notAWill")}`,
    blocks,
  };
}
