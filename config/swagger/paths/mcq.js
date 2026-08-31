/**
 * MCQ & Quiz endpoints.
 */

const { jsonRes, errRes, UNAUTHORIZED, FORBIDDEN_ADMIN } = require("../helpers");

module.exports = {
  "/api/mcq/fetch": {
    get: {
      tags: ["MCQ & Quiz"],
      summary: "Get MCQ questions (Admin)",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "ques",
          in: "query",
          schema: { type: "integer", example: 1 },
          description: "Return only the Nth question instead of the whole set",
        },
      ],
      responses: {
        200: jsonRes("MCQ list", {
          totalQuestions: 2,
          questions: [
            {
              mcq_id: 301,
              ques: 1,
              CourseId: 7,
              mcq_question: {
                question: "Which Selenium wait polls the DOM at a fixed interval?",
                options: ["Implicit wait", "Explicit wait", "Fluent wait", "Thread.sleep"],
                correctAnswer: "Fluent wait",
                score: 1,
              },
            },
          ],
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("No MCQs for this course", "No MCQs found for this course."),
        500: errRes("Unexpected server error", "Internal Server Error."),
      },
    },
  },
  "/api/mcq/fetch/{courseId}": {
    get: {
      tags: ["MCQ & Quiz"],
      summary: "Get MCQ questions for a course",
      parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "integer", example: 7 } }],
      responses: {
        200: jsonRes("MCQ list for the course", {
          totalQuestions: 1,
          questions: [
            {
              mcq_id: 301,
              ques: 1,
              CourseId: 7,
              mcq_question: {
                question: "Which Selenium wait polls the DOM at a fixed interval?",
                options: ["Implicit wait", "Explicit wait", "Fluent wait", "Thread.sleep"],
                correctAnswer: "Fluent wait",
                score: 1,
              },
            },
          ],
        }),
        404: errRes("No MCQs for this course", "No MCQs found for this course."),
        500: errRes("Unexpected server error", "Internal Server Error."),
      },
    },
  },
  "/api/mcq/add": {
    post: {
      tags: ["MCQ & Quiz"],
      summary: "Create MCQ question (Admin)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["CourseId", "mcq_question"],
              properties: {
                CourseId: { type: "integer", example: 7 },
                mcq_question: {
                  type: "object",
                  example: {
                    question: "Which Selenium wait polls the DOM at a fixed interval?",
                    options: ["Implicit wait", "Explicit wait", "Fluent wait", "Thread.sleep"],
                    correctAnswer: "Fluent wait",
                    score: 1,
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("MCQ question created", {
          message: "MCQ added successfully!",
          mcq: {
            id: 301,
            CourseId: 7,
            mcq_question: {
              question: "Which Selenium wait polls the DOM at a fixed interval?",
              options: ["Implicit wait", "Explicit wait", "Fluent wait", "Thread.sleep"],
              correctAnswer: "Fluent wait",
              score: 1,
            },
            createdAt: "2026-09-01T06:00:00.000Z",
            updatedAt: "2026-09-01T06:00:00.000Z",
          },
        }),
        400: errRes("Validation error", "Missing required fields: CourseId, question title, or correct answer."),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Course not found", "Course not found."),
        500: errRes("Unexpected server error", "Internal Server Error."),
      },
    },
  },
  "/api/mcq/validate": {
    post: {
      tags: ["MCQ & Quiz"],
      summary: "Validate a student's MCQ answer",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["studentId", "mcq_id", "answer"],
              properties: {
                studentId: { type: "string", example: "RTS-JAD-2601" },
                mcq_id: { type: "integer", example: 301 },
                answer: { type: "string", example: "Fluent wait" },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Answer graded", {
          success: true,
          isCorrect: true,
          correctAnswer: "Fluent wait",
          score: 1,
        }),
        400: errRes("Validation error", "studentId, mcq_id and answer are required."),
        404: errRes("MCQ not found", "MCQ not found."),
        500: errRes("Unexpected server error", "Internal Server Error."),
      },
    },
  },
  "/api/mcq/result/{studentId}": {
    get: {
      tags: ["MCQ & Quiz"],
      summary: "Get a student's quiz result",
      parameters: [
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      responses: {
        200: jsonRes("Quiz result", {
          success: true,
          studentId: "RTS-JAD-2601",
          student_name: "Jane Doe",
          totalQuestions: 20,
          correctAnswers: 16,
          score: 16,
          percentage: "80.00",
          quiz_answer: [{ mcq_id: 301, answer: "Fluent wait", isCorrect: true }],
        }),
        404: errRes("No attempt found", "No quiz attempt found for this student."),
        500: errRes("Unexpected server error", "Internal Server Error."),
      },
    },
  },
  "/api/mcq-config": {
    get: {
      tags: ["MCQ & Quiz"],
      summary: "Get all MCQ quiz configurations (Admin)",
      security: [{ BearerAuth: [] }],
      responses: {
        200: jsonRes("Configurations list", {
          mcqConfigs: [
            {
              CourseId: 7,
              quiz_title: "Selenium Basics Quiz",
              quiz_description: "20 MCQs covering locators, waits and the WebDriver API.",
              totalQuestion: 20,
              isActive: true,
              totalTime: 25,
              start_datetime: "2026-09-18T14:00:00.000Z",
              end_datetime: "2026-09-18T16:00:00.000Z",
              createdAt: "2026-09-01T06:10:00.000Z",
              updatedAt: "2026-09-01T06:10:00.000Z",
            },
          ],
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Nothing configured yet", "No MCQ Configs available."),
        500: errRes("Unexpected server error", "Internal Server Error."),
      },
    },
  },
  "/api/mcq-config/create": {
    post: {
      tags: ["MCQ & Quiz"],
      summary: "Create MCQ configuration (Admin) — one per course",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["CourseId", "quiz_title", "totalQuestion", "totalTime"],
              properties: {
                CourseId: { type: "integer", example: 7 },
                quiz_title: { type: "string", example: "Selenium Basics Quiz" },
                quiz_description: { type: "string", example: "20 MCQs covering locators and waits." },
                totalQuestion: { type: "integer", example: 20 },
                isActive: { type: "boolean", example: true },
                totalTime: { type: "integer", description: "Minutes", example: 25 },
                start_datetime: { type: "string", format: "date-time", example: "2026-09-18T14:00:00.000Z" },
                end_datetime: { type: "string", format: "date-time", example: "2026-09-18T16:00:00.000Z" },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("MCQ config created", {
          message: "MCQ Config created successfully!",
          mcqConfig: {
            CourseId: 7,
            quiz_title: "Selenium Basics Quiz",
            quiz_description: "20 MCQs covering locators, waits and the WebDriver API.",
            totalQuestion: 20,
            isActive: true,
            totalTime: 25,
            start_datetime: "2026-09-18T14:00:00.000Z",
            end_datetime: "2026-09-18T16:00:00.000Z",
            createdAt: "2026-09-01T06:10:00.000Z",
            updatedAt: "2026-09-01T06:10:00.000Z",
          },
        }),
        400: errRes("Validation error", "Missing required fields."),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        409: errRes(
          "Config already exists for the course",
          "MCQ Config already exists for this CourseId. Update it instead of creating a new one."
        ),
        500: errRes("Unexpected server error", "Internal Server Error."),
      },
    },
  },
  "/api/mcq-config/{CourseId}": {
    get: {
      tags: ["MCQ & Quiz"],
      summary: "Get the MCQ configuration for a course",
      parameters: [{ name: "CourseId", in: "path", required: true, schema: { type: "integer", example: 7 } }],
      responses: {
        200: jsonRes("Configuration for the course", {
          mcqConfigs: {
            CourseId: 7,
            quiz_title: "Selenium Basics Quiz",
            quiz_description: "20 MCQs covering locators, waits and the WebDriver API.",
            totalQuestion: 20,
            isActive: true,
            totalTime: 25,
            start_datetime: "2026-09-18T14:00:00.000Z",
            end_datetime: "2026-09-18T16:00:00.000Z",
          },
        }),
        404: errRes("Nothing configured for this course", "No MCQ Config found for this course."),
        500: errRes("Unexpected server error", "Internal Server Error."),
      },
    },
    put: {
      tags: ["MCQ & Quiz"],
      summary: "Update the MCQ configuration for a course",
      parameters: [{ name: "CourseId", in: "path", required: true, schema: { type: "integer", example: 7 } }],
      responses: {
        200: jsonRes("Configuration updated", {
          message: "MCQ Config updated successfully!",
          updatedConfig: {
            CourseId: 7,
            quiz_title: "Selenium Basics Quiz (revised)",
            totalQuestion: 25,
            isActive: false,
            totalTime: 30,
          },
        }),
        404: errRes("Nothing configured for this course", "MCQ Config not found for this course."),
        500: errRes("Unexpected server error", "Internal Server Error."),
      },
    },
    delete: {
      tags: ["MCQ & Quiz"],
      summary: "Delete the MCQ configuration for a course",
      parameters: [{ name: "CourseId", in: "path", required: true, schema: { type: "integer", example: 7 } }],
      responses: {
        200: jsonRes("Configuration deleted", { message: "MCQ Config deleted successfully!" }),
        404: errRes("Nothing configured for this course", "MCQ Config not found for this course."),
        500: errRes("Unexpected server error", "Internal Server Error."),
      },
    },
  },
};
