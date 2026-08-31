/**
 * Blogs & Events endpoints.
 */

const { jsonRes, errRes, UNAUTHORIZED, FORBIDDEN_ADMIN, SERVER_ERROR } = require("../helpers");

// Used only by this module.
const EX_BLOG = {
  id: 19,
  title: "How to Prepare for Your First QA Interview",
  slug: "how-to-prepare-for-your-first-qa-interview-1756540800000",
  excerpt: "A practical checklist covering theory, tools and the STAR method.",
  content: "<h2>Start with the basics</h2><p>Know the SDLC and STLC cold...</p>",
  coverImage: "/images/blogs/qa-interview-prep.png",
  author: "Salman Rahman",
  status: "published",
  publishedAt: "2026-08-22T09:00:00.000Z",
  sortOrder: 1,
  createdAt: "2026-08-22T08:55:00.000Z",
  updatedAt: "2026-08-22T09:00:00.000Z",
};

const EX_EVENT_FORM = {
  id: 6,
  title: "Free Webinar: Breaking into QA in 2026",
  short_description: "A 90-minute live session with Q&A.",
  event_date: "2026-09-19T14:00:00.000Z",
  fields_json: [
    { name: "full_name", label: "Full Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    {
      name: "experience",
      label: "Experience Level",
      type: "select",
      required: false,
      options: ["Fresher", "1-2 years", "3+ years"],
    },
  ],
  created_by: 1,
  google_calendar_event_link: "https://calendar.google.com/event?eid=abc123",
  createdAt: "2026-08-28T05:00:00.000Z",
  updatedAt: "2026-08-28T05:00:00.000Z",
};

module.exports = {
  "/api/blogs": {
    get: {
      tags: ["Blogs & Events"],
      summary: "Get published community blog articles",
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
      ],
      responses: {
        200: jsonRes("Published blogs", {
          message: "Published blogs fetched successfully",
          total: 14,
          page: 1,
          limit: 10,
          blogs: [EX_BLOG],
        }),
        500: SERVER_ERROR,
      },
    },
    post: {
      tags: ["Blogs & Events"],
      summary: "Create blog article (Admin)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title", "excerpt", "content"],
              properties: {
                title: { type: "string", example: "How to Prepare for Your First QA Interview" },
                excerpt: { type: "string", example: "A practical checklist covering theory and tools." },
                content: { type: "string", example: "<h2>Start with the basics</h2><p>...</p>" },
                coverImage: { type: "string", example: "/images/blogs/qa-interview-prep.png" },
                author: { type: "string", example: "Salman Rahman" },
                status: { type: "string", enum: ["draft", "published"], example: "published" },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Blog created", { message: "Blog created successfully", data: EX_BLOG }),
        400: errRes("Validation error", "title, excerpt, and content are required"),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: SERVER_ERROR,
      },
    },
  },
  "/api/blogs/admin": {
    get: {
      tags: ["Blogs & Events"],
      summary: "Get every blog including drafts (Admin)",
      security: [{ BearerAuth: [] }],
      responses: {
        200: jsonRes("All blogs, ordered by sortOrder", {
          message: "All blogs fetched successfully",
          data: [EX_BLOG, { ...EX_BLOG, id: 20, status: "draft", publishedAt: null, sortOrder: 2 }],
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: SERVER_ERROR,
      },
    },
  },
  "/api/blogs/{slug}": {
    get: {
      tags: ["Blogs & Events"],
      summary: "Get a single published blog by slug",
      parameters: [
        {
          name: "slug",
          in: "path",
          required: true,
          schema: { type: "string", example: "how-to-prepare-for-your-first-qa-interview-1756540800000" },
        },
      ],
      responses: {
        200: jsonRes("Blog article", { message: "Blog fetched successfully", data: EX_BLOG }),
        404: errRes("Blog not found or not published", "Blog not found"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/blogs/reorder": {
    put: {
      tags: ["Blogs & Events"],
      summary: "Persist the drag-and-drop blog order (Admin)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["orders"],
              properties: {
                orders: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer", example: 19 },
                      sortOrder: { type: "integer", example: 1 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Order saved", { message: "Blog order updated successfully" }),
        400: errRes("Validation error", "orders array is required"),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: SERVER_ERROR,
      },
    },
  },
  "/api/events/list": {
    get: {
      tags: ["Blogs & Events"],
      summary: "Get event/attendance records (Admin view behind the public /events prefix)",
      security: [{ BearerAuth: [] }],
      responses: {
        200: jsonRes("Events list", {
          count: 1,
          events: [
            {
              id: 3,
              event_title: "Batch-07 Orientation",
              event_description: {
                venue: "Online (Google Meet)",
                agenda: ["Course roadmap", "Tooling setup", "Q&A"],
              },
              createdAt: "2026-08-30T05:00:00.000Z",
              updatedAt: "2026-08-30T05:00:00.000Z",
            },
          ],
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: errRes("Unexpected server error", "Error fetching events"),
      },
    },
  },
  "/api/admin/event-forms": {
    get: {
      tags: ["Blogs & Events"],
      summary: "List custom event registration forms (Admin)",
      security: [{ BearerAuth: [] }],
      responses: {
        200: jsonRes("Form definitions with submission counts", {
          forms: [{ ...EX_EVENT_FORM, audienceCount: 132 }],
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
    post: {
      tags: ["Blogs & Events"],
      summary: "Create a custom event registration form (Admin)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title", "short_description", "fields"],
              properties: {
                title: { type: "string", example: "Free Webinar: Breaking into QA in 2026" },
                short_description: { type: "string", example: "A 90-minute live session with Q&A." },
                event_date: { type: "string", format: "date-time", example: "2026-09-19T14:00:00.000Z" },
                fields: {
                  type: "array",
                  items: { type: "object" },
                  example: [
                    { name: "full_name", label: "Full Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                  ],
                },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Form created", {
          message: "Event form created successfully.",
          form: EX_EVENT_FORM,
        }),
        400: errRes("Validation error", "At least one dynamic field is required."),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
  },
  "/api/event-forms/{id}": {
    get: {
      tags: ["Blogs & Events"],
      summary: "Get a public event registration form definition",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 6 } }],
      responses: {
        200: jsonRes("Form definition", { form: EX_EVENT_FORM }),
        404: errRes("Form not found", "Event form not found."),
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
  },
  "/api/event-forms/{id}/submit": {
    post: {
      tags: ["Blogs & Events"],
      summary: "Submit a public event registration",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 6 } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              description: "Keys must match the form's `fields_json` field names",
              example: {
                full_name: "Jane Doe",
                email: "jane.doe@example.com",
                experience: "1-2 years",
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Registration recorded", {
          message: "Registration submitted successfully.",
          audience: {
            id: 4021,
            form_id: 6,
            response_json: {
              full_name: "Jane Doe",
              email: "jane.doe@example.com",
              experience: "1-2 years",
            },
            createdAt: "2026-09-01T07:30:00.000Z",
          },
        }),
        400: errRes("Validation error", "Email is required."),
        404: errRes("Form not found", "Event form not found."),
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
  },
  "/api/admin/event-forms/{id}/audience": {
    get: {
      tags: ["Blogs & Events"],
      summary: "List registrations for one event form (Admin)",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 6 } }],
      responses: {
        200: jsonRes("Registrations", {
          total: 132,
          audience: [
            {
              id: 4021,
              form_id: 6,
              response_json: {
                full_name: "Jane Doe",
                email: "jane.doe@example.com",
                experience: "1-2 years",
              },
              createdAt: "2026-09-01T07:30:00.000Z",
            },
          ],
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Form not found", "Event form not found."),
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
  },
};
