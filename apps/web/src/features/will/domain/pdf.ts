/**
 * Minimal text-only PDF writer. No dependency: a PDF of plain paragraphs needs ~100 lines, and one
 * dependency less is one supply-chain risk less (AGENTS.md §4). Built-in Courier fonts (monospace
 * keeps the line-wrapping exact without font metrics) with WinAnsi encoding for French accents.
 *
 * Out of scope: images, tagged PDF, compression. Output is deterministic (no timestamp).
 */

export type PdfStyle = "title" | "heading" | "body" | "note";

export interface PdfBlock {
  style: PdfStyle;
  text: string;
}

export interface PdfInput {
  title: string;
  /** Short line repeated at the top of every page. */
  header: string;
  /** Repeated at the bottom of every page, above the page number. */
  footer: string;
  /** e.g. "Page {n} sur {total}" with the placeholders replaced by the writer. */
  pageLabel: string;
  blocks: readonly PdfBlock[];
}

const PAGE = { width: 595, height: 842, margin: 56 } as const;
const FONT = { title: "F2", heading: "F2", body: "F1", note: "F3" } as const;
const SIZE = { title: 17, heading: 13, body: 12, note: 10 } as const;
const GAP_BEFORE = { title: 0, heading: 10, body: 0, note: 0 } as const;
const GAP_AFTER = { title: 8, heading: 2, body: 6, note: 6 } as const;
const CHAR_WIDTH = 0.6; // Courier: every glyph is 600/1000 em wide
const LEADING = 1.35;
const HEADER_SIZE = 9;

const WIN_ANSI_SPECIALS: Record<string, number> = {
  "€": 0x80,
  "…": 0x85,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "–": 0x96,
  "—": 0x97,
  œ: 0x9c,
  Œ: 0x8c,
  " ": 0x20,
  " ": 0xa0,
};

/** Maps a string to WinAnsi bytes (as a binary string); characters it cannot show become "?". */
export function toWinAnsi(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63;
    if (WIN_ANSI_SPECIALS[ch] !== undefined) out += String.fromCharCode(WIN_ANSI_SPECIALS[ch]);
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff))
      out += String.fromCharCode(code);
    else out += "?";
  }
  return out;
}

const escapePdf = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);

/** Greedy word wrap on a fixed column count; words longer than a line are cut. */
export function wrapText(text: string, columns: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      let rest = word;
      while (rest.length > columns) {
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(rest.slice(0, columns));
        rest = rest.slice(columns);
      }
      if (!line) line = rest;
      else if (line.length + 1 + rest.length <= columns) line += ` ${rest}`;
      else {
        lines.push(line);
        line = rest;
      }
    }
    lines.push(line);
  }
  return lines;
}

interface Placed {
  font: string;
  size: number;
  y: number;
  text: string;
}

const columnsFor = (size: number) =>
  Math.floor((PAGE.width - 2 * PAGE.margin) / (size * CHAR_WIDTH));

function paginate(input: PdfInput): Placed[][] {
  const footerLines = wrapText(input.footer, columnsFor(SIZE.note));
  const footerHeight = (footerLines.length + 1) * SIZE.note * LEADING + 8;
  const top = PAGE.height - PAGE.margin - HEADER_SIZE * 2.5;
  const bottom = PAGE.margin + footerHeight;

  const pages: Placed[][] = [[]];
  let y = top;
  for (const block of input.blocks) {
    const size = SIZE[block.style];
    const lines = wrapText(block.text, columnsFor(size));
    y -= GAP_BEFORE[block.style];
    for (const text of lines) {
      if (y - size < bottom) {
        pages.push([]);
        y = top;
      }
      y -= size * LEADING;
      pages[pages.length - 1]!.push({ font: FONT[block.style], size, y, text });
    }
    y -= GAP_AFTER[block.style];
  }
  return pages;
}

function pageStream(
  placed: readonly Placed[],
  input: PdfInput,
  pageNumber: number,
  total: number,
): string {
  const text = (font: string, size: number, x: number, y: number, s: string) =>
    `BT /${font} ${size} Tf ${x} ${y.toFixed(2)} Td (${escapePdf(toWinAnsi(s))}) Tj ET\n`;
  let out = text("F1", HEADER_SIZE, PAGE.margin, PAGE.height - PAGE.margin, input.header);
  for (const p of placed) out += text(p.font, p.size, PAGE.margin, p.y, p.text);
  const footerLines = wrapText(input.footer, columnsFor(SIZE.note));
  const label = input.pageLabel
    .replace("{n}", String(pageNumber))
    .replace("{total}", String(total));
  let fy = PAGE.margin + footerLines.length * SIZE.note * LEADING;
  for (const line of footerLines) {
    out += text("F3", SIZE.note, PAGE.margin, fy, line);
    fy -= SIZE.note * LEADING;
  }
  out += text("F1", SIZE.note, PAGE.margin, PAGE.margin - 4, label);
  return out;
}

const utf16Hex = (s: string) =>
  `<FEFF${[...s]
    .flatMap((ch) => {
      const c = ch.codePointAt(0) ?? 63;
      if (c < 0x10000) return [c];
      const v = c - 0x10000;
      return [0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff)];
    })
    .map((u) => u.toString(16).padStart(4, "0"))
    .join("")}>`;

export function renderPdf(input: PdfInput): Uint8Array {
  const pages = paginate(input);
  const objects: string[] = [];
  const add = (body: string) => objects.push(body);

  // 1 catalog, 2 pages, 3-5 fonts, 6 info, then (page, stream) pairs.
  const firstPage = 7;
  const kids = pages.map((_, i) => `${firstPage + i * 2} 0 R`).join(" ");
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  for (const name of ["Courier", "Courier-Bold", "Courier-Oblique"])
    add(`<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`);
  add(`<< /Title ${utf16Hex(input.title)} /Producer (Veille) >>`);
  pages.forEach((placed, i) => {
    const stream = pageStream(placed, input, i + 1, pages.length);
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${firstPage + i * 2 + 1} 0 R >>`,
    );
    add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  });

  let file = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(file.length);
    file += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = file.length;
  file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) file += `${String(o).padStart(10, "0")} 00000 n \n`;
  file += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  const bytes = new Uint8Array(file.length);
  for (let i = 0; i < file.length; i++) bytes[i] = file.charCodeAt(i) & 0xff;
  return bytes;
}
