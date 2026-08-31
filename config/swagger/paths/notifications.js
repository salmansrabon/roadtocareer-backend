/**
 * Notifications endpoints.
 */

const { jsonRes, errRes, UNAUTHORIZED, SERVER_ERROR } = require("../helpers");

// Used only by this module.
const EX_NOTIFICATION = {
  id: "1043",
  type: "ASSIGNMENT_REVIEWED",
  title: "Assignment reviewed",
  body: 'Your submission for "Build a Page Object Model login test" has been graded.',
  link: "/assignment/submit/41",
  actorName: "Salman Rahman",
  entityType: "ASSIGNMENT_ANSWER",
  entityId: 903,
  metadata: { assignmentId: 41, score: 18 },
  isRead: false,
  createdAt: "2026-09-16T08:20:05.000Z",
};

module.exports = {
  "/api/notifications": {
    get: {
      tags: ["Notifications"],
      summary: "Get the caller's own notification history (cursor paginated)",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        {
          name: "before",
          in: "query",
          schema: { type: "string", example: "1043" },
          description: "Cursor — pass the previous page's `nextCursor`",
        },
        { name: "unreadOnly", in: "query", schema: { type: "boolean", example: true } },
      ],
      responses: {
        200: jsonRes("Notifications page", {
          message: "Notifications fetched successfully",
          data: {
            items: [EX_NOTIFICATION],
            nextCursor: "1022",
            unreadCount: 3,
          },
        }),
        400: errRes("Bad cursor", "Invalid 'before' cursor"),
        401: UNAUTHORIZED,
        500: SERVER_ERROR,
      },
    },
  },
  "/api/notifications/unread-count": {
    get: {
      tags: ["Notifications"],
      summary: "Get the caller's unread notification count",
      security: [{ BearerAuth: [] }],
      responses: {
        200: jsonRes("Unread count", {
          message: "Unread count fetched successfully",
          data: { count: 3 },
        }),
        401: UNAUTHORIZED,
        500: SERVER_ERROR,
      },
    },
  },
  "/api/notifications/{id}/read": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark one notification as read (idempotent)",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 1043 } }],
      responses: {
        200: jsonRes("Marked as read", {
          message: "Notification marked as read",
          data: { id: "1043", unreadCount: 2 },
        }),
        400: errRes("Non-numeric id", "Invalid notification id"),
        401: UNAUTHORIZED,
        404: errRes("Not the caller's notification, or missing", "Notification not found"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/notifications/read-all": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark every unread notification for the caller as read",
      security: [{ BearerAuth: [] }],
      responses: {
        200: jsonRes("All marked as read", {
          message: "All notifications marked as read",
          data: { updated: 3, unreadCount: 0 },
        }),
        401: UNAUTHORIZED,
        500: SERVER_ERROR,
      },
    },
  },
  "/api/notifications/stream-ticket": {
    post: {
      tags: ["Notifications"],
      summary: "Mint a short-lived ticket for the SSE stream",
      description:
        "`GET /api/notifications/stream` is an EventSource endpoint (it cannot send an Authorization header), so it authenticates with this ticket instead.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: jsonRes("Stream ticket", {
          message: "Stream ticket created",
          data: { ticket: "9f2c1d4b7a8e5f3c0b6d9a2e4f7c1b8d", expiresIn: 30 },
        }),
        401: UNAUTHORIZED,
        500: SERVER_ERROR,
      },
    },
  },
  "/api/notifications/stream": {
    get: {
      tags: ["Notifications"],
      summary: "Server-Sent Events stream of live notifications",
      description:
        "Authenticated with `?ticket=` from `/stream-ticket`. The in-memory hub is single-process only — clustering the backend breaks it.",
      parameters: [
        {
          name: "ticket",
          in: "query",
          required: true,
          schema: { type: "string", example: "9f2c1d4b7a8e5f3c0b6d9a2e4f7c1b8d" },
        },
      ],
      responses: {
        200: {
          description: "An open SSE stream. Each event is a `data:` line holding one serialized notification.",
          content: {
            "text/event-stream": {
              schema: { type: "string" },
              example:
                'event: notification\ndata: {"id":"1043","type":"ASSIGNMENT_REVIEWED","title":"Assignment reviewed","body":"Your submission for \\"Build a Page Object Model login test\\" has been graded.","link":"/assignment/submit/41","actorName":"Salman Rahman","entityType":"ASSIGNMENT_ANSWER","entityId":903,"metadata":{"assignmentId":41,"score":18},"isRead":false,"createdAt":"2026-09-16T08:20:05.000Z"}\n\n',
            },
          },
        },
        401: errRes("Missing or expired ticket", "Invalid or expired stream ticket"),
      },
    },
  },
};
