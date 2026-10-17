// Turns a student's Submission_Url field into one text snapshot for LLM review.
//
// The field is free text: students often paste several links in it (for example
// a Google Doc and a Sheet separated by ";" or spaces). Every supported link is
// read (GitHub repository, public Google Doc, public Google Sheet). Anything
// unreadable is listed in the snapshot as such, so the reviewer never mistakes
// "could not read" for "not submitted".
const { SubmissionFetchError } = require("./submissionFetchError");
const { buildRepoSnapshot } = require("./githubRepoSnapshot");
const { readGoogleDoc, readGoogleSheet } = require("./googleDocsFetcher");

const MAX_SOURCES = 4;
const SUPPORTED_HELP = "Supported links: a public GitHub repository, or a Google Doc or Google Sheet shared as \"Anyone with the link can view\".";

function extractUrls(raw) {
  const found = String(raw || "").match(/https?:\/\/[^\s;,<>"'()]+/gi) || [];
  return [...new Set(found.map((u) => u.replace(/[.\]]+$/, "")))];
}

function classify(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { type: "unsupported", rawUrl };
  }
  const host = url.hostname.toLowerCase();
  if (host === "github.com" || host === "www.github.com") return { type: "github", rawUrl, url };
  if (host === "docs.google.com") {
    const m = url.pathname.match(/^\/(document|spreadsheets)\/(?:u\/\d+\/)?d\/([\w-]+)/);
    // "d/e/<token>" is a published-to-web link, a different format that is not read here.
    if (m && m[2] !== "e") return { type: m[1] === "document" ? "google-doc" : "google-sheet", rawUrl, url, id: m[2] };
  }
  return { type: "unsupported", rawUrl, host };
}

async function readSource(link) {
  if (link.type === "github") {
    const s = await buildRepoSnapshot(link.rawUrl);
    return { text: s.text, label: `GitHub repository ${s.repoName} (${s.filesIncluded} of ${s.totalFiles} files read)` };
  }
  if (link.type === "google-doc") return readGoogleDoc(link.id);
  return readGoogleSheet(link.url, link.id);
}

/**
 * @param {string} rawSubmission the Submission_Url field (may hold several links)
 * @returns {Promise<{text: string, sources: string[]}>} `sources` are short human labels for the admin UI.
 * @throws {SubmissionFetchError} when no link could be read at all.
 */
async function buildSubmissionSnapshot(rawSubmission) {
  const links = extractUrls(rawSubmission).map(classify);
  const readable = links.filter((l) => l.type !== "unsupported").slice(0, MAX_SOURCES);
  const unsupported = links.filter((l) => l.type === "unsupported");

  if (!readable.length) {
    throw new SubmissionFetchError(
      422,
      links.length
        ? `None of the submitted links can be read automatically. ${SUPPORTED_HELP}`
        : `The submission contains no link. ${SUPPORTED_HELP}`
    );
  }

  const results = await Promise.all(
    readable.map(async (link) => {
      try {
        return { link, ...(await readSource(link)) };
      } catch (err) {
        if (!(err instanceof SubmissionFetchError)) throw err;
        return { link, error: err };
      }
    })
  );

  const ok = results.filter((r) => !r.error);
  if (!ok.length) throw results[0].error;

  let text = "";
  const sources = [];
  ok.forEach((r, i) => {
    text += `\n########## SOURCE ${i + 1}: ${r.label} ##########\nLINK: ${r.link.rawUrl}\n${r.text}\n`;
    sources.push(r.label);
  });
  results
    .filter((r) => r.error)
    .forEach((r) => {
      text += `\nSOURCE NOT READABLE (${r.error.message}): ${r.link.rawUrl}\n`;
      sources.push(`Not read: ${r.link.type} link (${r.error.message})`);
    });
  unsupported.forEach((l) => {
    text += `\nLINK NOT READ (unsupported type, content not seen): ${l.rawUrl}\n`;
    sources.push(`Not read: ${l.host || "link"} (unsupported)`);
  });

  return { text, sources };
}

module.exports = { buildSubmissionSnapshot };
