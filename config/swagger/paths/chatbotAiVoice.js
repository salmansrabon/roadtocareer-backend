/**
 * Chatbot & AI Voice endpoints.
 */

const { jsonRes, errRes } = require("../helpers");

module.exports = {
  "/api/chatbot/chat": {
    post: {
      tags: ["Chatbot & AI Voice"],
      summary: "Send a query to the 24/7 student support AI chatbot",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/ChatbotRequest" } } },
      },
      responses: {
        200: jsonRes("AI answer", {
          message:
            "Batch-08 of the SDET Automation Masterclass opens for enrolment on 1 October 2026, with classes starting 12 October. You can register from the Courses page.",
        }),
        400: errRes("No question supplied", "Please provide a question."),
        500: errRes(
          "Upstream model failure",
          "Sorry, I'm facing technical issues. Please try again later."
        ),
      },
    },
  },
  "/api/ai-voice/realtime-session": {
    post: {
      tags: ["Chatbot & AI Voice"],
      summary: "Create an OpenAI realtime session for an AI mock interview",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["role"],
              properties: {
                role: { type: "string", example: "SDET" },
                experience: { type: "number", example: 2 },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Ephemeral realtime session plus the generated interview plan", {
          success: true,
          session: {
            id: "sess_9f2c1d4b7a8e",
            model: "gpt-4o-realtime-preview",
            expires_at: 1787220600,
            client_secret: { value: "ek_dummy_client_secret", expires_at: 1787220600 },
          },
          meta: {
            role: "SDET",
            level: "Mid",
            years: 2,
            baseCount: 8,
            minCore: 5,
            maxCore: 7,
            selectedTopics: ["Selenium waits", "API testing", "CI/CD", "Test design"],
          },
        }),
        500: jsonRes("Session creation failed", {
          success: false,
          error: "Failed to create realtime session",
        }),
      },
    },
  },
  "/api/ai-voice/save-result": {
    post: {
      tags: ["Chatbot & AI Voice"],
      summary: "Save an AI voice interview result against a student",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["studentId", "score", "role", "level"],
              properties: {
                studentId: { type: "string", example: "RTS-JAD-2601" },
                score: { type: "integer", example: 72 },
                role: { type: "string", example: "SDET" },
                level: { type: "string", example: "Mid" },
                feedback: { type: "string", example: "Strong on locators, thin on CI/CD." },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Interview result stored", {
          success: true,
          message: "Interview result saved successfully",
          result: {
            score: 72,
            role: "SDET",
            level: "Mid",
            feedback: "Strong on locators, thin on CI/CD.",
            attemptedAt: "2026-08-31T16:45:00.000Z",
          },
        }),
        400: jsonRes("Validation error", {
          success: false,
          error: "Missing required fields: studentId, score, role, level",
        }),
        404: jsonRes("Student not found", { success: false, error: "Student not found" }),
        500: jsonRes("Unexpected server error", {
          success: false,
          error: "Failed to save interview result",
        }),
      },
    },
  },
  "/api/ai-voice/interview-attempts/{studentId}": {
    get: {
      tags: ["Chatbot & AI Voice"],
      summary: "Get a student's AI voice interview attempts",
      parameters: [
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      responses: {
        200: jsonRes("Attempt history", {
          success: true,
          studentId: "RTS-JAD-2601",
          totalAttempts: 2,
          attempts: [
            {
              score: 72,
              role: "SDET",
              level: "Mid",
              feedback: "Strong on locators, thin on CI/CD.",
              attemptedAt: "2026-08-31T16:45:00.000Z",
            },
          ],
        }),
        404: jsonRes("Student not found", { success: false, error: "Student not found" }),
        500: jsonRes("Unexpected server error", {
          success: false,
          error: "Failed to fetch interview attempts",
        }),
      },
    },
  },
};
