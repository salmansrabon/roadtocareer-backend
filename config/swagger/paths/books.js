/**
 * Books & Topics endpoints.
 */

const { jsonRes, errRes, UNAUTHORIZED, FORBIDDEN_ADMIN, SERVER_ERROR } = require("../helpers");

// Used only by this module.
const EX_BOOK = {
  id: 2,
  title: "Practical API Testing",
  slug: "practical-api-testing",
  description: "An interactive ebook on REST Assured and Postman.",
  cover_image: "/images/books/practical-api-testing.png",
  status: "published",
  sort_order: 1,
  createdAt: "2026-04-02T05:00:00.000Z",
  updatedAt: "2026-08-01T05:00:00.000Z",
};

module.exports = {
  "/api/books": {
    get: {
      tags: ["Books & Topics"],
      summary: "Get all published interactive books",
      security: [{ BearerAuth: [] }],
      responses: {
        200: jsonRes("Published books list", {
          message: "Books fetched successfully",
          data: [EX_BOOK],
        }),
        401: UNAUTHORIZED,
        500: SERVER_ERROR,
      },
    },
    post: {
      tags: ["Books & Topics"],
      summary: "Create a new book (Admin)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title"],
              properties: {
                title: { type: "string", example: "Practical API Testing" },
                description: { type: "string", example: "An interactive ebook on REST Assured and Postman." },
                cover_image: { type: "string", example: "/images/books/practical-api-testing.png" },
                status: { type: "string", enum: ["draft", "published"], example: "draft" },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Book created", {
          message: "Book created successfully",
          data: { ...EX_BOOK, status: "draft", sort_order: 0 },
        }),
        400: errRes("Validation error", "title is required"),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        409: errRes("Slug collision", "A book with this title already exists. Use a different title."),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/books/admin": {
    get: {
      tags: ["Books & Topics"],
      summary: "Get all books with chapters and stats (Admin)",
      security: [{ BearerAuth: [] }],
      responses: {
        200: jsonRes("Admin book catalog", {
          message: "Books fetched successfully",
          data: [
            {
              ...EX_BOOK,
              BookChapters: [
                {
                  id: 11,
                  book_id: 2,
                  title: "Getting Started with REST Assured",
                  sort_order: 1,
                  status: "published",
                  BookTopics: [
                    { id: 104, chapter_id: 11, title: "Setting up the project", sort_order: 1, status: "published" },
                  ],
                },
              ],
            },
          ],
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: SERVER_ERROR,
      },
    },
  },
  "/api/books/{slug}": {
    get: {
      tags: ["Books & Topics"],
      summary: "Get a book with its chapters and topics",
      description:
        "Students see every topic listed but with an `isUnlocked` flag; admins and teachers get no flag and see drafts too.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string", example: "practical-api-testing" } },
      ],
      responses: {
        200: jsonRes("Book with chapter/topic tree", {
          message: "Book fetched successfully",
          data: {
            ...EX_BOOK,
            chapters: [
              {
                id: 11,
                book_id: 2,
                title: "Getting Started with REST Assured",
                sort_order: 1,
                status: "published",
                topics: [
                  {
                    id: 104,
                    chapter_id: 11,
                    title: "Setting up the project",
                    sort_order: 1,
                    status: "published",
                    isUnlocked: true,
                  },
                  {
                    id: 105,
                    chapter_id: 11,
                    title: "Your first API assertion",
                    sort_order: 2,
                    status: "published",
                    isUnlocked: false,
                  },
                ],
              },
            ],
          },
        }),
        401: UNAUTHORIZED,
        403: errRes("Caller has no student row", "Student profile not found"),
        404: errRes("Book not found", "Book not found"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/books/topics/{id}/content": {
    get: {
      tags: ["Books & Topics"],
      summary: "Get content for a specific unlocked topic",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 104 } }],
      responses: {
        200: jsonRes("Topic rich-text content", {
          message: "Topic content fetched",
          data: {
            id: 104,
            title: "Setting up the project",
            content:
              "<h2>Add the dependency</h2><p>Add <code>io.rest-assured:rest-assured</code> to your <code>pom.xml</code>…</p>",
          },
        }),
        401: UNAUTHORIZED,
        403: errRes(
          "Topic locked for the caller's course",
          "Access denied: this topic is not unlocked for your course"
        ),
        404: errRes("Topic not found", "Topic not found"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/books/access/unlock": {
    post: {
      tags: ["Books & Topics"],
      summary: "Unlock chapters/topics for entire batches (Admin)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["topicIds", "courseIds"],
              properties: {
                topicIds: { type: "array", items: { type: "integer" }, example: [104, 105] },
                courseIds: { type: "array", items: { type: "integer" }, example: [6, 7] },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Batch access granted; notification emails queued", {
          success: true,
          message: "Student access granted successfully. Notification emails have been queued.",
          accessGranted: 58,
          emailsQueued: 56,
          topicsUpdated: 2,
        }),
        400: errRes("Validation error", "topicIds and courseIds are required non-empty arrays"),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: SERVER_ERROR,
      },
    },
  },
  "/api/books/access/unlock-students": {
    post: {
      tags: ["Books & Topics"],
      summary: "Unlock chapters/topics for individual students (Admin)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["topicIds", "studentIds"],
              properties: {
                topicIds: { type: "array", items: { type: "integer" }, example: [104, 105] },
                studentIds: {
                  type: "array",
                  items: { type: "string" },
                  example: ["RTS-JAD-2601", "RTS-RAH-2588"],
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Student access granted; notification emails queued", {
          success: true,
          message:
            "Access granted for 2 topic(s) to 2 student(s). Notification emails have been queued.",
          accessGranted: 2,
          emailsQueued: 2,
          topicsUpdated: 2,
        }),
        400: errRes("Validation error", "topicIds and studentIds are required non-empty arrays"),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: SERVER_ERROR,
      },
    },
  },
};
