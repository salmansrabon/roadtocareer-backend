/**
 * Students endpoints.
 */

const {
  jsonRes,
  errRes,
  errResSuccess,
  UNAUTHORIZED,
  FORBIDDEN_ADMIN,
  SERVER_ERROR,
} = require("../helpers");
const { EX_STUDENT_LIST_ITEM, EX_STUDENT_PROFILE } = require("../examples");

module.exports = {
  "/api/students/signup": {
    post: {
      tags: ["Students"],
      summary: "Public student onboarding signup (creates the users row and emails credentials)",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/StudentSignupRequest" } } },
      },
      responses: {
        201: jsonRes("Student enrolled successfully", {
          message: "Student signup successful!",
          studentId: "RTS-JAD-2601",
          generatedPassword: "Xk7p2Qm9",
          studentDetails: EX_STUDENT_LIST_ITEM,
        }),
        400: errRes(
          "Validation error / duplicate enrolment",
          "Student name, email, mobile, university, courseId, and package_name are required."
        ),
        500: errRes(
          "Created but the credential email failed, or unexpected error",
          "Student registered but email sending failed. Please contact admin."
        ),
      },
    },
  },
  "/api/students/list": {
    get: {
      tags: ["Students"],
      summary: "Get all students (Admin, with search/filters/pagination)",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "batch_no", in: "query", schema: { type: "string", example: "Batch-07" } },
        { name: "courseId", in: "query", schema: { type: "integer", example: 7 } },
        { name: "studentId", in: "query", schema: { type: "string", example: "RTS-JAD-2601" } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
      ],
      responses: {
        200: jsonRes("Paginated student list", {
          totalStudents: 137,
          totalPages: 7,
          currentPage: 1,
          students: [EX_STUDENT_LIST_ITEM],
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: SERVER_ERROR,
      },
    },
  },
  "/api/students/alumni": {
    get: {
      tags: ["Students"],
      summary: "Get directory of alumni students",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "studentName", in: "query", schema: { type: "string" } },
        { name: "batch_no", in: "query", schema: { type: "string", example: "Batch-05" } },
        { name: "university", in: "query", schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
      ],
      responses: {
        200: jsonRes("Paginated alumni list", {
          success: true,
          page: 1,
          limit: 20,
          total: 84,
          totalPages: 5,
          data: [EX_STUDENT_LIST_ITEM],
        }),
        401: UNAUTHORIZED,
        500: errResSuccess("Unexpected server error", "Internal server error"),
      },
    },
  },
  "/api/students/{studentId}": {
    get: {
      tags: ["Students"],
      summary:
        "Get single student profile. Mobile/email are masked unless the caller is the owner or an admin.",
      parameters: [
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      responses: {
        200: jsonRes(
          "Student profile. `courseFee` and `due` are computed live and override the stored column.",
          EX_STUDENT_PROFILE
        ),
        404: errRes("Student not found", "Student not found"),
        500: SERVER_ERROR,
      },
    },
    put: {
      tags: ["Students"],
      summary: "Update student details",
      parameters: [
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                student_name: { type: "string", example: "Jane Doe" },
                batch_no: { type: "string", example: "Batch-07" },
                mobile: { type: "string", example: "+8801700000000" },
                skill: { type: "array", items: { type: "string" }, example: ["Selenium", "Playwright"] },
                lookingForJob: { type: "string", enum: ["Yes", "No"], example: "Yes" },
                get_certificate: { type: "boolean", example: true },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Student updated", {
          message: "Student details updated successfully",
          student: EX_STUDENT_PROFILE,
        }),
        404: errRes("Student not found", "Student not found"),
        500: SERVER_ERROR,
      },
    },
    delete: {
      tags: ["Students"],
      summary: "Delete student record (also deletes the linked users row)",
      parameters: [
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      responses: {
        200: jsonRes("Student deleted", { message: "Student deleted successfully." }),
        404: errRes("Student not found", "Student not found"),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/students/mark-attendance": {
    post: {
      tags: ["Students"],
      summary: "Mark student attendance (timezone-aware, 2-hour window from class start)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["studentId", "date", "time"],
              properties: {
                studentId: { type: "string", example: "RTS-JAD-2601" },
                date: { type: "string", description: "DD-MM-YYYY", example: "30-08-2026" },
                time: { type: "string", description: "hh:mm:ss A", example: "08:12:30 PM" },
                timezone: { type: "string", default: "Asia/Dhaka", example: "Asia/Dhaka" },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Attendance recorded", {
          message: "Attendance marked successfully!",
          attendancePercentage: "43.75%",
          totalClicks: 14,
        }),
        400: jsonRes("Outside the allowed class window, or already marked", {
          message: "Please give attendance during class time (within 2 hours of class start).",
          debug: {
            submittedTime: "2026-08-30T16:12:30Z",
            classTime: "2026-08-30T14:00:00Z",
            maxAllowedTime: "2026-08-30T16:00:00Z",
          },
        }),
        404: errRes("Student or course not found", "Student not found."),
        500: errRes("Unexpected server error", "Internal Server Error."),
      },
    },
  },
  "/api/students/attendance/{studentId}": {
    get: {
      tags: ["Students"],
      summary: "Get attendance history for a student (current batch only)",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      responses: {
        200: jsonRes(
          "Attendance records. `attendanceList` is a JSON **string**, not an array — the frontend parses it.",
          {
            studentId: "RTS-JAD-2601",
            studentName: "Jane Doe",
            courseId: 7,
            courseTitle: "SDET Automation Masterclass",
            batch_no: "Batch-07",
            attendanceList:
              '[{"time":"30-08-2026 08:12:30 PM","timezone":"Asia/Dhaka","utcTime":"30-08-2026 02:12:30 PM"}]',
            totalClicks: 14,
            totalClass: 32,
            attendancePercentage: "43.75",
          }
        ),
        401: UNAUTHORIZED,
        404: errRes("No attendance row", "Attendance record not found."),
        500: errRes("Unexpected server error", "Internal Server Error."),
      },
    },
  },
  "/api/students/list/attendance": {
    get: {
      tags: ["Students"],
      summary: "Get all student attendance records (Admin)",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
      ],
      responses: {
        200: jsonRes("Paginated attendance matrix", {
          success: true,
          totalRecords: 137,
          totalPages: 7,
          currentPage: 1,
          attendanceRecords: [
            {
              courseId: 7,
              courseTitle: "SDET Automation Masterclass",
              batch_no: "Batch-07",
              StudentId: "RTS-JAD-2601",
              student_name: "Jane Doe",
              attendanceList:
                '[{"time":"30-08-2026 08:12:30 PM","timezone":"Asia/Dhaka","utcTime":"30-08-2026 02:12:30 PM"}]',
            },
          ],
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
  "/api/students/migrate/{studentId}": {
    post: {
      tags: ["Students"],
      summary: "Migrate student to a new batch while preserving historical progress",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["batch_no", "CourseId"],
              properties: {
                batch_no: { type: "string", example: "Batch-07" },
                CourseId: { type: "integer", example: 7 },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes(
          "Migrated. A 200 is also returned when the migration succeeded but Drive access could not be granted — check `message`.",
          {
            message:
              "Quiz answer reset, attendance moved to the new batch, Drive access granted for RTS-JAD-2601",
            updatedCourse: 7,
            updatedBatch: "Batch-07",
            drivePermissionId: "04123456789012345678",
          }
        ),
        400: errRes("Missing body fields", "batch_no is required."),
        404: errRes("Student not found", "No student found with ID: RTS-JAD-2601"),
        500: errRes("Unexpected server error", "Internal server error."),
      },
    },
  },
  "/api/students/course-progress/{studentId}": {
    get: {
      tags: ["Students"],
      summary: "Calculate course completion percentage and milestone progress",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      responses: {
        200: jsonRes("Progress analytics", {
          attendanceCount: 14,
          assignmentCount: 6,
          totalClass: 32,
          totalAssignments: 10,
          attendancePercentage: 44,
          assignmentPercentage: 60,
          courseCompletionPercentage: 52,
        }),
        401: UNAUTHORIZED,
        500: jsonRes("Unexpected server error", {
          message: "Server error",
          error: "Cannot read properties of null (reading 'CourseId')",
        }),
      },
    },
  },
  "/api/students/save-certificate/{studentId}": {
    post: {
      tags: ["Students"],
      summary: "Save generated certificate image and return its public URL",
      description:
        "An existing certificate is never overwritten — if one is already stored the endpoint returns 200 with the existing URL.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["imageData"],
              properties: {
                imageData: {
                  type: "string",
                  description: "Base64 PNG data URI",
                  example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Certificate saved (or already existed)", {
          message: "Certificate saved successfully!",
          certificateUrl: "/images/certificates/RTS-JAD-2601-1756540800000.png",
          debug: {
            filename: "RTS-JAD-2601-1756540800000.png",
            filepath: "/var/www/backend/images/certificates/RTS-JAD-2601-1756540800000.png",
            frontendBase: "https://roadtocareer.net",
            fileSize: 284913,
          },
        }),
        400: errRes("No image supplied", "Image data is required."),
        404: errRes("Student not found", "Student not found."),
        500: SERVER_ERROR,
      },
    },
  },
};
