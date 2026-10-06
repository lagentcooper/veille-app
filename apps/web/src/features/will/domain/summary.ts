import type {
  PhysicalWillRecord,
  WillDraft,
  WillSnapshot,
  WillSubject,
  WishesDocument,
} from "@veille/core/will";

export interface SummaryLine {
  /** i18n key suffix under `will.history.summary.`. */
  label: string;
  values: string[];
}

/** Readable facts of a stored version, for the history screen. Pure; no translation here. */
export function summarize(subject: WillSubject, snapshot: WillSnapshot): SummaryLine[] {
  if (subject === "will-draft") {
    const d = snapshot as WillDraft;
    const name = (id: string) => d.beneficiaries.find((b) => b.id === id)?.displayName ?? "";
    return [
      { label: "testatorFullName", values: [d.testatorFullName] },
      { label: "beneficiaries", values: d.beneficiaries.map((b) => b.displayName) },
      {
        label: "provisions",
        values: d.provisions.map((p) => `${name(p.beneficiaryId)} : ${p.subject}`),
      },
    ];
  }
  if (subject === "wishes-document") {
    const w = snapshot as WishesDocument;
    return [
      { label: "funeralWishes", values: [w.funeralWishes] },
      { label: "messages", values: w.messages.map((m) => m.recipientLabel) },
      { label: "papers", values: w.papers.map((p) => `${p.label} : ${p.location}`) },
    ];
  }
  const r = snapshot as PhysicalWillRecord;
  return [
    {
      label: "existence",
      values: [r.existence === "exists" ? "yes" : r.existence === "none" ? "no" : "unknown"],
    },
    { label: "location", values: [r.locationDetail] },
  ];
}
