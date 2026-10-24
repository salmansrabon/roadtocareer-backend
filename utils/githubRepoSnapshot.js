// Builds a compact, size-capped text snapshot of a public GitHub repository for
// LLM review: file tree + README + a handful of the most informative files.
//
// Only two GitHub REST calls are made per snapshot (repo metadata + recursive
// tree), so the 60/hour unauthenticated limit allows ~30 snapshots/hour.
// GITHUB_TOKEN (optional) raises that to 5000/hour. File bodies come from
// raw.githubusercontent.com, which does not count against the API limit.

const { SubmissionFetchError } = require("./submissionFetchError");

// "deep" is used by the Self-Learning auto-review (TASK-67), which reads a large
// snapshot in several AI passes instead of cutting it down to one pass.
const LIMITS = {
  normal: { files: 12, fileChars: 6000, totalChars: 40000 },
  deep: { files: 40, fileChars: 20000, totalChars: 120000 },
};
const MAX_FILE_BYTES = 100 * 1024;
const MAX_TREE_LINES = 300;
const REQUEST_TIMEOUT_MS = 15000;

const SKIP_PATH = /(^|\/)(node_modules|\.git|dist|build|target|out|\.next|vendor|__pycache__|\.idea|\.vscode|test-output|allure-results|allure-report|playwright-report|coverage|\.gradle|bin|obj)\//i;
const SKIP_FILE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock|Gemfile\.lock|poetry\.lock|\.DS_Store)$/i;
const TEXT_EXT = /\.(js|jsx|ts|tsx|java|py|cs|go|kt|rb|php|feature|robot|gradle|xml|yml|yaml|md|json|properties|sql|sh|ini|toml)$/i;
const CONFIG_FILE = /(^|\/)(package\.json|pom\.xml|build\.gradle|requirements\.txt|pyproject\.toml|testng\.xml|pytest\.ini|Jenkinsfile|playwright\.config\.\w+|cypress\.config\.\w+|wdio\.conf\.\w+|jest\.config\.\w+|\.github\/workflows\/[^/]+)$/i;


/**
 * @param {string} rawUrl
 * @returns {{owner: string, repo: string, ref: string|null, subPath: string}}
 * @throws {SubmissionFetchError} 422 when the URL is not a github.com repository link.
 */
function parseGithubRepoUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl).trim());
  } catch {
    throw new SubmissionFetchError(422, "The submission is not a valid URL.");
  }
  if (!["github.com", "www.github.com"].includes(url.hostname.toLowerCase())) {
    throw new SubmissionFetchError(422, "Only GitHub repository URLs can be evaluated right now.");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new SubmissionFetchError(422, "The URL must point to a GitHub repository, not a profile page.");
  }
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  const isTreeLink = ["tree", "blob"].includes(parts[2]) && parts[3];
  return {
    owner,
    repo,
    ref: isTreeLink ? decodeURIComponent(parts[3]) : null,
    subPath: isTreeLink ? parts.slice(4).map(decodeURIComponent).join("/") : "",
  };
}

async function githubApi(path) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "roadtocareer-assignment-evaluator",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  let res;
  try {
    res = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new SubmissionFetchError(502, "Could not reach GitHub. Please try again.");
  }
  if (res.status === 404) {
    throw new SubmissionFetchError(422, "Repository (or branch) not found, or it is private. The repository must be public.");
  }
  if (res.status === 403 || res.status === 429) {
    throw new SubmissionFetchError(429, "GitHub rate limit reached. Try again later or set GITHUB_TOKEN on the server.");
  }
  if (!res.ok) throw new SubmissionFetchError(502, `GitHub returned an unexpected error (${res.status}).`);
  return res.json();
}

function filePriority(path, depth) {
  const base = path.split("/").pop();
  if (/^readme/i.test(base) && depth === 0) return 100;
  if (CONFIG_FILE.test(path)) return 80;
  if (/\.json$/i.test(path)) return 5;
  if (/(test|spec|feature|page|pom|steps)/i.test(path)) return 60 - depth;
  if (/\.md$/i.test(path)) return 30;
  return 40 - depth;
}

function selectFiles(tree, subPath, maxFiles) {
  const prefix = subPath ? `${subPath.replace(/\/$/, "")}/` : "";
  return tree
    .filter((e) => e.type === "blob" && (!prefix || e.path.startsWith(prefix)))
    .filter((e) => !SKIP_PATH.test(e.path) && !SKIP_FILE.test(e.path))
    .filter((e) => TEXT_EXT.test(e.path) && (e.size ?? 0) <= MAX_FILE_BYTES && (e.size ?? 0) > 0)
    .map((e) => ({ path: e.path, score: filePriority(e.path, e.path.split("/").length - 1) }))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, maxFiles);
}

async function fetchRawFile(owner, repo, ref, path, maxChars) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${encodedPath}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`raw fetch ${res.status}`);
  const text = await res.text();
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n[...truncated]` : text;
}

/**
 * @param {string} rawUrl a github.com repository URL
 * @param {{deep?: boolean}} [options] deep = larger caps (see LIMITS)
 * @returns {Promise<{repoName: string, ref: string, text: string, filesIncluded: number, totalFiles: number}>}
 * @throws {SubmissionFetchError}
 */
async function buildRepoSnapshot(rawUrl, { deep = false } = {}) {
  const limits = deep ? LIMITS.deep : LIMITS.normal;
  const { owner, repo, ref: urlRef, subPath } = parseGithubRepoUrl(rawUrl);

  const meta = await githubApi(`/repos/${owner}/${repo}`);
  const ref = urlRef || meta.default_branch;
  const treeRes = await githubApi(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
  const tree = treeRes.tree || [];
  if (!tree.length) throw new SubmissionFetchError(422, "The repository is empty.");

  const picked = selectFiles(tree, subPath, limits.files);
  const bodies = await Promise.allSettled(picked.map((f) => fetchRawFile(owner, repo, ref, f.path, limits.fileChars)));

  // Lock files stay in the listing (names only, bodies are never fetched) so the
  // reviewer can see they exist. Build/dependency folders are summarised instead
  // of listed: committing them is itself something a reviewer should notice.
  const blobs = tree.filter((e) => e.type === "blob");
  const treeLines = blobs.filter((e) => !SKIP_PATH.test(e.path)).map((e) => e.path).slice(0, MAX_TREE_LINES);
  const omittedFolders = {};
  blobs.forEach((e) => {
    const m = e.path.match(SKIP_PATH);
    if (m) omittedFolders[m[2]] = (omittedFolders[m[2]] || 0) + 1;
  });

  let text = `REPOSITORY: ${owner}/${repo} (branch: ${ref})\n`;
  if (meta.description) text += `REPO DESCRIPTION: ${meta.description}\n`;
  if (meta.pushed_at) text += `LAST PUSH: ${meta.pushed_at}\n`;
  text += `\nFILE TREE (${treeLines.length}${blobs.length > treeLines.length ? "+" : ""} files):\n${treeLines.join("\n")}\n`;
  const omitted = Object.entries(omittedFolders);
  if (omitted.length) {
    text += `\nFOLDERS COMMITTED TO THE REPO BUT OMITTED FROM THIS SNAPSHOT: ${omitted.map(([dir, n]) => `${dir}/ (${n} files)`).join(", ")}\n`;
  }

  let filesIncluded = 0;
  picked.forEach((file, i) => {
    if (bodies[i].status !== "fulfilled") return;
    const block = `\n===== FILE: ${file.path} =====\n${bodies[i].value}\n`;
    if (text.length + block.length > limits.totalChars) return;
    text += block;
    filesIncluded += 1;
  });

  return { repoName: `${owner}/${repo}`, ref, text, filesIncluded, totalFiles: tree.filter((e) => e.type === "blob").length };
}

module.exports = { buildRepoSnapshot, parseGithubRepoUrl };
