/**
 * securitySchemes plus the reusable request-body schemas referenced from
 * paths/ via `$ref: "#/components/schemas/..."`.
 */

const components = {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT token obtained from /api/auth/login in the format: Bearer <token>",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Internal server error" },
        },
        example: { message: "Internal server error" },
      },
      LoginRequest: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: {
            type: "string",
            description: "Student ID for students, or the admin username",
            example: "RTS-JAD-2601",
          },
          password: { type: "string", format: "password", example: "123456" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["username", "email", "password"],
        properties: {
          username: { type: "string", example: "john_doe" },
          email: { type: "string", format: "email", example: "john@example.com" },
          password: { type: "string", format: "password", example: "securePass123" },
          role: { type: "string", enum: ["admin", "teacher", "student"], example: "student" },
        },
      },
      StudentSignupRequest: {
        type: "object",
        required: ["student_name", "email", "mobile", "university", "courseId", "package_name"],
        properties: {
          student_name: { type: "string", example: "Jane Doe" },
          salutation: { type: "string", example: "Ms." },
          email: { type: "string", format: "email", example: "jane.doe@example.com" },
          mobile: { type: "string", example: "+8801700000000" },
          university: { type: "string", example: "University of Dhaka" },
          courseId: { type: "integer", example: 7 },
          package_name: { type: "string", example: "Premium" },
          profession: { type: "string", example: "Software Engineer" },
          passingYear: { type: "string", example: "2023" },
          experience: { type: "string", example: "2" },
          company: { type: "string", example: "Tech Corp" },
          designation: { type: "string", example: "Junior QA Engineer" },
          address: { type: "string", example: "Mirpur DOHS, Dhaka" },
          facebook: { type: "string", example: "https://facebook.com/janedoe" },
          whatsapp: { type: "string", example: "+8801700000000" },
          linkedin: { type: "string", example: "https://linkedin.com/in/janedoe" },
          github: { type: "string", example: "https://github.com/janedoe" },
          knowMe: { type: "string", example: "Facebook Group" },
          opinion: { type: "string", example: "Excited to start automation." },
          google_access_id: { type: "string", example: "jane.doe@gmail.com" },
        },
      },
      CourseCreateRequest: {
        type: "object",
        required: ["courseId", "batch_no", "course_title"],
        properties: {
          courseId: { type: "integer", example: 7 },
          batch_no: { type: "string", example: "Batch-07" },
          course_title: { type: "string", example: "SDET Automation Masterclass" },
          course_initial: { type: "string", example: "SDET" },
          drive_folder_id: { type: "string", example: "1AbCdEfGhIjKlMnOpQrStUvWxYz01234" },
          short_description: { type: "string", example: "Java, Selenium, Playwright and CI/CD." },
          is_enabled: { type: "boolean", example: true },
          is_latest: { type: "boolean", example: true },
          enrollment: { type: "boolean", example: true },
          class_days: { type: "array", items: { type: "string" }, example: ["Friday", "Saturday"] },
          class_time: { type: "string", example: "20:00:00" },
          total_class: { type: "integer", example: 32 },
        },
      },
      PaymentAddRequest: {
        type: "object",
        required: ["studentId", "courseId", "packageId", "installmentNumber", "paidAmount"],
        properties: {
          studentId: { type: "string", example: "RTS-JAD-2601" },
          studentName: { type: "string", example: "Jane Doe" },
          courseId: { type: "integer", example: 7 },
          packageId: { type: "integer", example: 3 },
          installmentNumber: { type: "integer", example: 2 },
          installmentAmount: { type: "number", example: 10000 },
          paidAmount: { type: "number", example: 10000 },
          dueAdjustmentType: { type: "string", enum: ["Discount", "Scholarship", "Waiver"], example: "Discount" },
          dueAdjustmentAmount: { type: "number", example: 0 },
          month: { type: "string", example: "August" },
          remarks: { type: "string", example: "2nd installment via bKash" },
        },
      },
      AISearchRequest: {
        type: "object",
        required: ["query"],
        properties: {
          query: {
            type: "string",
            example: "Find QA engineers with 2+ years of Playwright and CI/CD experience in Dhaka",
          },
        },
      },
      ChatbotRequest: {
        type: "object",
        required: ["question"],
        properties: {
          question: { type: "string", example: "When is the next batch starting for SDET?" },
        },
      },
    },
};

module.exports = components;
