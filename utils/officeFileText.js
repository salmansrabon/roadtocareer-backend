// Plain-text extraction for the files students upload to a Google Drive folder:
// PDF, Word (.docx), Excel (.xlsx) and PowerPoint (.pptx). Used by the submission
// snapshot (driveFolderFetcher.js). Images, charts and formatting are not extracted.
//
// .docx/.xlsx/.pptx are zip archives of XML, read here with a small zip reader
// (node's zlib only) instead of adding a dependency.
const zlib = require("zlib");

const MAX_ENTRY_BYTES = 20 * 1024 * 1024; // decompressed size cap per archive entry
const MAX_TABS = 12; // same as the deep Google Sheet read

function readZipEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip archive");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count && buf.readUInt32LE(p) === 0x02014b50; n += 1) {
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    entries.set(name, { method, compressedSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return {
    names: [...entries.keys()],
    read(name) {
      const e = entries.get(name);
      if (!e) return null;
      const start = e.localOffset + 30 + buf.readUInt16LE(e.localOffset + 26) + buf.readUInt16LE(e.localOffset + 28);
      const data = buf.subarray(start, start + e.compressedSize);
      if (e.method === 0) return data.toString("utf8");
      if (e.method === 8) return zlib.inflateRawSync(data, { maxOutputLength: MAX_ENTRY_BYTES }).toString("utf8");
      throw new Error("unsupported zip compression");
    },
  };
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decodeXml = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => {
    if (e[0] !== "#") return ENTITIES[e.toLowerCase()];
    return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  });
const stripTags = (xml) => decodeXml(xml.replace(/<[^>]+>/g, ""));
const tidy = (text) => text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

function docxText(zip) {
  const xml = zip.read("word/document.xml");
  if (!xml) throw new Error("not a Word document");
  return tidy(
    stripTags(
      xml
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<w:br[^>]*\/>/g, "\n")
        .replace(/<\/w:tc>/g, " | ")
        .replace(/<\/w:p>/g, "\n")
    )
  );
}

function pptxText(zip) {
  const slides = zip.names
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
  if (!slides.length) throw new Error("not a PowerPoint file");
  return tidy(
    slides
      .map((n, i) => `--- SLIDE ${i + 1} ---\n${stripTags(zip.read(n).replace(/<\/a:p>/g, "\n"))}`)
      .join("\n\n")
  );
}

const columnIndex = (ref) => [...ref.replace(/\d+/g, "")].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

// Returns [{ name, csv }] for every non-empty worksheet, in workbook order.
function xlsxSheets(zip) {
  const workbook = zip.read("xl/workbook.xml");
  if (!workbook) throw new Error("not an Excel workbook");
  const rels = zip.read("xl/_rels/workbook.xml.rels") || "";
  const targets = new Map(
    [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => [
      m[0].match(/\bId="([^"]*)"/)?.[1],
      (m[0].match(/\bTarget="([^"]*)"/)?.[1] || "").replace(/^\/?(xl\/)?/, "xl/"),
    ])
  );
  const sharedXml = zip.read("xl/sharedStrings.xml") || "";
  const shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) =>
    stripTags([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""))
  );

  const sheets = [];
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(m[0].match(/\bname="([^"]*)"/)?.[1] || `Sheet ${sheets.length + 1}`);
    const target = targets.get(m[0].match(/\br:id="([^"]*)"/)?.[1]);
    const xml = target && zip.read(target);
    if (!xml) continue;
    const rows = [];
    for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = [];
      for (const c of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const body = c[2] || "";
        const type = attrs.match(/\bt="([^"]*)"/)?.[1];
        const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
        const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let value = "";
        if (type === "s") value = shared[Number(raw)] ?? "";
        else if (type === "inlineStr") value = stripTags(body);
        else if (raw !== undefined) value = type === "b" ? (raw === "1" ? "TRUE" : "FALSE") : decodeXml(raw);
        if (value === "") continue;
        cells[ref ? columnIndex(ref) : cells.length] = csvCell(value);
      }
      if (cells.length) rows.push(Array.from(cells, (v) => v ?? "").join(","));
    }
    if (rows.length) sheets.push({ name, csv: rows.join("\n") });
  }
  return sheets;
}

/**
 * @param {Buffer} buf file bytes
 * @returns {"pdf"|"docx"|"xlsx"|"pptx"|"text"|null} sniffed from the content, not the file name
 */
function sniffKind(buf) {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (buf.readUInt32LE(0) === 0x04034b50) {
    try {
      const names = readZipEntries(buf).names;
      if (names.includes("word/document.xml")) return "docx";
      if (names.includes("xl/workbook.xml")) return "xlsx";
      if (names.some((n) => n.startsWith("ppt/slides/"))) return "pptx";
    } catch {
      return null;
    }
    return null;
  }
  // No NUL bytes in the first 4 KB: treat as text (txt, md, csv, json, code).
  return buf.subarray(0, 4096).includes(0) ? null : "text";
}

/**
 * @param {Buffer} buf
 * @param {"pdf"|"docx"|"xlsx"|"pptx"|"text"} kind from sniffKind
 * @param {number} [maxChars] size budget of the whole file; an Excel workbook shares it
 *   between its tabs so a large first tab cannot push the later tabs out of the read
 * @returns {Promise<{text: string, detail: string}>} detail = short human note, e.g. "12 pages"
 */
async function extractText(buf, kind, maxChars = Infinity) {
  if (kind === "text") return { text: buf.toString("utf8").replace(/^﻿/, "").trim(), detail: "text file" };
  if (kind === "pdf") {
    const pdfParse = require("pdf-parse");
    const parsed = await pdfParse(buf);
    return { text: (parsed.text || "").trim(), detail: `PDF, ${parsed.numpages} ${parsed.numpages === 1 ? "page" : "pages"}` };
  }
  const zip = readZipEntries(buf);
  if (kind === "docx") return { text: docxText(zip), detail: "Word document" };
  if (kind === "pptx") return { text: pptxText(zip), detail: "PowerPoint" };
  const all = xlsxSheets(zip);
  const sheets = all.slice(0, MAX_TABS);
  const perTab = Math.max(3000, Math.floor(maxChars / Math.max(1, sheets.length)));
  const more = all.length > sheets.length ? `; ${all.length - sheets.length} more tabs not read` : "";
  return {
    text: sheets
      .map((s) => `--- TAB: ${s.name} ---\n${s.csv.length > perTab ? `${s.csv.slice(0, perTab)}\n[...tab truncated]` : s.csv}`)
      .join("\n\n"),
    detail: `Excel workbook, ${sheets.length} ${sheets.length === 1 ? "tab" : "tabs"} read: ${sheets.map((s) => s.name).join(", ")}${more}`,
  };
}

module.exports = { sniffKind, extractText };
