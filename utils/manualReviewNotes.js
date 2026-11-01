// "Needs manual review" notes: every file the AI could not read, or read only in part.
//
// The list is built from the submission snapshot itself (the "NOT READ" lines and
// "truncated" markers that the fetchers write), so the file name and the last text
// that WAS read are exact and do not depend on the model remembering them. The model
// adds its own entries for what only it can judge (see needsManualReview in the
// review schema); both are merged here.
const REF_CHARS = 160; // how much of the last text read is quoted as the partial-text reference
const MAX_ITEMS = 15;

// Any "[...something truncated / NOT read]" marker written into the snapshot.
const CUT_MARKER = /^\[\.\.\.(.*?(?:truncated|NOT READ).*?)\]$/i;

const tail = (lines) => {
  const joined = lines.join(" ").replace(/\s+/g, " ").trim();
  return joined ? `…${joined.slice(-REF_CHARS)}` : "";
};

const cutReason = (inner) => {
  const text = inner.replace(/^\.\.\./, "").replace(/^(?:FILE|DOCUMENT) TRUNCATED:\s*/i, "").trim();
  // Bare markers such as "tab truncated" carry no sentence of their own.
  return text.length < 25 ? "The rest of this was cut off and was NOT read" : text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * @param {string} snapshotText the text from buildSubmissionSnapshot
 * @returns {{file: string, reason: string, partialText: string}[]}
 */
function findIncompleteReads(snapshotText) {
  const items = [];
  let sourceName = "";
  let fileName = "";
  let tabName = "";
  let recent = [];
  let awaitingLink = false;

  const currentName = () => {
    const base = fileName || sourceName;
    return tabName ? `${base}, tab "${tabName}"` : base;
  };

  for (const rawLine of String(snapshotText || "").split("\n")) {
    const line = rawLine.trim();
    let m;
    if ((m = line.match(/^########## SOURCE \d+: (.*) ##########$/))) {
      sourceName = m[1];
      fileName = "";
      tabName = "";
      recent = [];
      awaitingLink = true;
    } else if (awaitingLink && (m = line.match(/^LINK: (.*)$/))) {
      sourceName = `${sourceName} ${m[1]}`;
      awaitingLink = false;
    } else if ((m = line.match(/^===== FILE: (.*?)(?: :: .*)? =====$/))) {
      fileName = m[1];
      tabName = "";
      recent = [];
    } else if ((m = line.match(/^--- TAB: (.*) ---$/))) {
      tabName = m[1];
      recent = [];
    } else if ((m = line.match(/^FILE NOT READ \((.*)\): (.*)$/))) {
      items.push({ file: m[2], reason: m[1], partialText: "" });
    } else if ((m = line.match(/^FILES NOT READ \((.*)\): (.*)$/))) {
      m[2].split(", ").forEach((file) => items.push({ file, reason: m[1], partialText: "" }));
    } else if ((m = line.match(/^(?:SOURCE NOT READABLE|LINK NOT READ) \((.*)\): (.*)$/))) {
      items.push({ file: m[2], reason: m[1], partialText: "" });
    } else if ((m = line.match(/^FOLDER NOT READ: (.*)$/))) {
      items.push({ file: m[1], reason: "This part of the folder was not opened", partialText: "" });
    } else if ((m = line.match(CUT_MARKER))) {
      items.push({ file: currentName() || "(submission)", reason: cutReason(m[1]), partialText: tail(recent) });
      recent = [];
    } else if (line) {
      recent.push(line);
      if (recent.length > 4) recent.shift();
    }
  }
  return items;
}

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const sameFile = (a, b) => {
  const x = norm(a);
  const y = norm(b);
  return Boolean(x && y) && (x === y || x.includes(y) || y.includes(x));
};

const clean = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Merges the server-detected items with the model's own list. A model entry for a file
 * that is already listed is dropped (the detected one carries the exact partial text).
 * @param {{file: string, reason: string, partialText: string}[]} detected
 * @param {unknown} fromModel raw `needsManualReview` array from the review
 */
function mergeManualReview(detected, fromModel) {
  const merged = [...detected];
  (Array.isArray(fromModel) ? fromModel : []).forEach((item) => {
    const entry = {
      file: clean(item?.file, 200),
      reason: clean(item?.reason, 300),
      partialText: clean(item?.partialText, REF_CHARS + 40),
    };
    if (!entry.file || !entry.reason) return;
    if (merged.some((d) => sameFile(d.file, entry.file))) return;
    merged.push(entry);
  });
  return merged.slice(0, MAX_ITEMS).map((i) => ({ ...i, file: clean(i.file, 200), reason: clean(i.reason, 300) }));
}

/** The section appended to the review comment; empty string when nothing needs a manual look. */
function formatManualReview(items) {
  if (!items.length) return "";
  const lines = items.map(
    (i) => `- ${i.file}: ${i.reason}.${i.partialText ? ` Last text read: "${i.partialText}"` : ""}`.replace(/\.\.(?= |$)/g, ".")
  );
  return `Needs manual review (the AI could not fully review these, so a teacher should check them):\n${lines.join("\n")}`;
}

module.exports = { findIncompleteReads, mergeManualReview, formatManualReview };
