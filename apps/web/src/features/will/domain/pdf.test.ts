// @vitest-environment node
import { spawnSync } from "node:child_process";
import { renderPdf, toWinAnsi, wrapText, type PdfInput } from "./pdf";

const base = (blocks: PdfInput["blocks"]): PdfInput => ({
  title: "Titre d'essai",
  header: "En-tête",
  footer: "Pied de page",
  pageLabel: "Page {n} sur {total}",
  blocks,
});
const text = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

describe("wrapText", () => {
  it("wraps on word boundaries without exceeding the column count", () => {
    const lines = wrapText("un deux trois quatre cinq six sept huit neuf dix", 12);
    expect(lines.every((l) => l.length <= 12)).toBe(true);
    expect(lines.join(" ")).toBe("un deux trois quatre cinq six sept huit neuf dix");
  });
  it("cuts a word longer than a line, and keeps paragraph breaks", () => {
    expect(wrapText("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
    expect(wrapText("a\n\nb", 10)).toEqual(["a", "", "b"]);
  });
});

describe("toWinAnsi", () => {
  it("keeps French accents as single bytes and maps typographic quotes", () => {
    expect(toWinAnsi("é à ç ô œ ’ « »")).toBe("\xe9 \xe0 \xe7 \xf4 \x9c \x92 \xab \xbb");
  });
  it("replaces what the font cannot show instead of corrupting the file", () => {
    expect(toWinAnsi("a😀b→c")).toBe("a?b?c");
  });
});

describe("renderPdf", () => {
  const pdf = renderPdf(
    base([
      { style: "title", text: "Un titre" },
      { style: "body", text: "Ligne avec (parenthèses) et \\ antislash, é à ç." },
    ]),
  );
  const raw = text(pdf);

  it("is a well-formed PDF: header, trailer, and an xref table whose offsets are exact", () => {
    expect(raw.startsWith("%PDF-1.4")).toBe(true);
    expect(raw.trimEnd().endsWith("%%EOF")).toBe(true);
    const startxref = Number(/startxref\n(\d+)\n%%EOF/.exec(raw)?.[1]);
    expect(raw.slice(startxref, startxref + 4)).toBe("xref");
    const entries = [...raw.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) =>
      Number(m[1]),
    );
    expect(entries.length).toBeGreaterThan(5);
    entries.forEach((offset, i) => expect(raw.slice(offset, offset + 8)).toBe(`${i + 1} 0 obj\n`));
  });

  it("declares as many pages as it has", () => {
    const many = renderPdf(
      base(Array.from({ length: 120 }, (_, i) => ({ style: "body" as const, text: `Ligne ${i}` }))),
    );
    const count = Number(/\/Count (\d+)/.exec(text(many))?.[1]);
    expect(count).toBeGreaterThan(1);
    expect([...text(many).matchAll(/\/Type \/Page /g)]).toHaveLength(count);
  });

  it("repeats header and footer on each page and numbers them", () => {
    const many = text(
      renderPdf(base(Array.from({ length: 120 }, () => ({ style: "body" as const, text: "x" })))),
    );
    const count = Number(/\/Count (\d+)/.exec(many)?.[1]);
    expect([...many.matchAll(/\(En-t\\?\xeate\) Tj/g)]).toHaveLength(count);
    expect(many).toContain(`(Page ${count} sur ${count}) Tj`);
  });

  it("escapes PDF delimiters", () => {
    expect(raw).toContain("\\(parenth\xe8ses\\)");
    expect(raw).toContain("\\\\ antislash");
  });

  it("is deterministic", () => {
    expect(renderPdf(base([{ style: "body", text: "a" }]))).toEqual(
      renderPdf(base([{ style: "body", text: "a" }])),
    );
  });

  const hasPdftotext = spawnSync("pdftotext", ["-v"]).error === undefined;
  it.skipIf(!hasPdftotext)("is readable by a real PDF reader, accents included", () => {
    const out = spawnSync("pdftotext", ["-layout", "-", "-"], { input: pdf, encoding: "utf8" });
    expect(out.status).toBe(0);
    expect(out.stdout).toContain("Un titre");
    expect(out.stdout).toContain("(parenthèses)");
    expect(out.stdout).toContain("é à ç");
  });
});
