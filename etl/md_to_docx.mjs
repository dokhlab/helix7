/**
 * Build a NAR-style .docx from the Helix7 manuscript markdown, so the .docx is
 * always regenerated from the .md (single source of truth). Figures named
 * Figure1.png / Figure2.png in the same folder as the .md are embedded at the end.
 *
 *   node md_to_docx.mjs "<path/to/manuscript.md>" "<path/to/out.docx>"
 */
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  ImageRun, PageBreak, ExternalHyperlink,
} from "docx";
import fs from "node:fs";
import path from "node:path";

const MD_PATH = process.argv[2];
const OUT = process.argv[3];
const DIR = path.dirname(MD_PATH);
const FONT = "Times New Roman";
const SZ = 22;      // 11pt
const LINE = 360;   // 1.5 spacing

const raw = fs.readFileSync(MD_PATH, "utf8");
const lines = raw.split(/\r?\n/);

/* ---- inline **bold** / *italic* parsing -> TextRun[] ---- */
function inline(text, base = {}) {
  const runs = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0, m;
  const push = (t, o = {}) => t && runs.push(new TextRun({ text: t, font: FONT, size: SZ, ...base, ...o }));
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    if (m[2] !== undefined) push(m[2], { bold: true });
    else push(m[3], { italics: true });
    last = re.lastIndex;
  }
  push(text.slice(last));
  return runs.length ? runs : [new TextRun({ text: "", font: FONT, size: SZ })];
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { line: LINE, after: 160 },
    alignment: AlignmentType.JUSTIFIED,
    children: inline(text),
    ...opts,
  });
}

/* ---- table borders ---- */
const b = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const borders = { top: b, bottom: b, left: b, right: b };
function tableFrom(rows) {
  const cols = rows[0].length;
  const widths = Array(cols).fill(Math.floor(9360 / cols));
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((cells, ri) => new TableRow({
      tableHeader: ri === 0,
      children: cells.map((c, ci) => new TableCell({
        width: { size: widths[ci], type: WidthType.DXA },
        borders,
        shading: ri === 0 ? { type: ShadingType.CLEAR, fill: "E8ECF2", color: "auto" } : undefined,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({ children: inline(c, { size: 20, ...(ri === 0 ? { bold: true } : {}) }) })],
      })),
    })),
  });
}

/* ---- walk the markdown ---- */
const children = [];
let i = 0;
let inRefs = false;

function isTableRow(s) { return /^\s*\|/.test(s); }

while (i < lines.length) {
  let line = lines[i];

  if (line.trim() === "" ) { i++; continue; }
  if (line.trim() === "---") { i++; continue; }

  // headings
  if (line.startsWith("### ")) {
    children.push(new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [new TextRun({ text: line.slice(4).replace(/\*/g, ""), font: FONT, size: 22, bold: true, italics: true })],
    }));
    i++; continue;
  }
  if (line.startsWith("## ")) {
    const t = line.slice(3).replace(/\*/g, "");
    inRefs = /^References/i.test(t);
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 260, after: 140 },
      pageBreakBefore: /^(Table 1|References|Figure legends)/i.test(t),
      children: [new TextRun({ text: t.toUpperCase(), font: FONT, size: 26, bold: true })],
    }));
    i++; continue;
  }
  if (line.startsWith("# ")) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [new TextRun({ text: line.slice(2).replace(/\*/g, ""), font: FONT, size: 32, bold: true })],
    }));
    // front matter until first blank-then-## — center subsequent non-heading lines up to "---"
    i++;
    while (i < lines.length && lines[i].trim() !== "---") {
      const fm = lines[i];
      if (fm.trim() === "") { i++; continue; }
      // resource URL line -> hyperlink
      if (/Resource URL:/.test(fm)) {
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 60 },
          children: [
            new TextRun({ text: "Resource URL: ", font: FONT, size: 20 }),
            new ExternalHyperlink({ link: "https://helix7.dokhlab.org", children: [new TextRun({ text: "https://helix7.dokhlab.org", font: FONT, size: 20, style: "Hyperlink" })] }),
          ],
        }));
      } else {
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 40 },
          children: inline(fm.replace(/\\/g, ""), { size: 20 }),
        }));
      }
      i++;
    }
    continue;
  }

  // tables
  if (isTableRow(line)) {
    const block = [];
    while (i < lines.length && isTableRow(lines[i])) { block.push(lines[i]); i++; }
    const rows = block
      .filter((r) => !/^\s*\|[\s:|-]+\|\s*$/.test(r)) // drop separator row
      .map((r) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
    children.push(tableFrom(rows));
    children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "" })] }));
    continue;
  }

  // reference list items
  if (inRefs && /^\d+\.\s/.test(line)) {
    children.push(new Paragraph({
      spacing: { line: 300, after: 80 },
      indent: { left: 360, hanging: 360 },
      children: inline(line, { size: 20 }),
    }));
    i++; continue;
  }

  // normal paragraph (may include a leading bold "**Label.**")
  children.push(para(line));
  i++;
}

/* ---- embed figures at the end ---- */
function figure(file, w, h, legendPrefix) {
  const p = path.join(DIR, file);
  if (!fs.existsSync(p)) return [];
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ type: "png", data: fs.readFileSync(p), transformation: { width: w, height: h } })],
    }),
    new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: legendPrefix, font: FONT, size: 18, italics: true })] }),
  ];
}
children.push(...figure("Figure1.png", 470, 812, "Figure 1. See the manuscript figure legends."));
children.push(...figure("Figure2.png", 386, 844, "Figure 2. See the manuscript figure legends."));

const doc = new Document({
  creator: "Helix7 / Dokholyan Laboratory",
  title: "Helix7: an integrated atlas of the human GPCRome",
  styles: { default: { document: { run: { font: FONT, size: SZ } } } },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT, buf.length, "bytes"); });
