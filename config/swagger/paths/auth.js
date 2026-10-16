/**
 * Auth endpoints.
 */

const { jsonRes, errRes, SERVER_ERROR } = require("../helpers");

module.exports = {
  "/api/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Register new user account",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } },
      },
      responses: {
        201: jsonRes("User registered successfully", {
          message: "User registered successfully",
          user: {
            id: 214,
            username: "john_doe",
            email: "john@example.com",
            role: "student",
            createdAt: "2026-09-01T06:30:00.000Z",
          },
        }),
        400: errRes("Validation error / user already exists", "User already exists"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "User login to obtain JWT token (12h expiry)",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
      },
      responses: {
        200: jsonRes("Login successful with JWT token and user info", {
          token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjE0LCJ1c2VybmFtZSI6IlJUUy1KQUQtMjYwMSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzg3MjIwMDAwLCJleHAiOjE3ODcyNjMyMDB9.dummy-signature",
          user: {
            id: 214,
            username: "RTS-JAD-2601",
            email: "jane.doe@example.com",
            role: "student",
          },
        }),
        401: errRes("Invalid credentials", "Invalid credentials"),
        403: errRes("Account disabled", "Sorry, your account is disabled."),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/auth/linked-accounts": {
    get: {
      tags: ["Auth"],
      summary: "List other active student accounts registered with the caller's email (account switcher)",
      description:
        "Matched on users.email (case-insensitive, trimmed). Returns an empty list for admin/teacher callers and for students with a single account. Accounts with isValid = 0 are excluded.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: jsonRes("Linked accounts", {
          accounts: [
            { username: "RTS-JAD-2602", courseTitle: "Full Stack SDET", batch_no: 19, courseId: "sdet192026" },
          ],
        }),
        401: errRes("Invalid token", "Invalid token"),
        403: errRes("Missing token", "Unauthorized"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/auth/switch-account": {
    post: {
      tags: ["Auth"],
      summary: "Switch the session to another account registered with the same email (no password)",
      description:
        "The target must be in the caller's linked-accounts list (same email, role student, isValid = 1, not the caller). Returns a new JWT for the target account that keeps the CURRENT token's expiry (a switch never extends the session) and replaces the httpOnly auth cookie.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["username"],
              properties: {
                username: {
                  type: "string",
                  description: "StudentId of the account to switch to",
                  example: "RTS-JAD-2602",
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Switched; same shape as login", {
          token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjE1LCJ1c2VybmFtZSI6IlJUUy1KQUQtMjYwMiIsInJvbGUiOiJzdHVkZW50In0.dummy-signature",
          user: { id: 215, username: "RTS-JAD-2602", email: "jane.doe@example.com", role: "student" },
        }),
        401: errRes("Invalid token", "Invalid token"),
        403: errRes(
          "Not a linked account (different email, unknown, self, disabled, non-student, or caller is not a student). The message is identical in every case so account names cannot be probed.",
          "Cannot switch to this account"
        ),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/auth/request-password-reset": {
    post: {
      tags: ["Auth"],
      summary: "Request password reset link via email",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["studentId"],
              properties: {
                studentId: {
                  type: "string",
                  description: "The account username (Student ID)",
                  example: "RTS-JAD-2601",
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Reset link emailed", { message: "Password reset link sent to email." }),
        404: errRes("No account for that Student ID", "User not found"),
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
  },
  "/api/auth/reset-password": {
    post: {
      tags: ["Auth"],
      summary: "Reset password using reset token (valid 15 minutes)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["token", "newPassword"],
              properties: {
                token: { type: "string", example: "9f2c1d4b7a8e5f3c0b6d9a2e4f7c1b8d" },
                newPassword: { type: "string", format: "password", example: "NewSecurePass123" },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Password successfully reset", { message: "Password reset successful!" }),
        400: errRes("Token invalid or expired", "Invalid or expired token"),
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
  },
  "/api/auth/change-password/{username}": {
    post: {
      tags: ["Auth"],
      summary: "Change password for authenticated user",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "username",
          in: "path",
          required: true,
          schema: { type: "string", example: "RTS-JAD-2601" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["currentPassword", "newPassword"],
              properties: {
                currentPassword: { type: "string", format: "password", example: "123456" },
                newPassword: { type: "string", format: "password", example: "NewSecurePass123" },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Password updated", { message: "Password changed successfully" }),
        401: errRes("Current password is wrong / no token", "Current password is incorrect"),
        404: errRes("User not found", "User not found"),
        500: SERVER_ERROR,
      },
    },
  },
};
