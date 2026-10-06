import { LIMITS, type WishesDocument } from "@veille/core/will";
import type { Step } from "./steps";

function replaceAt<V>(items: readonly V[], index: number, next: V): V[] {
  return items.map((item, i) => (i === index ? next : item));
}

export function wishesSteps(d: WishesDocument): Step<WishesDocument>[] {
  const steps: Step<WishesDocument>[] = [
    {
      id: "funeral",
      key: "funeral",
      kind: "longText",
      maxLength: LIMITS.longText,
      // "content" is the engine's finding when nothing at all has been written yet.
      fields: ["content", "funeralWishes"],
      get: (doc) => doc.funeralWishes,
      set: (doc, v) => ({ ...doc, funeralWishes: v }),
    },
    {
      id: "hasBodyWishes",
      key: "hasBodyWishes",
      kind: "answer",
      fields: ["hasBodyWishes"],
      get: (doc) => doc.hasBodyWishes,
      set: (doc, v) => ({ ...doc, hasBodyWishes: v }),
    },
  ];
  if (d.hasBodyWishes === "yes") {
    steps.push({
      id: "bodyWishesNote",
      key: "bodyWishesNote",
      kind: "longText",
      maxLength: LIMITS.longText,
      fields: [],
      get: (doc) => doc.bodyWishesNote,
      set: (doc, v) => ({ ...doc, bodyWishesNote: v }),
    });
  }

  d.messages.forEach((_, i) => {
    const at = (patch: Partial<WishesDocument["messages"][number]>) => (doc: WishesDocument) => ({
      ...doc,
      messages: replaceAt(doc.messages, i, { ...doc.messages[i]!, ...patch }),
    });
    steps.push(
      {
        id: `message:${i}:recipient`,
        key: "message.recipient",
        kind: "text",
        maxLength: LIMITS.shortText,
        fields: [`messages.${i}.recipientLabel`],
        get: (doc) => doc.messages[i]?.recipientLabel ?? "",
        set: (doc, v) => at({ recipientLabel: v })(doc),
      },
      {
        id: `message:${i}:text`,
        key: "message.text",
        kind: "longText",
        maxLength: LIMITS.longText,
        params: { name: d.messages[i]?.recipientLabel ?? "" },
        fields: [`messages.${i}.text`],
        get: (doc) => doc.messages[i]?.text ?? "",
        set: (doc, v) => at({ text: v })(doc),
      },
    );
  });
  steps.push({
    id: "messages:more",
    key: "message.more",
    kind: "more",
    hasAny: d.messages.length > 0,
    fields: [],
    add: (doc, newId) => ({
      doc: { ...doc, messages: [...doc.messages, { id: newId(), recipientLabel: "", text: "" }] },
      goto: `message:${doc.messages.length}:recipient`,
    }),
  });

  d.papers.forEach((_, i) => {
    const at = (patch: Partial<WishesDocument["papers"][number]>) => (doc: WishesDocument) => ({
      ...doc,
      papers: replaceAt(doc.papers, i, { ...doc.papers[i]!, ...patch }),
    });
    steps.push(
      {
        id: `paper:${i}:label`,
        key: "paper.label",
        kind: "text",
        maxLength: LIMITS.shortText,
        fields: [`papers.${i}.label`],
        get: (doc) => doc.papers[i]?.label ?? "",
        set: (doc, v) => at({ label: v })(doc),
      },
      {
        id: `paper:${i}:location`,
        key: "paper.location",
        kind: "longText",
        maxLength: LIMITS.longText,
        params: { name: d.papers[i]?.label ?? "" },
        // The credential warning is raised on this field as well.
        fields: [`papers.${i}.location`],
        get: (doc) => doc.papers[i]?.location ?? "",
        set: (doc, v) => at({ location: v })(doc),
      },
    );
  });
  steps.push({
    id: "papers:more",
    key: "paper.more",
    kind: "more",
    hasAny: d.papers.length > 0,
    fields: [],
    add: (doc, newId) => ({
      doc: { ...doc, papers: [...doc.papers, { id: newId(), label: "", location: "" }] },
      goto: `paper:${doc.papers.length}:label`,
    }),
  });
  return steps;
}
