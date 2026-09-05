/**
 * Chatbot endpoints.
 */

const { jsonRes, errRes } = require("../helpers");

module.exports = {
  "/api/chatbot/chat": {
    post: {
      tags: ["Chatbot"],
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
};
