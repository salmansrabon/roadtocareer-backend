/**
 * Courses endpoints.
 */

const {
  jsonRes,
  errRes,
  UNAUTHORIZED,
  FORBIDDEN_ADMIN,
  SERVER_ERROR,
} = require("../helpers");
const { EX_COURSE, EX_PACKAGE } = require("../examples");

module.exports = {
  "/api/courses/list": {
    get: {
      tags: ["Courses"],
      summary: "Get list of all courses",
      parameters: [
        {
          name: "is_enabled",
          in: "query",
          schema: { type: "string", enum: ["true"] },
          description: "Pass `true` to return only enabled courses",
        },
      ],
      responses: {
        200: jsonRes("Courses array", { count: 2, courses: [EX_COURSE] }),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/courses/{courseId}": {
    get: {
      tags: ["Courses"],
      summary: "Get course details by ID (includes packages)",
      parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "integer", example: 7 } }],
      responses: {
        200: jsonRes("Course details", {
          success: true,
          course: { ...EX_COURSE, Packages: [EX_PACKAGE] },
        }),
        404: errRes("Course not found", "Course not found"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/courses/create": {
    post: {
      tags: ["Courses"],
      summary: "Create new course (Admin only)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/CourseCreateRequest" } } },
      },
      responses: {
        201: jsonRes("Course created", { message: "Course created successfully", course: EX_COURSE }),
        400: errRes("Validation error / duplicate courseId", "Course ID already exists."),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: SERVER_ERROR,
      },
    },
  },
  "/api/courses/update/{courseId}": {
    put: {
      tags: ["Courses"],
      summary: "Update course",
      parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "integer", example: 7 } }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/CourseCreateRequest" } } },
      },
      responses: {
        200: jsonRes("Course updated", { message: "Course updated successfully!", course: EX_COURSE }),
        404: errRes("Course not found", "Course not found."),
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
  },
  "/api/courses/delete/{courseId}": {
    delete: {
      tags: ["Courses"],
      summary: "Delete course",
      parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "integer", example: 7 } }],
      responses: {
        200: jsonRes("Course deleted", { message: "Course deleted successfully!" }),
        404: errRes("Course not found", "Course not found."),
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
  },
};
