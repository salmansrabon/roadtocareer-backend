/**
 * Modules endpoints.
 */

const { jsonRes, errRes, errResSuccess, SERVER_ERROR } = require("../helpers");

// Used only by this module.
const EX_MODULE = {
  id: 9,
  courseId: 7,
  packageId: 3,
  module: [
    { module_no: 1, title: "Core Java for Testers", topics: ["OOP", "Collections"] },
    { module_no: 2, title: "Selenium WebDriver", topics: ["Locators", "Waits"] },
  ],
  createdAt: "2026-06-21T09:00:00.000Z",
  updatedAt: "2026-06-21T09:00:00.000Z",
};

module.exports = {
  "/api/modules/list": {
    get: {
      tags: ["Modules"],
      summary: "Get all modules (with course and package info)",
      responses: {
        200: jsonRes("Modules list", {
          success: true,
          modules: [
            {
              ...EX_MODULE,
              Course: { courseId: 7, course_title: "SDET Automation Masterclass", batch_no: "Batch-07" },
              Package: { id: 3, packageName: "Premium" },
            },
          ],
        }),
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
  "/api/modules/add": {
    post: {
      tags: ["Modules"],
      summary: "Create a new course module",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["courseId", "packageId", "module"],
              properties: {
                courseId: { type: "integer", example: 7 },
                packageId: { type: "integer", example: 3 },
                module: {
                  description: "Array of module objects, or the same array as a JSON string",
                  example: [
                    { module_no: 1, title: "Core Java for Testers", topics: ["OOP", "Collections"] },
                  ],
                },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Module created", { message: "Module added successfully!", data: EX_MODULE }),
        400: errRes("Missing fields or unparsable module JSON", "Invalid module format!"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/modules/{courseId}": {
    get: {
      tags: ["Modules"],
      summary: "Get modules for a course",
      parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "integer", example: 7 } }],
      responses: {
        200: jsonRes("Modules for the course", { success: true, modules: [EX_MODULE] }),
        404: errResSuccess("No modules for this course", "No modules found for this course."),
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
  "/api/modules/update/{courseId}": {
    put: {
      tags: ["Modules"],
      summary: "Update the module list for a course",
      parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "integer", example: 7 } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["module"],
              properties: {
                module: {
                  example: [
                    { module_no: 1, title: "Core Java for Testers", topics: ["OOP", "Collections"] },
                  ],
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Module updated", { message: "Module updated successfully!", data: EX_MODULE }),
        400: errRes("Unparsable module JSON", "Invalid module format!"),
        404: errRes("No module row for this course", "Module not found for the given Course ID."),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/modules/delete/{courseId}": {
    delete: {
      tags: ["Modules"],
      summary: "Delete the module row for a course",
      parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "integer", example: 7 } }],
      responses: {
        200: jsonRes("Module deleted", { message: "Module deleted successfully!" }),
        404: errRes("No module row for this course", "Module not found for the given Course ID."),
        500: SERVER_ERROR,
      },
    },
  },
};
