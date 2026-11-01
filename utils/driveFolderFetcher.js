// Reads a public Google Drive link without credentials: a folder (every file inside
// it, one by one) or a single Drive file. Everything must be shared as "Anyone with
// the link can view".
//
// A folder is listed from Google's public embedded folder view. Each file is then
// read by its own type: Google Doc / Sheet / Slides through the public export URLs,
// anything else (PDF, Word, Excel, PowerPoint, text) by downloading it and
// extracting the text. Images, videos and other binaries are listed as not read.
const { SubmissionFetchError } = require("./submissionFetchError");
const { readGoogleDoc, readGoogleSheet, readGoogleSlides } = require("./googleDocsFetcher");
const { sniffKind, extractText } = require("./officeFileText");

// "deep" feeds the rolling multi-part review (multiPartReview.js), which has no context
// limit, so these are generous: a folder is read in full unless it is really huge.
const LIMITS = {
  normal: { files: 15, totalChars: 40000, maxFileChars: 20000 },
  deep: { files: 40, totalChars: 600000, maxFileChars: 200000 },
};
const MIN_FILE_CHARS = 3000;
// Screenshots, videos and audio are not read (no vision/transcription). They are listed by
// name only, so the reviewer can see that the evidence the answer sheet refers to exists.
const MEDIA_NAMES = [
  ["image", /\.(png|jpe?g|gif|webp|bmp|svg|heic|tiff?)$/i],
  ["video", /\.(mp4|mov|mkv|avi|webm|m4v|wmv)$/i],
  ["audio", /\.(mp3|wav|m4a|aac|ogg)$/i],
];
const ARCHIVE_NAME = /\.(zip|rar|7z|exe)$/i;
const mediaKind = (name) => MEDIA_NAMES.find(([, re]) => re.test(name))?.[0] || null;
const MAX_MEDIA_LINES = 100;
const MAX_FOLDER_DEPTH = 4; // the linked folder plus three levels of sub-folders
const MAX_FOLDERS_LISTED = 30; // folder listings per submission (one request each)
const MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024;
const READ_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 30000;
const USER_AGENT = "Mozilla/5.0 (compatible; roadtocareer-assignment-evaluator)";

const NOT_PUBLIC = (what) =>
  `This Google Drive ${what} is not publicly readable. The student must share it as "Anyone with the link can view".`;

/**
 * Classifies a Google Docs / Drive URL.
 * @param {URL} url
 * @returns {{kind: "doc"|"sheet"|"slides"|"folder"|"file", id: string}|null}
 */
function parseGoogleUrl(url) {
  const host = url.hostname.toLowerCase();
  if (host === "docs.google.com") {
    const m = url.pathname.match(/^\/(document|spreadsheets|presentation)\/(?:u\/\d+\/)?d\/([\w-]+)/);
    // "d/e/<token>" is a published-to-web link, a different format that is not read here.
    if (m && m[2] !== "e") return { kind: { document: "doc", spreadsheets: "sheet", presentation: "slides" }[m[1]], id: m[2] };
    return null;
  }
  if (host === "drive.google.com") {
    const folder = url.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/);
    if (folder) return { kind: "folder", id: folder[1] };
    const file = url.pathname.match(/^\/file\/(?:u\/\d+\/)?d\/([\w-]+)/);
    if (file) return { kind: "file", id: file[1] };
    const queryId = url.searchParams.get("id");
    if (queryId && /^[\w-]+$/.test(queryId)) {
      if (url.pathname === "/folderview") return { kind: "folder", id: queryId };
      if (url.pathname === "/open" || url.pathname === "/uc") return { kind: "file", id: queryId };
    }
  }
  return null;
}

const decodeHtml = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[e.toLowerCase()];
  });

async function listFolder(id) {
  let res;
  try {
    res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new SubmissionFetchError(502, "Could not reach Google Drive. Please try again.");
  }
  if (res.status === 429) throw new SubmissionFetchError(429, "Google is rate limiting requests for this Drive folder. Try again shortly.");
  if (!res.ok || /accounts\.google\.com/.test(res.url)) throw new SubmissionFetchError(422, NOT_PUBLIC("folder"));

  const html = await res.text();
  const title = decodeHtml(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").trim();
  const entries = [];
  for (const chunk of html.split('<div class="flip-entry"').slice(1)) {
    const href = chunk.match(/<a href="([^"]+)"/)?.[1];
    const name = chunk.match(/<div class="flip-entry-title">([\s\S]*?)<\/div>/)?.[1];
    if (!href || name === undefined) continue;
    let parsed = null;
    try {
      parsed = parseGoogleUrl(new URL(decodeHtml(href)));
    } catch {
      /* an entry with an unusable link is listed as not read below */
    }
    entries.push({ name: decodeHtml(name).trim(), ...(parsed || { kind: "unknown", id: "" }) });
  }
  return { title, entries };
}

// Collects the files of a folder and its sub-folders (breadth first).
async function collectFiles(rootId, maxFiles) {
  const files = [];
  const skipped = [];
  const media = [];
  const archives = [];
  const notes = [];
  let rootTitle = "";
  let listed = 0;
  let level = [{ id: rootId, path: "" }];
  for (let depth = 0; depth < MAX_FOLDER_DEPTH && level.length; depth += 1) {
    const next = [];
    // Sub-folders are listed one at a time to stay clear of Google's rate limit.
    for (const folder of level) {
      if (listed >= MAX_FOLDERS_LISTED) {
        notes.push(`${folder.path} (more sub-folders than the limit of ${MAX_FOLDERS_LISTED}, not opened)`);
        continue;
      }
      listed += 1;
      let listing;
      try {
        listing = await listFolder(folder.id);
      } catch (err) {
        if (!(err instanceof SubmissionFetchError) || depth === 0) throw err;
        notes.push(`${folder.path} (sub-folder not readable: ${err.message})`);
        continue;
      }
      if (depth === 0) rootTitle = listing.title;
      for (const entry of listing.entries) {
        const path = folder.path ? `${folder.path}/${entry.name}` : entry.name;
        if (entry.kind === "folder") {
          if (depth + 1 < MAX_FOLDER_DEPTH) next.push({ id: entry.id, path });
          else notes.push(`${path} (sub-folder nested too deep, not opened)`);
        } else if (entry.kind === "file" && mediaKind(entry.name)) {
          // Known from the name alone: no download, and no share of the character budget.
          media.push({ path, kind: mediaKind(entry.name) });
        } else if (entry.kind === "file" && ARCHIVE_NAME.test(entry.name)) {
          archives.push(path);
        } else if (files.length < maxFiles) files.push({ ...entry, path });
        else skipped.push(path);
      }
    }
    level = next;
  }
  const byPath = (a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" });
  return { title: rootTitle, files: files.sort(byPath), skipped, media: media.sort(byPath), archives: archives.sort(), notes };
}

async function readCapped(res, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of res.body) {
    size += chunk.length;
    if (size > maxBytes) {
      // Leaving the loop by throwing also closes the response stream.
      throw new SubmissionFetchError(422, `The file is larger than ${Math.round(maxBytes / 1024 / 1024)} MB and was not read.`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const clip = (text, maxChars) => {
  if (text.length <= maxChars) return { text, truncated: false };
  const head = text.slice(0, maxChars);
  const lastBreak = head.lastIndexOf("\n");
  return { text: lastBreak > maxChars * 0.9 ? head.slice(0, lastBreak) : head, truncated: true };
};

/**
 * Downloads one Drive file and extracts its text (PDF, Word, Excel, PowerPoint or plain text).
 * @param {string} id the Drive file id
 * @param {{maxChars: number}} options
 * @returns {Promise<{text: string, label: string}>}
 */
async function readDriveFile(id, { maxChars }) {
  let res;
  try {
    res = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new SubmissionFetchError(502, "Could not reach Google Drive. Please try again.");
  }
  if (res.status === 429) throw new SubmissionFetchError(429, "Google is rate limiting requests for this Drive file. Try again shortly.");

  const type = (res.headers.get("content-type") || "").toLowerCase();
  // A private file, or one too large for Drive's virus scan, answers with an HTML page.
  if (!res.ok || type.includes("text/html") || /accounts\.google\.com/.test(res.url)) {
    throw new SubmissionFetchError(422, `${NOT_PUBLIC("file")} (It may also be larger than Drive allows to download.)`);
  }
  const mediaType = type.match(/^(image|video|audio)\//)?.[1];
  if (mediaType) {
    // `media` tells the folder reader to list the file as present, not as a failure.
    const err = new SubmissionFetchError(422, `This is ${mediaType === "image" ? "an image" : `a ${mediaType} file`}, whose content is not viewed.`);
    err.media = mediaType;
    throw err;
  }
  if (Number(res.headers.get("content-length")) > MAX_DOWNLOAD_BYTES) {
    throw new SubmissionFetchError(422, `The file is larger than ${MAX_DOWNLOAD_BYTES / 1024 / 1024} MB and was not read.`);
  }

  const buf = await readCapped(res, MAX_DOWNLOAD_BYTES);
  const kind = buf.length > 4 ? sniffKind(buf) : null;
  if (!kind) throw new SubmissionFetchError(422, "This file type cannot be read as text (supported: PDF, Word, Excel, PowerPoint, text).");

  let extracted;
  try {
    extracted = await extractText(buf, kind, maxChars);
  } catch {
    throw new SubmissionFetchError(422, `The ${kind.toUpperCase()} file could not be opened (it may be damaged or password protected).`);
  }
  if (!extracted.text) {
    throw new SubmissionFetchError(422, "The file has no readable text (it may be scanned images, which cannot be read).");
  }
  // A workbook was already cut tab by tab; cutting it again would drop its last tabs.
  const { text, truncated } =
    kind === "xlsx" ? { text: extracted.text, truncated: extracted.text.includes("[...tab truncated]") } : clip(extracted.text, maxChars);
  return truncated && kind !== "xlsx"
    ? {
        text: `${text}\n[...FILE TRUNCATED: only the first ${text.length} of ${extracted.text.length} characters were read; the rest was NOT read]`,
        label: `${extracted.detail}, partly read`,
      }
    : { text, label: `${extracted.detail}${truncated ? ", long tabs cut" : ", fully read"}` };
}

function readFolderFile(file, options) {
  if (file.kind === "doc") return readGoogleDoc(file.id, options);
  if (file.kind === "slides") return readGoogleSlides(file.id, options);
  if (file.kind === "sheet") return readGoogleSheet(new URL(`https://docs.google.com/spreadsheets/d/${file.id}/edit`), file.id, options);
  if (file.kind === "file") return readDriveFile(file.id, options);
  return Promise.reject(new SubmissionFetchError(422, "Unsupported link inside the folder."));
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next;
        next += 1;
        results[i] = await fn(items[i]);
      }
    })
  );
  return results;
}

/**
 * Reads every file of a public Drive folder (and its sub-folders) one by one.
 * Each file becomes its own "===== FILE:" block, so a long review can be split between files.
 * @param {string} id the folder id
 * @param {{deep?: boolean}} [options]
 * @returns {Promise<{text: string, label: string}>}
 * @throws {SubmissionFetchError} when the folder is not public, empty, or no file in it can be read.
 */
async function readDriveFolder(id, { deep = false } = {}) {
  const limits = deep ? LIMITS.deep : LIMITS.normal;
  const { title, files, skipped, media, archives, notes } = await collectFiles(id, limits.files);
  if (!files.length) {
    throw new SubmissionFetchError(
      422,
      media.length || archives.length
        ? "The Google Drive folder has no file that can be read as text (only images, videos or archives)."
        : "The Google Drive folder is empty."
    );
  }

  const maxChars = Math.max(MIN_FILE_CHARS, Math.min(limits.maxFileChars, Math.floor(limits.totalChars / files.length)));
  const results = await mapWithConcurrency(files, READ_CONCURRENCY, async (file) => {
    try {
      return { file, ...(await readFolderFile(file, { deep, maxChars })) };
    } catch (err) {
      if (!(err instanceof SubmissionFetchError)) throw err;
      return { file, error: err };
    }
  });

  // A file without a media extension that turned out to be an image/video/audio is listed as present too.
  results.filter((r) => r.error?.media).forEach((r) => media.push({ path: r.file.path, kind: r.error.media }));
  const ok = results.filter((r) => !r.error);
  if (!ok.length) {
    throw new SubmissionFetchError(
      422,
      `None of the ${files.length} files in the Drive folder could be read. First problem: ${results[0].file.path}: ${results[0].error.message}`
    );
  }

  let text = "";
  ok.forEach((r) => {
    // " :: " separates the path from the label unambiguously (both can contain parentheses).
    text += `\n===== FILE: ${r.file.path} :: ${r.label} =====\n${r.text}\n`;
  });
  results
    .filter((r) => r.error && !r.error.media)
    .forEach((r) => {
      text += `\nFILE NOT READ (${r.error.message}): ${r.file.path}\n`;
    });
  archives.forEach((path) => {
    text += `\nFILE NOT READ (an archive, not opened): ${path}\n`;
  });
  media.slice(0, MAX_MEDIA_LINES).forEach((m) => {
    text += `\nFILE PRESENT (${m.kind}, exists in the folder; content NOT viewed): ${m.path}\n`;
  });
  if (media.length > MAX_MEDIA_LINES) text += `\n${media.length - MAX_MEDIA_LINES} more image/video/audio files are present and not listed.\n`;
  if (skipped.length) {
    text += `\nFILES NOT READ (the folder has more files than the review limit of ${limits.files}; the rest was NOT read): ${skipped.join(", ")}\n`;
  }
  notes.forEach((n) => {
    text += `\nFOLDER NOT READ: ${n}\n`;
  });

  const total = files.length + skipped.length;
  const name = title ? ` "${title}"` : "";
  const mediaNote = media.length ? `; ${media.length} image/video/audio files listed, not viewed` : "";
  return { text, label: `Google Drive folder${name} (${ok.length} of ${total} files read${mediaNote})` };
}

module.exports = { parseGoogleUrl, readDriveFolder, readDriveFile };
