/**
 * Payments endpoints.
 */

const {
  jsonRes,
  errRes,
  errResSuccess,
  UNAUTHORIZED,
  FORBIDDEN_ADMIN,
  SERVER_ERROR,
} = require("../helpers");
const { EX_PAYMENT } = require("../examples");

module.exports = {
  "/api/payments/add": {
    post: {
      tags: ["Payments"],
      summary: "Add payment installment (triggers activation & Discord/Drive invites on the 1st installment)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentAddRequest" } } },
      },
      responses: {
        201: jsonRes("Payment recorded and activation triggered", {
          success: true,
          message: "Payment recorded successfully!",
          payment: EX_PAYMENT,
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errResSuccess("Package or student missing", "Package not found!"),
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
  "/api/payments/paid": {
    get: {
      tags: ["Payments"],
      summary: "Get the paginated payment ledger across all students",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
      ],
      responses: {
        200: jsonRes("Payment records with the student email flattened in", {
          totalPayments: 318,
          totalPages: 16,
          currentPage: 1,
          totalPaidAmount: 4185000,
          payments: [{ ...EX_PAYMENT, email: "jane.doe@example.com" }],
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: SERVER_ERROR,
      },
    },
  },
  "/api/payments/unpaid": {
    get: {
      tags: ["Payments"],
      summary: "Get list of students with pending dues",
      description:
        "The list intentionally still includes disabled students so admins can manage them; `totalDueAmount` counts only active (isValid=true) students.",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "courseId", in: "query", schema: { type: "integer", example: 7 } },
        { name: "batch_no", in: "query", schema: { type: "string", example: "Batch-07" } },
        { name: "month", in: "query", schema: { type: "string", example: "August" } },
        { name: "year", in: "query", schema: { type: "string", example: "2026" } },
        { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
      ],
      responses: {
        200: jsonRes("Unpaid students list", {
          success: true,
          totalUnpaid: 23,
          totalDueAmount: 187500,
          totalPages: 3,
          limit: 10,
          offset: 0,
          unpaidStudents: [
            {
              StudentId: "RTS-JAD-2601",
              student_name: "Jane Doe",
              CourseId: 7,
              batch_no: "Batch-07",
              courseTitle: "SDET Automation Masterclass",
              mobile: "+8801700000000",
              email: "jane.doe@example.com",
              remark: "Promised to pay by 10 Sep.",
              due: 5000,
              isMigrated: true,
              Course: { course_title: "SDET Automation Masterclass", batch_no: "Batch-07" },
              User: { isValid: true },
            },
          ],
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
  "/api/payments/history/{studentId}": {
    get: {
      tags: ["Payments"],
      summary: "Get payment history for a student",
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: "studentId", in: "path", required: true, schema: { type: "string", example: "RTS-JAD-2601" } },
      ],
      responses: {
        200: jsonRes("Payment ledger for the student", {
          success: true,
          studentId: "RTS-JAD-2601",
          student_name: "Jane Doe",
          email: "jane.doe@example.com",
          isEnrolled: true,
          courseId: 7,
          packageId: 3,
          courseFee: 25000,
          totalPaid: 20000,
          remainingBalance: 5000,
          payments: [EX_PAYMENT],
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errResSuccess("Student, course or package missing", "Student not found!"),
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
  "/api/payments/details": {
    post: {
      tags: ["Payments"],
      summary: "Get the logged-in student's own installment list",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["username"],
              properties: { username: { type: "string", example: "RTS-JAD-2601" } },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Installments for the student", {
          success: true,
          studentId: "RTS-JAD-2601",
          studentName: "Jane Doe",
          totalPaid: "20000.00",
          remainingBalance: 5000,
          installments: [
            {
              installmentNumber: 1,
              installmentAmount: 10000,
              paidAmount: 10000,
              dueAdjustmentType: null,
              dueAdjustmentAmount: 0,
              remainingBalance: 15000,
              month: "July",
              paymentDateTime: "2026-07-28T10:00:00.000Z",
            },
            {
              installmentNumber: 2,
              installmentAmount: 10000,
              paidAmount: 10000,
              dueAdjustmentType: "Discount",
              dueAdjustmentAmount: 0,
              remainingBalance: 5000,
              month: "August",
              paymentDateTime: "2026-08-30T10:15:00.000Z",
            },
          ],
        }),
        400: errResSuccess("Missing username", "Student ID (username) is required."),
        401: UNAUTHORIZED,
        404: errResSuccess("No payments yet", "No payments found for this student."),
        500: errResSuccess("Unexpected server error", "Internal server error."),
      },
    },
  },
  "/api/payments/update/{id}": {
    put: {
      tags: ["Payments"],
      summary: "Update payment record",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 512 } }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentAddRequest" } } },
      },
      responses: {
        200: jsonRes("Payment updated (student `due` recomputed)", {
          success: true,
          message: "Payment updated successfully!",
          payment: EX_PAYMENT,
        }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errResSuccess("Payment, package or student missing", "Payment record not found!"),
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
  "/api/payments/delete/{id}": {
    delete: {
      tags: ["Payments"],
      summary: "Delete payment record (recomputes the student's due)",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 512 } }],
      responses: {
        200: jsonRes("Payment deleted", { message: "Payment deleted successfully" }),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        404: errRes("Payment not found", "Payment not found"),
        500: SERVER_ERROR,
      },
    },
  },
};
