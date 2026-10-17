// Flattens rich-text (Quill) HTML to a single line of plain text for LLM prompts.
const stripHtml = (str) =>
  str
    ? str
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim()
    : "";

module.exports = { stripHtml };
