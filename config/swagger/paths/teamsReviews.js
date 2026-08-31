/**
 * Teams & Reviews endpoints.
 */

const { jsonRes, errRes, errResSuccess, UNAUTHORIZED, FORBIDDEN_ADMIN } = require("../helpers");

// Used only by this module.
const EX_TEAM_MEMBER = {
  id: 4,
  name: "Salman Rahman",
  company: "Cefalo",
  designation: "Senior SDET",
  email: "salman@roadtocareer.net",
  whatsapp: "+8801700000001",
  linkedin: "https://linkedin.com/in/salmanrahman",
  about: "10+ years in test automation and CI/CD.",
  photo: "/images/teams/salman.jpg",
  createdAt: "2026-02-01T05:00:00.000Z",
  updatedAt: "2026-02-01T05:00:00.000Z",
};

const EX_REVIEW = {
  id: 27,
  name: "Rakib Hasan",
  image: "/images/reviews/rakib.jpg",
  batch: "Batch-05",
  rating: 5,
  description: "Got my first SDET job three weeks after the course ended.",
  designation: "SDET",
  company: "Brain Station 23",
  university: "BUET",
  facebook: "https://facebook.com/rakib",
  whatsapp: "+8801700000002",
  linkedin: "https://linkedin.com/in/rakibhasan",
  rEnable: true,
  priority: 1,
  createdAt: "2026-05-10T06:00:00.000Z",
  updatedAt: "2026-05-10T06:00:00.000Z",
};

module.exports = {
  "/api/teams/list": {
    get: {
      tags: ["Teams & Reviews"],
      summary: "Get instructor and team profiles",
      responses: {
        200: jsonRes("Team members list", {
          success: true,
          totalMembers: 1,
          members: [EX_TEAM_MEMBER],
        }),
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
  "/api/teams/add": {
    post: {
      tags: ["Teams & Reviews"],
      summary: "Add a team member (Admin)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "designation"],
              properties: {
                name: { type: "string", example: "Salman Rahman" },
                company: { type: "string", example: "Cefalo" },
                designation: { type: "string", example: "Senior SDET" },
                email: { type: "string", format: "email", example: "salman@roadtocareer.net" },
                whatsapp: { type: "string", example: "+8801700000001" },
                linkedin: { type: "string", example: "https://linkedin.com/in/salmanrahman" },
                about: { type: "string", example: "10+ years in test automation and CI/CD." },
                photo: { type: "string", example: "/images/teams/salman.jpg" },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Team member added", {
          success: true,
          message: "Team member added successfully!",
          member: EX_TEAM_MEMBER,
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
  "/api/teams/update/{id}": {
    put: {
      tags: ["Teams & Reviews"],
      summary: "Update a team member (Admin)",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 4 } }],
      responses: {
        200: jsonRes("Team member updated", {
          message: "Team member updated successfully",
          member: EX_TEAM_MEMBER,
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Not found", "Team member not found"),
        500: errRes("Unexpected server error", "Server error during update"),
      },
    },
  },
  "/api/teams/delete/{id}": {
    delete: {
      tags: ["Teams & Reviews"],
      summary: "Delete a team member (Admin)",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 4 } }],
      responses: {
        200: jsonRes("Team member deleted", { message: "Team member deleted successfully" }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Not found", "Team member not found"),
        500: errRes("Unexpected server error", "Server error during deletion"),
      },
    },
  },
  "/api/reviews/list": {
    get: {
      tags: ["Teams & Reviews"],
      summary: "Get student reviews and testimonials",
      parameters: [
        { name: "rEnable", in: "query", schema: { type: "boolean" }, description: "Filter to approved reviews" },
      ],
      responses: {
        200: jsonRes("Reviews list", { totalReviews: 1, reviews: [EX_REVIEW] }),
        500: errResSuccess("Unexpected server error", "Internal server error"),
      },
    },
  },
  "/api/reviews/create": {
    post: {
      tags: ["Teams & Reviews"],
      summary: "Submit a student review for approval",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "rating", "description"],
              properties: {
                name: { type: "string", example: "Rakib Hasan" },
                image: { type: "string", example: "/images/reviews/rakib.jpg" },
                batch: { type: "string", example: "Batch-05" },
                rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
                description: {
                  type: "string",
                  example: "Got my first SDET job three weeks after the course ended.",
                },
                designation: { type: "string", example: "SDET" },
                company: { type: "string", example: "Brain Station 23" },
                university: { type: "string", example: "BUET" },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Review submitted for moderation", {
          success: true,
          message: "Review added successfully!",
          review: { ...EX_REVIEW, rEnable: false, priority: null },
        }),
        500: errResSuccess("Unexpected server error", "Internal server error"),
      },
    },
  },
  "/api/reviews/update/{id}": {
    put: {
      tags: ["Teams & Reviews"],
      summary: "Update or approve a review (Admin)",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 27 } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                rEnable: { type: "boolean", example: true },
                priority: { type: "integer", example: 1 },
                description: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Review updated", {
          success: true,
          message: "Review updated successfully",
          review: EX_REVIEW,
        }),
        404: errResSuccess("Review not found", "Review not found"),
        500: errResSuccess("Unexpected server error", "Internal server error"),
      },
    },
  },
  "/api/reviews/delete/{id}": {
    delete: {
      tags: ["Teams & Reviews"],
      summary: "Delete a review (Admin)",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 27 } }],
      responses: {
        200: jsonRes("Review deleted", { success: true, message: "Review deleted successfully" }),
        404: errResSuccess("Review not found", "Review not found"),
        500: errResSuccess("Unexpected server error", "Internal server error"),
      },
    },
  },
};
