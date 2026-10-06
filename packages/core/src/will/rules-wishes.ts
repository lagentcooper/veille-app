import {
  blocking,
  buildAssessment,
  inconsistency,
  missing,
  type Assessment,
  type Finding,
} from "./findings";
import type { WishesDocument } from "./model";

export const WISHES_MISSING_FIELDS = [
  "content",
  "hasBodyWishes",
  "message.recipientLabel",
  "message.text",
  "papers.label",
  "papers.location",
] as const;

export const WISHES_DISCOURAGED = ["credentialsStored"] as const;

/**
 * ⚖️ À arbitrer (§2.4, décision produit 6) — storing passwords / identifiers "for the heirs" is
 * strongly discouraged. This is a deliberately narrow lexical heuristic: it raises a ⚠️ warning,
 * never a refusal, and it can miss or over-match. The text is inspected, never copied or logged.
 */
const CREDENTIAL_HINT = /mots?\s+de\s+passe|password|passcode|code\s+(secret|pin)\b/i;

const isBlank = (s: string): boolean => s.trim().length === 0;

export function assessWishesDocument(doc: WishesDocument): Assessment {
  const out: Finding[] = [];

  const hasContent =
    !isBlank(doc.funeralWishes) ||
    doc.messages.some((m) => !isBlank(m.text)) ||
    doc.papers.some((p) => !isBlank(p.label) || !isBlank(p.location));
  if (!hasContent) out.push(missing("content"));

  // Organ / body donation: specific regimes → consult a professional (§2.2).
  if (doc.hasBodyWishes === "unknown") out.push(missing("hasBodyWishes"));
  if (doc.hasBodyWishes === "yes")
    out.push(blocking("body-wishes", "body-wishes", "hasBodyWishes"));

  doc.messages.forEach((m, i) => {
    if (isBlank(m.recipientLabel))
      out.push({ ...missing("message.recipientLabel"), field: `messages.${i}.recipientLabel` });
    if (isBlank(m.text)) out.push({ ...missing("message.text"), field: `messages.${i}.text` });
  });
  doc.papers.forEach((p, i) => {
    if (isBlank(p.label)) out.push({ ...missing("papers.label"), field: `papers.${i}.label` });
    if (isBlank(p.location))
      out.push({ ...missing("papers.location"), field: `papers.${i}.location` });
  });

  const ids = [...doc.messages.map((m) => m.id), ...doc.papers.map((p) => p.id)];
  if (new Set(ids).size !== ids.length) out.push(inconsistency("duplicateId"));

  const texts: Array<[string, string]> = [
    ["funeralWishes", doc.funeralWishes],
    ...doc.messages.map((m, i): [string, string] => [`messages.${i}.text`, m.text]),
    ...doc.papers.map((p, i): [string, string] => [`papers.${i}.location`, p.location]),
  ];
  for (const [field, text] of texts) {
    if (CREDENTIAL_HINT.test(text)) {
      out.push({
        kind: "discouraged",
        code: "discouraged.credentialsStored",
        level: "incomplete",
        messageKey: "will.finding.discouraged.credentialsStored",
        field,
      });
    }
  }
  return buildAssessment(out);
}
