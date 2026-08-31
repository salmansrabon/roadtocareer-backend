/**
 * Exams endpoints.
 */

const { jsonRes, errRes, UNAUTHORIZED, FORBIDDEN_ADMIN, SERVER_ERROR } = require("../helpers");

// Used only by this module.
const EX_EXAM_CONFIG = {
  id: 12,
  courseId: 7,
  exam_title: "Mid-term: Selenium & Java Fundamentals",
  exam_description: "Descriptive exam covering locators, waits and OOP basics.",
  totalQuestion: 10,
  isActive: true,
  start_datetime: "2026-09-20T14:00:00.000Z",
  end_datetime: "2026-09-20T16:00:00.000Z",
  totalTime: 90,
  createdAt: "2026-09-01T07:00:00.000Z",
  updatedAt: "2026-09-01T07:00:00.000Z",
  Course: { courseId: 7, course_title: "SDET Automation Masterclass", batch_no: "Batch-07" },
};

module.exports = {
  "/api/exam/config": {
    get: {
      tags: ["Exams"],
      summary: "Get all exam configurations (Admin)",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "isActive", in: "query", schema: { type: "boolean" } },
      ],
      responses: {
        200: jsonRes("Exam configurations list", {
          message: "Exam configurations retrieved successfully",
          data: {
            examConfigs: [EX_EXAM_CONFIG],
            pagination: { currentPage: 1, totalPages: 2, totalItems: 12, itemsPerPage: 10 },
          },
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: SERVER_ERROR,
      },
    },
    post: {
      tags: ["Exams"],
      summary: "Create new exam configuration (Admin)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["courseId", "exam_title", "totalQuestion", "start_datetime", "end_datetime", "totalTime"],
              properties: {
                courseId: { type: "integer", example: 7 },
                exam_title: { type: "string", example: "Mid-term: Selenium & Java Fundamentals" },
                exam_description: { type: "string", example: "Descriptive exam covering locators and waits." },
                totalQuestion: { type: "integer", example: 10 },
                isActive: { type: "boolean", example: true },
                start_datetime: { type: "string", format: "date-time", example: "2026-09-20T14:00:00.000Z" },
                end_datetime: { type: "string", format: "date-time", example: "2026-09-20T16:00:00.000Z" },
                totalTime: { type: "integer", description: "Minutes", example: 90 },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Exam configuration created", {
          message: "Exam configuration created successfully",
          data: EX_EXAM_CONFIG,
        }),
        400: errRes("Validation error", "End datetime must be after start datetime"),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Course not found", "Course not found"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/exam/config/{id}": {
    get: {
      tags: ["Exams"],
      summary: "Get exam configuration by ID (Admin)",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 12 } }],
      responses: {
        200: jsonRes("Exam configuration", {
          message: "Exam configuration retrieved successfully",
          data: EX_EXAM_CONFIG,
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Not found", "Exam configuration not found"),
        500: SERVER_ERROR,
      },
    },
    put: {
      tags: ["Exams"],
      summary: "Update exam configuration (Admin)",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 12 } }],
      responses: {
        200: jsonRes("Exam configuration updated", {
          message: "Exam configuration updated successfully",
          data: EX_EXAM_CONFIG,
        }),
        400: errRes("Validation error", "End datetime must be after start datetime"),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Not found", "Exam configuration not found"),
        500: SERVER_ERROR,
      },
    },
    delete: {
      tags: ["Exams"],
      summary: "Delete exam configuration (Admin)",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 12 } }],
      responses: {
        200: jsonRes("Exam configuration deleted", {
          message: "Exam configuration deleted successfully",
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Not found", "Exam configuration not found"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/exam/student/active": {
    get: {
      tags: ["Exams"],
      summary: "Get active available exams for the logged-in student's course/batch",
      security: [{ BearerAuth: [] }],
      responses: {
        200: jsonRes("Active exams list", {
          message: "Active exams retrieved successfully",
          data: {
            student: {
              studentId: "RTS-JAD-2601",
              studentName: "Jane Doe",
              batch: "Batch-07",
              course: { courseId: 7, course_title: "SDET Automation Masterclass", batch_no: "Batch-07" },
            },
            activeExams: [EX_EXAM_CONFIG],
          },
        }),
        401: UNAUTHORIZED,
        404: errRes("Student not found", "Student not found"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/exam/student/{examId}": {
    get: {
      tags: ["Exams"],
      summary: "Get exam questions for a student taking the exam (hints and answers stripped)",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "examId", in: "path", required: true, schema: { type: "integer", example: 12 } }],
      responses: {
        200: jsonRes("Exam questions without hints", {
          message: "Exam retrieved successfully",
          data: {
            examConfig: {
              id: 12,
              exam_title: "Mid-term: Selenium & Java Fundamentals",
              exam_description: "Descriptive exam covering locators, waits and OOP basics.",
              totalQuestion: 10,
              totalTime: 90,
              end_datetime: "2026-09-20T16:00:00.000Z",
            },
            questions: [
              {
                questionNumber: 1,
                question: "Explain the difference between implicit and explicit waits in Selenium.",
                score: 5,
              },
              {
                questionNumber: 2,
                question: "When would you prefer a CSS selector over XPath?",
                score: 5,
              },
            ],
          },
        }),
        401: UNAUTHORIZED,
        403: errRes(
          "Not your course / not active / outside the exam window",
          "Exam has not started yet"
        ),
        404: errRes("Exam, student, or questions missing", "Exam not found"),
        409: errRes("Already submitted", "You have already submitted this exam"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/exam/student/{examId}/submit": {
    post: {
      tags: ["Exams"],
      summary: "Submit student exam answers",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "examId", in: "path", required: true, schema: { type: "integer", example: 12 } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["answers"],
              properties: {
                answers: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      questionNumber: { type: "integer", example: 1 },
                      answer: {
                        type: "string",
                        example:
                          "An implicit wait is a global polling timeout; an explicit wait targets one condition.",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Exam submitted successfully", {
          message: "Exam submitted successfully",
          data: { submissionTime: "2026-09-20T15:12:44.000Z", totalQuestions: 10 },
        }),
        400: errRes("Empty answers array", "Answers array is required"),
        401: UNAUTHORIZED,
        403: errRes("Submission window closed", "Exam submission time has ended"),
        404: errRes("Exam, student, or questions missing", "Exam not found"),
        409: errRes("Already submitted", "You have already submitted this exam"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/exam/student/{examId}/result": {
    get: {
      tags: ["Exams"],
      summary: "Get the student's own exam score and feedback",
      description:
        "Returns 200 in both states — check `data.evaluated` before reading scores.",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "examId", in: "path", required: true, schema: { type: "integer", example: 12 } }],
      responses: {
        200: jsonRes("Exam result (evaluated)", {
          message: "Exam result retrieved successfully",
          data: {
            submitted: true,
            evaluated: true,
            exam_title: "Mid-term: Selenium & Java Fundamentals",
            submission_time: "2026-09-20T15:12:44.000Z",
            total_score: 42,
            max_possible_score: 50,
            answers: [
              {
                questionNumber: 1,
                question: "Explain the difference between implicit and explicit waits in Selenium.",
                student_answer:
                  "An implicit wait is a global polling timeout; an explicit wait targets one condition.",
                score: 5,
                max_score: 5,
                feedback: "Spot on — you also mentioned the risk of mixing both. Nice.",
              },
            ],
          },
        }),
        401: UNAUTHORIZED,
        404: errRes("No submission for this exam", "No submission found for this exam"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/exam/evaluate/{examId}/{studentId}": {
    get: {
      tags: ["Exams"],
      summary: "Get a student exam submission for instructor evaluation",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "examId", in: "path", required: true, schema: { type: "integer", example: 12 } },
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      responses: {
        200: jsonRes("Submission answers and evaluation status", {
          message: "Student submission retrieved successfully",
          data: {
            student: {
              studentId: "RTS-JAD-2601",
              studentName: "Jane Doe",
              email: "jane.doe@example.com",
              batch: "Batch-07",
            },
            submission: {
              exam_id: 12,
              exam_title: "Mid-term: Selenium & Java Fundamentals",
              submission_time: "2026-09-20T15:12:44.000Z",
              total_score: null,
              is_evaluated: false,
              answers: [
                {
                  questionNumber: 1,
                  question: "Explain the difference between implicit and explicit waits in Selenium.",
                  hint: "Global polling vs condition-scoped wait; warn about mixing them.",
                  student_answer:
                    "An implicit wait is a global polling timeout; an explicit wait targets one condition.",
                  max_score: 5,
                  score: null,
                  feedback: null,
                },
              ],
            },
          },
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Student or submission missing", "No submission found for this exam"),
        500: SERVER_ERROR,
      },
    },
    put: {
      tags: ["Exams"],
      summary: "Manually evaluate and score a student exam submission",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "examId", in: "path", required: true, schema: { type: "integer", example: 12 } },
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["evaluations"],
              properties: {
                evaluations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      questionNumber: { type: "integer", example: 1 },
                      score: { type: "number", example: 5 },
                      feedback: { type: "string", example: "Spot on — clear and complete." },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Evaluation saved", {
          message: "Exam evaluation completed successfully",
          data: {
            studentId: "RTS-JAD-2601",
            studentName: "Jane Doe",
            totalScore: 42,
            evaluatedAnswers: 10,
          },
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Student or submission missing", "No submission found for this exam"),
        500: jsonRes("Unexpected server error", {
          message: "Internal server error",
          error: "Cannot read properties of undefined (reading 'answers')",
        }),
      },
    },
  },
  "/api/exam/ai-evaluate/{examId}/{studentId}": {
    post: {
      tags: ["Exams"],
      summary: "Trigger AI evaluation for a single exam question",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "examId", in: "path", required: true, schema: { type: "integer", example: 12 } },
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["questionNumber"],
              properties: { questionNumber: { type: "integer", example: 1 } },
            },
          },
        },
      },
      responses: {
        200: jsonRes("AI scoring and feedback for the question", {
          message: "AI evaluation completed successfully",
          data: {
            questionNumber: 1,
            score: 4.5,
            feedback:
              "Nice one — you nailed the polling vs condition distinction. Mention why mixing both is risky next time.",
            maxScore: 5,
            aiResponse: '{"score": 4.5, "feedback": "Nice one — you nailed the ..."}',
          },
        }),
        400: errRes("questionNumber missing", "Question number is required"),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Student, submission or question missing", "Question not found in submission"),
        500: jsonRes("OpenAI call failed", {
          message: "AI evaluation failed",
          error: "Request failed with status code 429",
          details: "Rate limit reached for gpt-4o",
        }),
      },
    },
  },
  "/api/exam/ai-evaluate-all/{examId}/{studentId}": {
    post: {
      tags: ["Exams"],
      summary: "Trigger automated AI evaluation for every question in a submission",
      description: "Per-question failures are collected in `data.errors` rather than failing the request.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "examId", in: "path", required: true, schema: { type: "integer", example: 12 } },
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      responses: {
        200: jsonRes("Complete AI evaluation for all answers", {
          message: "AI evaluation completed",
          data: {
            evaluatedQuestions: [
              { questionNumber: 1, score: 4.5, feedback: "Clear and correct — good example too." },
              { questionNumber: 2, score: 3, feedback: "Right idea, but you skipped the readability angle." },
            ],
            totalQuestions: 10,
            successfullyEvaluated: 9,
            errors: [{ questionNumber: 7, error: "Request failed with status code 429" }],
          },
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Student or submission missing", "No submission found for this exam"),
        500: jsonRes("OpenAI call failed", {
          message: "AI evaluation failed",
          error: "Request failed with status code 429",
        }),
      },
    },
  },
};
