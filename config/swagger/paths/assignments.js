/**
 * Assignments endpoints.
 */

const { jsonRes, errRes, UNAUTHORIZED, FORBIDDEN_ADMIN, SERVER_ERROR } = require("../helpers");

// Used only by this module.
const EX_ASSIGNMENT_QUESTION = {
  id: 41,
  batch_no: "Batch-07",
  topic_name: "Selenium WebDriver",
  Assignment_Title: "Build a Page Object Model login test",
  courseId: 7,
  Description: "Automate the login flow of saucedemo.com using POM and TestNG.",
  SubmissionDate: "2026-09-14T17:59:00.000Z",
  TotalScore: 20,
  createDate: "2026-09-01T05:00:00.000Z",
  updateDate: "2026-09-01T05:00:00.000Z",
};

const EX_ASSIGNMENT_ANSWER = {
  id: 903,
  AssignmentId: 41,
  StudentId: "RTS-JAD-2601",
  Submission_Url: "https://github.com/janedoe/pom-login-assignment",
  Comments: "Good structure. Add explicit waits instead of Thread.sleep.",
  Score: 18,
  reviewDate: "2026-09-16T08:20:00.000Z",
  createdAt: "2026-09-13T19:40:00.000Z",
  updatedAt: "2026-09-16T08:20:00.000Z",
};

module.exports = {
  "/api/assignment/question": {
    post: {
      tags: ["Assignments"],
      summary: "Create assignment question (Admin) — emails the batch in the background",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["courseId", "batch_no", "Assignment_Title", "SubmissionDate", "TotalScore"],
              properties: {
                courseId: { type: "integer", example: 7 },
                batch_no: { type: "string", example: "Batch-07" },
                topic_name: { type: "string", example: "Selenium WebDriver" },
                Assignment_Title: { type: "string", example: "Build a Page Object Model login test" },
                Description: {
                  type: "string",
                  example: "Automate the login flow of saucedemo.com using POM and TestNG.",
                },
                SubmissionDate: { type: "string", format: "date-time", example: "2026-09-14T17:59:00.000Z" },
                TotalScore: { type: "integer", example: 20 },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Assignment question created", {
          message: "Assignment created successfully.",
          assignment: EX_ASSIGNMENT_QUESTION,
          assignmentLink: "https://roadtocareer.net/assignment/submit/41",
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: errRes("Unexpected server error", "Error creating assignment question"),
      },
    },
  },
  "/api/assignment/question/list": {
    get: {
      tags: ["Assignments"],
      summary: "Get all assignment questions with batch and course filters",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "courseId", in: "query", schema: { type: "integer", example: 7 } },
        { name: "batch_no", in: "query", schema: { type: "string", example: "Batch-07" } },
        { name: "assignmentId", in: "query", schema: { type: "integer", example: 41 } },
      ],
      responses: {
        200: jsonRes("Questions with submitted/pending review tallies", {
          count: 1,
          assignments: [
            {
              ...EX_ASSIGNMENT_QUESTION,
              submittedCount: 18,
              pendingReviewCount: 4,
            },
          ],
        }),
        401: UNAUTHORIZED,
        404: jsonRes("No assignments matched the filters", {
          message: "No assignments found.",
          count: 0,
          assignments: [],
        }),
        500: errRes("Unexpected server error", "Error fetching assignment questions"),
      },
    },
  },
  "/api/assignment/answer": {
    post: {
      tags: ["Assignments"],
      summary: "Submit (or resubmit) a student assignment solution",
      description:
        "Returns **201** for a first submission and **200** when an existing answer is updated. Students may only submit their own work; admins/teachers may pass `StudentId` to submit on a student's behalf.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["AssignmentId", "Submission_Url"],
              properties: {
                AssignmentId: { type: "integer", example: 41 },
                StudentId: {
                  type: "string",
                  description: "Admin/teacher only — students are pinned to their own ID",
                  example: "RTS-JAD-2601",
                },
                Submission_Url: {
                  type: "string",
                  example: "https://github.com/janedoe/pom-login-assignment",
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Existing answer updated", {
          message: "Answer updated successfully",
          answer: EX_ASSIGNMENT_ANSWER,
        }),
        201: jsonRes("New answer submitted", {
          message: "Answer submitted successfully",
          answer: { ...EX_ASSIGNMENT_ANSWER, Score: null, Comments: null, reviewDate: null },
        }),
        400: errRes("Missing identifiers", "AssignmentId and StudentId are required."),
        401: UNAUTHORIZED,
        403: errRes("Submitting for another student", "You may only submit your own assignment."),
        500: errRes("Unexpected server error", "Error submitting assignment answer"),
      },
    },
    get: {
      tags: ["Assignments"],
      summary: "Get single submission by student and assignment ID",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "assignmentId", in: "query", required: true, schema: { type: "integer", example: 41 } },
        { name: "studentId", in: "query", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      responses: {
        200: jsonRes("Submission details", { answer: EX_ASSIGNMENT_ANSWER }),
        400: errRes("Missing query params", "studentId and assignmentId are required."),
        401: UNAUTHORIZED,
        404: errRes("No submission for that pair", "Assignment answer not found."),
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
  },
  "/api/assignment/answer/assignment/{assignmentId}": {
    get: {
      tags: ["Assignments"],
      summary: "Get every submission for one assignment",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "assignmentId", in: "path", required: true, schema: { type: "integer", example: 41 } },
      ],
      responses: {
        200: jsonRes("Submissions for the assignment", {
          count: 1,
          answers: [EX_ASSIGNMENT_ANSWER],
        }),
        401: UNAUTHORIZED,
        500: errRes("Unexpected server error", "Error fetching assignment answers"),
      },
    },
  },
  "/api/assignment/answer/student/{studentId}": {
    get: {
      tags: ["Assignments"],
      summary: "Get every submission by one student",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
        { name: "courseId", in: "query", schema: { type: "integer", example: 7 } },
        { name: "batch_no", in: "query", schema: { type: "string", example: "Batch-07" } },
      ],
      responses: {
        200: jsonRes("Submissions by the student", {
          count: 1,
          answers: [
            { ...EX_ASSIGNMENT_ANSWER, Assignment: EX_ASSIGNMENT_QUESTION },
          ],
        }),
        401: UNAUTHORIZED,
        404: errRes("No submissions", "No answers found for Student ID: RTS-JAD-2601"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/assignment/review/assignment/{assignmentId}": {
    put: {
      tags: ["Assignments"],
      summary: "Grade and review an assignment submission (Admin)",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "assignmentId", in: "path", required: true, schema: { type: "integer", example: 41 } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["StudentId"],
              properties: {
                StudentId: { type: "string", example: "RTS-JAD-2601" },
                Score: { type: "integer", example: 18 },
                Comments: {
                  type: "string",
                  example: "Good structure. Add explicit waits instead of Thread.sleep.",
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Review saved; email and notification dispatched", {
          message: "Assignment score and comments updated successfully.",
          updatedAnswer: EX_ASSIGNMENT_ANSWER,
        }),
        400: errRes("Missing identifiers", "AssignmentId (path) and StudentId (body) are required."),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("No submission to grade", "Assignment answer not found for this student."),
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
  },
  "/api/assignment/summary": {
    get: {
      tags: ["Assignments"],
      summary: "Aggregate assignment completion and grading statistics for a course",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "courseId", in: "query", required: true, schema: { type: "integer", example: 7 } },
      ],
      responses: {
        200: jsonRes("Assignment metrics, sorted by total score DESC", {
          courseId: "7",
          studentCount: 1,
          totalAssignments: 10,
          totalAllocatedScore: 200,
          summary: [
            {
              StudentId: "RTS-JAD-2601",
              student_name: "Jane Doe",
              email: "jane.doe@example.com",
              previous_batch: "Batch-06",
              submittedCount: 6,
              totalScore: 104,
              answers: [
                {
                  AssignmentId: 41,
                  Assignment_Title: "Build a Page Object Model login test",
                  topic_name: "Selenium WebDriver",
                  Submission_Url: "https://github.com/janedoe/pom-login-assignment",
                  Score: 18,
                  Comments: "Good structure. Add explicit waits instead of Thread.sleep.",
                },
              ],
            },
          ],
        }),
        400: errRes("courseId not supplied", "courseId is required"),
        401: UNAUTHORIZED,
        404: errRes("No students on the course", "No students found for this course"),
        500: errRes("Unexpected server error", "Server error while fetching assignment summary"),
      },
    },
  },
};
