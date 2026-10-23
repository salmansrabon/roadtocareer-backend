/**
 * Packages endpoints.
 */

const { jsonRes, errRes, errResSuccess } = require("../helpers");
const { EX_PACKAGE } = require("../examples");

module.exports = {
  "/api/packages/list": {
    get: {
      tags: ["Packages"],
      summary: "Get all package offerings",
      responses: {
        200: jsonRes("Packages list", {
          success: true,
          packages: [
            { ...EX_PACKAGE, Course: { courseId: 7, course_title: "SDET Automation Masterclass" } },
          ],
        }),
        500: errResSuccess("Unexpected server error", "Failed to load packages"),
      },
    },
  },
  "/api/packages/create": {
    post: {
      tags: ["Packages"],
      summary: "Create a package for a course",
      description:
        "A course can have many packages. Names are unique per course (case-insensitive). At most one package per course can have `is_self_learning: true` (the recorded course).",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["courseId", "packageName", "discountedFee"],
              properties: {
                courseId: { type: "integer", example: 7 },
                packageName: { type: "string", example: "Premium" },
                regularFee: { type: "number", example: 30000 },
                discountedFee: { type: "number", example: 25000 },
                installment: {
                  type: "string",
                  description: "Comma-separated amounts; stored as a JSON object",
                  example: "10000,10000,5000",
                },
                is_self_learning: {
                  type: "boolean",
                  description: "Marks the recorded (Self-Learning) package. Only one per course.",
                  example: false,
                },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Package created", { message: "Package created successfully", package: EX_PACKAGE }),
        400: errRes(
          "Blank name, duplicate name, or a second Self-Learning package",
          "This course already has a package with this name."
        ),
        500: jsonRes("Unexpected server error", { message: "Internal server error", error: {} }),
      },
    },
  },
  "/api/packages/course/{courseId}": {
    get: {
      tags: ["Packages"],
      summary: "Get packages for a specific course",
      description:
        "`packages` lists every package of the course, oldest first. `package` is the first normal (non-Self-Learning) package, kept for older callers.",
      parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "integer", example: 7 } }],
      responses: {
        200: jsonRes("Packages for the course", { success: true, package: EX_PACKAGE, packages: [EX_PACKAGE] }),
        404: errResSuccess("No packages for this course", "Package not found"),
        500: errResSuccess("Unexpected server error", "Failed to load packages"),
      },
    },
  },
  "/api/packages/update/{id}": {
    put: {
      tags: ["Packages"],
      summary: "Update a package",
      description:
        "Rejected with 400 for a duplicate name, a second Self-Learning package, or a rename while students are on the package (payments find a package by name).",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 3 } }],
      responses: {
        200: jsonRes("Package updated", {
          success: true,
          message: "Package updated successfully",
          package: EX_PACKAGE,
        }),
        400: errResSuccess("Guard failed", "2 student(s) are on this package. Renaming it would break their payment records."),
        404: errResSuccess("Package not found", "Package not found"),
        500: errResSuccess("Unexpected server error", "Failed to update package"),
      },
    },
  },
  "/api/packages/delete/{id}": {
    delete: {
      tags: ["Packages"],
      summary: "Delete a package",
      description: "Rejected with 400 while students are on the package.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 3 } }],
      responses: {
        200: jsonRes("Package deleted", { success: true, message: "Package deleted successfully" }),
        400: errResSuccess("Students use this package", "2 student(s) are on this package, so it cannot be deleted."),
        404: errResSuccess("Package not found", "Package not found"),
        500: errResSuccess("Unexpected server error", "Failed to delete package"),
      },
    },
  },
};
