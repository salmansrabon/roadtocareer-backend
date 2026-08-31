/**
 * Shared response builders for the OpenAPI spec.
 *
 * Swagger UI only renders an "Example Value" when a response carries a media
 * type object, so responses are built through these helpers rather than the
 * bare `{ description }` form.
 */

// ── Response helpers ────────────────────────────────────────────────────────
// Swagger UI only renders an "Example Value" when a response carries a media
// type object, so responses are built through these helpers rather than the
// bare `{ description }` form.
const jsonRes = (description, example) => ({
  description,
  content: {
    "application/json": {
      schema: Array.isArray(example)
        ? { type: "array", items: { type: "object" } }
        : { type: "object" },
      example,
    },
  },
});

// Most error paths in this API return a plain `{ message }`.
const errRes = (description, message) => jsonRes(description, { message });

// Controllers that use the `{ success: false }` envelope.
const errResSuccess = (description, message) =>
  jsonRes(description, { success: false, message });

const UNAUTHORIZED = errRes("Missing or invalid JWT", "Unauthorized: No token provided");
const FORBIDDEN_ADMIN = errRes("Admin/teacher role required", "Access denied. Admins only.");
const SERVER_ERROR = errRes("Unexpected server error", "Internal server error");

module.exports = {
  jsonRes,
  errRes,
  errResSuccess,
  UNAUTHORIZED,
  FORBIDDEN_ADMIN,
  SERVER_ERROR,
};
