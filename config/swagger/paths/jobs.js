/**
 * Jobs endpoints.
 */

const { jsonRes, errRes } = require("../helpers");

// Used only by this module.
const EX_JOB = {
  id: 88,
  companyName: "Cefalo Bangladesh",
  positionName: "Software Engineer in Test",
  workType: "Hybrid",
  experience: "2-4 years",
  salary: "Negotiable",
  level: "Mid",
  companyLocation: "Dhaka, Bangladesh",
  description: "<p>Own the automation suite for our Norwegian client products.</p>",
  application_url: "https://careers.example.com/jobs/sdet-88",
  deadline: "2026-09-30",
  views: 342,
  createdAt: "2026-08-15T04:00:00.000Z",
  updatedAt: "2026-08-28T04:00:00.000Z",
};

module.exports = {
  "/api/jobs": {
    get: {
      tags: ["Jobs"],
      summary: "Get job postings (also used to fetch one job via ?jobId=)",
      parameters: [
        {
          name: "jobId",
          in: "query",
          schema: { type: "integer", example: 88 },
          description: "When supplied, every other filter is ignored and a single job is returned",
        },
        { name: "companyName", in: "query", schema: { type: "string" } },
        { name: "positionName", in: "query", schema: { type: "string" } },
        { name: "workType", in: "query", schema: { type: "string", enum: ["Remote", "Hybrid", "Onsite"] } },
        { name: "level", in: "query", schema: { type: "string", enum: ["Entry", "Mid", "Senior", "Lead"] } },
        { name: "latest", in: "query", schema: { type: "boolean" }, description: "Only jobs whose deadline has not passed" },
        { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
      ],
      responses: {
        200: jsonRes("Job postings (page size is fixed at 20)", {
          total: 34,
          count: 20,
          latestCount: 11,
          jobs: [EX_JOB],
        }),
        500: jsonRes("Unexpected server error", {
          message: "Failed to fetch jobs.",
          error: "Unknown column 'foo' in 'where clause'",
        }),
      },
    },
  },
  "/api/jobs/create": {
    post: {
      tags: ["Jobs"],
      summary: "Create job posting (Admin)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: [
                "companyName",
                "positionName",
                "workType",
                "experience",
                "salary",
                "level",
                "companyLocation",
                "application_url",
                "deadline",
              ],
              properties: {
                companyName: { type: "string", example: "Cefalo Bangladesh" },
                positionName: { type: "string", example: "Software Engineer in Test" },
                workType: { type: "string", enum: ["Remote", "Hybrid", "Onsite"], example: "Hybrid" },
                experience: { type: "string", example: "2-4 years" },
                salary: { type: "string", example: "Negotiable" },
                level: { type: "string", enum: ["Entry", "Mid", "Senior", "Lead"], example: "Mid" },
                companyLocation: { type: "string", example: "Dhaka, Bangladesh" },
                description: { type: "string", example: "<p>Own the automation suite.</p>" },
                application_url: { type: "string", example: "https://careers.example.com/jobs/sdet-88" },
                deadline: { type: "string", format: "date", example: "2026-09-30" },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Job posted", { message: "Job posted successfully!", job: EX_JOB }),
        400: errRes("Validation error", "Invalid workType value."),
        500: jsonRes("Unexpected server error", {
          message: "Failed to post job.",
          error: "Validation error: deadline cannot be null",
        }),
      },
    },
  },
  "/api/jobs/update/{id}": {
    put: {
      tags: ["Jobs"],
      summary: "Update job posting (Admin)",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 88 } }],
      responses: {
        200: jsonRes("Job updated", { message: "Job updated successfully!", job: EX_JOB }),
        404: errRes("Job not found", "Job not found."),
        500: jsonRes("Unexpected server error", {
          message: "Failed to update job.",
          error: "Unknown column 'foo' in 'field list'",
        }),
      },
    },
  },
  "/api/jobs/delete/{id}": {
    delete: {
      tags: ["Jobs"],
      summary: "Delete job posting (Admin)",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 88 } }],
      responses: {
        200: jsonRes("Job deleted", { message: "Job deleted successfully!" }),
        404: errRes("Job not found", "Job not found."),
        500: jsonRes("Unexpected server error", {
          message: "Failed to delete job.",
          error: "Cannot delete or update a parent row",
        }),
      },
    },
  },
  "/api/jobs/{id}/view": {
    post: {
      tags: ["Jobs"],
      summary: "Increment the view counter for a job",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 88 } }],
      responses: {
        200: jsonRes("View recorded", { message: "View recorded", views: 343 }),
        404: errRes("Job not found", "Job not found."),
        500: errRes("Unexpected server error", "Failed to record view."),
      },
    },
  },
};
