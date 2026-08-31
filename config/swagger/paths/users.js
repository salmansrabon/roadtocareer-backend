/**
 * Users endpoints.
 */

const { jsonRes, errRes, SERVER_ERROR } = require("../helpers");
const { EX_USER } = require("../examples");

module.exports = {
  "/api/users/list": {
    get: {
      tags: ["Users"],
      summary: "Get all user accounts",
      responses: {
        200: jsonRes("List of users", {
          total: 2,
          users: [
            EX_USER,
            {
              id: 1,
              username: "admin",
              email: "admin@roadtocareer.net",
              role: "admin",
              isValid: 1,
              createdAt: "2025-11-02T04:00:00.000Z",
              updatedAt: "2026-07-14T04:00:00.000Z",
            },
          ],
        }),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/users/{studentId}": {
    patch: {
      tags: ["Users"],
      summary: "Enable / disable a user account (also grants or revokes Drive access)",
      parameters: [
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["isValid"],
              properties: {
                isValid: {
                  type: "integer",
                  enum: [0, 1],
                  description: "1 = active, 0 = disabled",
                  example: 1,
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("User status updated", {
          message: "User status updated successfully",
          isValid: 1,
        }),
        400: errRes("Bad isValid value", "Invalid isValid value. Must be 0 or 1."),
        404: errRes("User or student row missing", "User not found"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/users/update/{id}": {
    put: {
      tags: ["Users"],
      summary: "Update user account by numeric ID",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 214 } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["username", "email", "role", "isValid"],
              properties: {
                username: { type: "string", example: "RTS-JAD-2601" },
                email: { type: "string", format: "email", example: "jane.doe@example.com" },
                password: { type: "string", format: "password", description: "Optional — only sent when changing it" },
                role: { type: "string", enum: ["admin", "teacher", "student"], example: "student" },
                isValid: { type: "integer", enum: [0, 1], example: 1 },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("User updated", { message: "User updated successfully.", user: EX_USER }),
        400: errRes("Missing fields", "username, email, role, and isValid are required."),
        404: errRes("User not found", "User not found."),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/users/delete/{id}": {
    delete: {
      tags: ["Users"],
      summary: "Delete user account by numeric ID",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 214 } }],
      responses: {
        200: jsonRes("User deleted", { message: "User deleted successfully." }),
        404: errRes("User not found", "User not found."),
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
  },
};
