/**
 * Resume & AI Evaluation endpoints.
 */

const { jsonRes, errRes, errResSuccess, UNAUTHORIZED } = require("../helpers");

module.exports = {
  "/api/resume/evaluate": {
    post: {
      tags: ["Resume & AI Evaluation"],
      summary: "Evaluate an uploaded PDF resume against a job description using AI",
      description: "Multipart upload, PDF only, 2 MB limit. The response is the raw AI verdict object.",
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["resume", "companyName", "jobTitle", "jobDescription"],
              properties: {
                resume: { type: "string", format: "binary", description: "PDF resume file (max 2 MB)" },
                companyName: { type: "string", example: "Cefalo Bangladesh" },
                jobTitle: { type: "string", example: "Software Engineer in Test" },
                jobDescription: {
                  type: "string",
                  example: "Looking for an SDET with Playwright, CI/CD and API testing experience.",
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Resume match score, verdict and per-dimension feedback", {
          candidate_name: "Jane Doe",
          score: 7.5,
          verdict: "Strong fit",
          feedback: {
            experience: "2 years of hands-on QA, slightly below the 2-4 year target but trending well.",
            technical_skills: "Playwright, Selenium and REST Assured all present; no k6 or performance work.",
            domain_experience: "E-commerce testing matches the client domain closely.",
            responsibilities: "Has owned a regression suite end to end, which maps to the role.",
            project_relevance: "The ecom-automation project is directly relevant.",
            resume_quality: "Clean one-pager, but bullet points bury the automation impact metrics.",
            overall_feedback:
              "Jane is a strong fit for Cefalo Bangladesh's SDET role. Lead with the CI/CD pipeline work and quantify the regression suite's runtime savings.",
          },
        }),
        400: errRes("Missing file or job fields", "Resume file is required."),
        500: jsonRes("PDF parse or OpenAI failure", {
          message: "Error while evaluating resume. Ensure file is a valid PDF (max 2 MB).",
          error: "Invalid PDF structure",
        }),
      },
    },
  },
  "/api/resume/evaluations": {
    get: {
      tags: ["Resume & AI Evaluation"],
      summary: "List stored resume evaluations",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
      ],
      responses: {
        200: jsonRes("Stored evaluations", {
          success: true,
          page: 1,
          limit: 10,
          total: 41,
          totalPages: 5,
          evaluations: [
            {
              id: 77,
              candidate_name: "Jane Doe",
              company_name: "Cefalo Bangladesh",
              job_title: "Software Engineer in Test",
              resume_score: 7.5,
              ai_feedback: { verdict: "Strong fit" },
              createdAt: "2026-08-31T11:02:00.000Z",
            },
          ],
        }),
        401: UNAUTHORIZED,
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
  "/api/resume/evaluations/{id}": {
    delete: {
      tags: ["Resume & AI Evaluation"],
      summary: "Delete a stored resume evaluation",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 77 } }],
      responses: {
        200: jsonRes("Evaluation deleted", {
          success: true,
          message: "Resume evaluation deleted successfully",
        }),
        400: errResSuccess("Missing id", "Evaluation ID is required"),
        401: UNAUTHORIZED,
        404: errResSuccess("Evaluation not found", "Resume evaluation not found"),
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
};
