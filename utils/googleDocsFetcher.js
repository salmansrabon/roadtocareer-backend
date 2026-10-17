// Reads the text of a Google Doc or Google Sheet that is shared as "Anyone with
// the link can view", through Google's public export URLs (no credentials).
// Images, drawings and formatting are not part of the text export.
const { SubmissionFetchError } = require("./submissionFetchError");

const MAX_CHARS = 24000;
const MAX_TABS = 6;
const REQUEST_TIMEOUT_MS = 20000;

async function fetchExport(exportUrl, kind) {
  let res;
  try {
    res = await fetch(exportUrl, {
      headers: { "User-Agent": "roadtocareer-assignment-evaluator" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new SubmissionFetchError(502, `Could not reach Google ${kind}. Please try again.`);
  }
  if (res.status === 429) {
    throw new SubmissionFetchError(429, `Google is rate limiting requests for this ${kind}. Try again shortly.`);
  }
  // A private file answers with a login page (HTML), not the exported text.
  const type = res.headers.get("content-type") || "";
  if (!res.ok || type.includes("text/html") || /accounts\.google\.com/.test(res.url)) {
    throw new SubmissionFetchError(
      422,
      `This Google ${kind} is not publicly readable. The student must share it as "Anyone with the link can view".`
    );
  }
  return res.text();
}

function capText(text) {
  const clean = text.replace(/^﻿/, "").trim();
  return clean.length > MAX_CHARS ? `${clean.slice(0, MAX_CHARS)}\n[...truncated, document continues]` : clean;
}

/**
 * Reads the whole document. The link's `?tab=` is deliberately ignored: adding it
 * to the export URL would return that one tab only, whereas the plain export
 * contains every tab of a multi-tab doc.
 * @param {string} id the document id
 * @returns {Promise<{text: string, label: string}>}
 */
async function readGoogleDoc(id) {
  const text = await fetchExport(`https://docs.google.com/document/d/${id}/export?format=txt`, "Doc");
  const body = capText(text);
  if (!body) throw new SubmissionFetchError(422, "The Google Doc is empty.");
  return { text: body, label: `Google Doc (${body.length.toLocaleString("en-US")} characters read)` };
}

// Names and gids of a sheet's tabs, from the public "htmlview" page. Best effort:
// returns [] if the page cannot be read, and the caller falls back to one tab.
async function listSheetTabs(id) {
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/htmlview`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; roadtocareer-assignment-evaluator)" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const html = await res.text();
    return [...html.matchAll(/items\.push\(\{name: "((?:[^"\\]|\\.)*)"[^}]*?gid: "(\d+)"/g)].map((m) => ({
      name: m[1]
        .replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\(.)/g, "$1"),
      gid: m[2],
    }));
  } catch {
    return [];
  }
}

const csvTabExport = (id, gid) =>
  `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ""}`;

// Drops rows that are only separators (empty rows export as ",,,,").
const compactCsv = (csv) => csv.split(/\r?\n/).filter((line) => line.replace(/[,\s"]/g, "")).join("\n");

/**
 * Reads up to MAX_TABS tabs of a sheet (the tab named in the link first). Falls
 * back to the linked tab alone if the tab list cannot be read.
 * @param {URL} url a docs.google.com/spreadsheets/d/<id> link
 * @param {string} id the spreadsheet id
 * @returns {Promise<{text: string, label: string}>}
 */
async function readGoogleSheet(url, id) {
  const linkedGid = (url.searchParams.get("gid") || url.hash.match(/gid=(\d+)/)?.[1] || "").replace(/\D/g, "");
  const listed = await listSheetTabs(id);
  const linkedFirst = [...listed].sort((a, b) => (b.gid === linkedGid) - (a.gid === linkedGid));
  const tabs = (linkedFirst.length ? linkedFirst : [{ name: linkedGid ? `gid ${linkedGid}` : "first tab", gid: linkedGid }]).slice(0, MAX_TABS);
  const perTabChars = Math.max(3000, Math.floor(MAX_CHARS / tabs.length));

  // The first export doubles as the access check; a private sheet fails here with the 422 message.
  const first = await fetchExport(csvTabExport(id, tabs[0].gid), "Sheet");
  const rest = await Promise.all(tabs.slice(1).map((t) => fetchExport(csvTabExport(id, t.gid), "Sheet").catch(() => "")));

  const blocks = [];
  const names = [];
  [first, ...rest].forEach((csv, i) => {
    const body = compactCsv(csv.replace(/^﻿/, "")).trim();
    if (!body) return;
    names.push(tabs[i].name);
    const clipped = body.length > perTabChars ? `${body.slice(0, perTabChars)}\n[...tab truncated]` : body;
    blocks.push(`--- TAB: ${tabs[i].name} ---\n${clipped}`);
  });
  if (!blocks.length) throw new SubmissionFetchError(422, "The Google Sheet is empty.");

  const more = listed.length > MAX_TABS ? `; ${listed.length - MAX_TABS} more tabs not read` : "";
  return { text: blocks.join("\n\n"), label: `Google Sheet, tabs read: ${names.join(", ")}${more}` };
}

module.exports = { readGoogleDoc, readGoogleSheet };
