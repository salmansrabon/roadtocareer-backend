/**
 * OpenAPI 3.0 Specification for Road to SDET / Road to Career Backend API
 */

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Road to SDET - REST API Documentation",
    version: "1.0.0",
    description:
      "Comprehensive REST API documentation for the Road to SDET Learning Management & Career Placement Platform. Supports authentication, student lifecycle, courses, exams, assignments, interactive books, AI tools, and financial management.",
    contact: {
      name: "Road to SDET Engineering Team",
      url: "https://roadtocareer.net",
    },
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Development Server",
    },
    {
      url: "https://courses.roadtocareer.net",
      description: "Production Server",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication, Registration, and Password Reset" },
    { name: "Users", description: "User Account & Role Management" },
    { name: "Students", description: "Student Profiles, Migration, Attendance & Alumni" },
    { name: "QA Talent Discovery", description: "Candidate Search & AI-Powered Talent Matching" },
    { name: "Courses", description: "Course & Batch Management" },
    { name: "Modules", description: "Course Module Hierarchy" },
    { name: "Packages", description: "Package Offerings" },
    { name: "Payments", description: "Student Installments & Financial Records" },
    { name: "Assignments", description: "Digital Assignments, Submissions & Grading" },
    { name: "Exams", description: "Descriptive Exams, Submissions & Manual/AI Evaluations" },
    { name: "MCQ & Quiz", description: "Multiple Choice Questions & Configurations" },
    { name: "Books & Topics", description: "Interactive Chapters, Topics & Access Control" },
    { name: "Jobs", description: "Job Portal & Postings" },
    { name: "Resume & AI Evaluation", description: "Resume Evaluation & Matching against Job Postings" },
    { name: "Chatbot & AI Voice", description: "AI Conversational Support & Voice Assistant" },
    { name: "Blogs & Events", description: "Community Blogs, Events & Dynamic Event Forms" },
    { name: "Notifications", description: "System & User Notifications" },
    { name: "Teams & Reviews", description: "Team Member Profiles and Course Reviews" },
    { name: "Images & File Management", description: "Asset Uploads & Certificate Storage" },
    { name: "Google Drive", description: "Course Video Materials & Google Drive Access" },
  ],
  components: {
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
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error description" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@roadtocareer.net" },
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
        required: ["name", "email", "phone", "courseId", "batch_no"],
        properties: {
          name: { type: "string", example: "Jane Doe" },
          email: { type: "string", format: "email", example: "jane@example.com" },
          phone: { type: "string", example: "+8801700000000" },
          courseId: { type: "integer", example: 1 },
          batch_no: { type: "string", example: "Batch-05" },
          gender: { type: "string", enum: ["Male", "Female", "Other"], example: "Female" },
          university: { type: "string", example: "University of Dhaka" },
          company: { type: "string", example: "Tech Corp" },
          designation: { type: "string", example: "Junior QA" },
        },
      },
      CourseCreateRequest: {
        type: "object",
        required: ["title", "description", "price", "duration"],
        properties: {
          title: { type: "string", example: "SDET Automation Masterclass" },
          description: { type: "string", example: "Comprehensive Java & Selenium/Playwright SDET course" },
          price: { type: "number", example: 25000 },
          duration: { type: "string", example: "4 Months" },
          batches: { type: "string", example: "Batch-01, Batch-02" },
          isEnabled: { type: "boolean", example: true },
        },
      },
      PaymentAddRequest: {
        type: "object",
        required: ["studentId", "amount", "paymentDate"],
        properties: {
          studentId: { type: "integer", example: 101 },
          amount: { type: "number", example: 5000 },
          paymentDate: { type: "string", format: "date", example: "2026-08-30" },
          transactionId: { type: "string", example: "TXN12345678" },
          paymentMethod: { type: "string", example: "bKash" },
          notes: { type: "string", example: "1st installment" },
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
        required: ["message"],
        properties: {
          message: { type: "string", example: "When is the next batch starting for SDET?" },
          history: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string", example: "user" },
                content: { type: "string", example: "Hello" },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    // ── AUTH ──
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register new user account",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } },
        },
        responses: {
          201: { description: "User registered successfully" },
          400: { description: "Validation error / user already exists" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "User login to obtain JWT token",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          200: { description: "Login successful with JWT token and user info" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/request-password-reset": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset link via email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email", example: "user@example.com" } },
              },
            },
          },
        },
        responses: { 200: { description: "Password reset link sent if account exists" } },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using reset token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "newPassword"],
                properties: {
                  token: { type: "string", example: "jwt-reset-token-here" },
                  newPassword: { type: "string", format: "password", example: "NewSecurePass123" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Password successfully reset" } },
      },
    },
    "/api/auth/change-password/{username}": {
      post: {
        tags: ["Auth"],
        summary: "Change password for authenticated user",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["oldPassword", "newPassword"],
                properties: {
                  oldPassword: { type: "string", format: "password" },
                  newPassword: { type: "string", format: "password" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Password updated successfully" }, 401: { description: "Unauthorized" } },
      },
    },

    // ── USERS ──
    "/api/users/list": {
      get: {
        tags: ["Users"],
        summary: "Get all user accounts",
        responses: { 200: { description: "List of users" } },
      },
    },
    "/api/users/{studentId}": {
      patch: {
        tags: ["Users"],
        summary: "Update user active / disabled status",
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { status: { type: "string", enum: ["Active", "Disabled"], example: "Active" } },
              },
            },
          },
        },
        responses: { 200: { description: "User status updated" } },
      },
    },
    "/api/users/update/{id}": {
      put: {
        tags: ["Users"],
        summary: "Update user account by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "User updated" } },
      },
    },
    "/api/users/delete/{id}": {
      delete: {
        tags: ["Users"],
        summary: "Delete user account by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "User deleted" } },
      },
    },

    // ── STUDENTS ──
    "/api/students/signup": {
      post: {
        tags: ["Students"],
        summary: "Public student onboarding signup",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/StudentSignupRequest" } } },
        },
        responses: { 201: { description: "Student enrolled successfully" } },
      },
    },
    "/api/students/list": {
      get: {
        tags: ["Students"],
        summary: "Get all students (Admin with search/filters/pagination)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "batch_no", in: "query", schema: { type: "string" } },
          { name: "courseId", in: "query", schema: { type: "integer" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: { 200: { description: "List of students" }, 403: { description: "Admin access required" } },
      },
    },
    "/api/students/alumni": {
      get: {
        tags: ["Students"],
        summary: "Get directory of alumni students",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "List of alumni" } },
      },
    },
    "/api/students/{studentId}": {
      get: {
        tags: ["Students"],
        summary: "Get single student details by student ID",
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Student profile object" }, 404: { description: "Student not found" } },
      },
      put: {
        tags: ["Students"],
        summary: "Update student details",
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Student updated" } },
      },
      delete: {
        tags: ["Students"],
        summary: "Delete student record",
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Student deleted" } },
      },
    },
    "/api/students/mark-attendance": {
      post: {
        tags: ["Students"],
        summary: "Mark student attendance (Timezone-aware)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["studentId"],
                properties: {
                  studentId: { type: "string", example: "STD-2026-001" },
                  date: { type: "string", format: "date", example: "2026-08-30" },
                  status: { type: "string", enum: ["Present", "Absent", "Late"], example: "Present" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Attendance recorded" } },
      },
    },
    "/api/students/attendance/{studentId}": {
      get: {
        tags: ["Students"],
        summary: "Get attendance history for a student",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Attendance records" } },
      },
    },
    "/api/students/list/attendance": {
      get: {
        tags: ["Students"],
        summary: "Get all student attendance records (Admin)",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Full attendance matrix" } },
      },
    },
    "/api/students/migrate/{studentId}": {
      post: {
        tags: ["Students"],
        summary: "Migrate student to a new batch while preserving historical progress",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["newBatchNo"],
                properties: {
                  newBatchNo: { type: "string", example: "Batch-06" },
                  newCourseId: { type: "integer", example: 1 },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Student migrated successfully" } },
      },
    },
    "/api/students/course-progress/{studentId}": {
      get: {
        tags: ["Students"],
        summary: "Calculate course completion percentage and milestone progress",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Progress analytics" } },
      },
    },
    "/api/students/save-certificate/{studentId}": {
      post: {
        tags: ["Students"],
        summary: "Save generated certificate image and issue verification ID",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["certificateImage"],
                properties: { certificateImage: { type: "string", description: "Base64 PNG string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Certificate saved and issued" } },
      },
    },

    // ── QA TALENT DISCOVERY ──
    "/api/students/public-list": {
      get: {
        tags: ["QA Talent Discovery"],
        summary: "List public QA talent profiles with privacy filtering",
        responses: { 200: { description: "Public talent list" } },
      },
    },
    "/api/students/search-talent": {
      get: {
        tags: ["QA Talent Discovery"],
        summary: "Filter talent by skills, experience, certifications, and availability",
        parameters: [
          { name: "skills", in: "query", schema: { type: "string" }, description: "Comma separated skills (e.g. Selenium, Cypress, Playwright)" },
          { name: "experience", in: "query", schema: { type: "number" } },
          { name: "university", in: "query", schema: { type: "string" } },
          { name: "company", in: "query", schema: { type: "string" } },
          { name: "isISTQBCertified", in: "query", schema: { type: "boolean" } },
        ],
        responses: { 200: { description: "Filtered QA talent list" } },
      },
    },
    "/api/students/ai-search": {
      post: {
        tags: ["QA Talent Discovery"],
        summary: "AI-powered natural language talent search",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AISearchRequest" } } },
        },
        responses: {
          200: { description: "Ranked candidates matched against the natural language prompt" },
        },
      },
    },
    "/api/students/send-contact-email": {
      post: {
        tags: ["QA Talent Discovery"],
        summary: "Send recruiter inquiry email to candidate",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["studentId", "recruiterEmail", "message"],
                properties: {
                  studentId: { type: "string" },
                  recruiterEmail: { type: "string", format: "email" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Contact email dispatched" } },
      },
    },

    // ── COURSES ──
    "/api/courses/list": {
      get: {
        tags: ["Courses"],
        summary: "Get list of all active courses",
        responses: { 200: { description: "Courses array" } },
      },
    },
    "/api/courses/{courseId}": {
      get: {
        tags: ["Courses"],
        summary: "Get course details by ID",
        parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Course details" }, 404: { description: "Course not found" } },
      },
    },
    "/api/courses/create": {
      post: {
        tags: ["Courses"],
        summary: "Create new course (Admin only)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CourseCreateRequest" } } },
        },
        responses: { 201: { description: "Course created" }, 403: { description: "Admin access required" } },
      },
    },
    "/api/courses/update/{courseId}": {
      put: {
        tags: ["Courses"],
        summary: "Update course",
        parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Course updated" } },
      },
    },
    "/api/courses/delete/{courseId}": {
      delete: {
        tags: ["Courses"],
        summary: "Delete course",
        parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Course deleted" } },
      },
    },

    // ── MODULES ──
    "/api/modules": {
      get: {
        tags: ["Modules"],
        summary: "Get all modules",
        responses: { 200: { description: "Modules list" } },
      },
      post: {
        tags: ["Modules"],
        summary: "Create a new course module",
        responses: { 201: { description: "Module created" } },
      },
    },
    "/api/modules/{id}": {
      get: {
        tags: ["Modules"],
        summary: "Get module by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Module data" } },
      },
      put: {
        tags: ["Modules"],
        summary: "Update module",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Module updated" } },
      },
      delete: {
        tags: ["Modules"],
        summary: "Delete module",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Module deleted" } },
      },
    },

    // ── PACKAGES ──
    "/api/packages": {
      get: {
        tags: ["Packages"],
        summary: "Get all package offerings",
        responses: { 200: { description: "Packages list" } },
      },
      post: {
        tags: ["Packages"],
        summary: "Create a package",
        responses: { 201: { description: "Package created" } },
      },
    },
    "/api/packages/list": {
      get: {
        tags: ["Packages"],
        summary: "Get unique list of packages for dropdown selection",
        responses: { 200: { description: "Packages dropdown list" } },
      },
    },

    // ── PAYMENTS ──
    "/api/payments/add": {
      post: {
        tags: ["Payments"],
        summary: "Add payment installment (triggers activation & Discord/Drive invites if 1st installment)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentAddRequest" } } },
        },
        responses: { 201: { description: "Payment recorded and activation triggered" } },
      },
    },
    "/api/payments/paid": {
      get: {
        tags: ["Payments"],
        summary: "Get list of fully paid students",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Paid students list" } },
      },
    },
    "/api/payments/unpaid": {
      get: {
        tags: ["Payments"],
        summary: "Get list of students with pending dues",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Unpaid students list" } },
      },
    },
    "/api/payments/history/{studentId}": {
      get: {
        tags: ["Payments"],
        summary: "Get payment history for a student",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Payment ledger" } },
      },
    },
    "/api/payments/update/{id}": {
      put: {
        tags: ["Payments"],
        summary: "Update payment record",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Payment updated" } },
      },
    },
    "/api/payments/delete/{id}": {
      delete: {
        tags: ["Payments"],
        summary: "Delete payment record",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Payment deleted" } },
      },
    },

    // ── ASSIGNMENTS ──
    "/api/assignment/question": {
      post: {
        tags: ["Assignments"],
        summary: "Create assignment question (Admin)",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Assignment question created" } },
      },
    },
    "/api/assignment/question/list": {
      get: {
        tags: ["Assignments"],
        summary: "Get all assignment questions with batch and course filters",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "courseId", in: "query", schema: { type: "integer" } },
          { name: "batch_no", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Questions array" } },
      },
    },
    "/api/assignment/answer": {
      post: {
        tags: ["Assignments"],
        summary: "Submit student assignment solution",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Answer submitted" } },
      },
      get: {
        tags: ["Assignments"],
        summary: "Get single submission by student and assignment ID",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "assignmentId", in: "query", schema: { type: "integer" } },
          { name: "studentId", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Submission details" } },
      },
    },
    "/api/assignment/review/assignment/{assignmentId}": {
      put: {
        tags: ["Assignments"],
        summary: "Grade and review assignment submission (Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "assignmentId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Review saved and email/notification sent" } },
      },
    },
    "/api/assignment/summary": {
      get: {
        tags: ["Assignments"],
        summary: "Get aggregate assignment completion and grading statistics",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Assignment metrics" } },
      },
    },

    // ── EXAMS ──
    "/api/exam/config": {
      get: {
        tags: ["Exams"],
        summary: "Get all exam configurations (Admin)",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Exam configurations list" } },
      },
      post: {
        tags: ["Exams"],
        summary: "Create new exam configuration (Admin)",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Exam configuration created" } },
      },
    },
    "/api/exam/student/active": {
      get: {
        tags: ["Exams"],
        summary: "Get active available exams for logged-in student's course/batch",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Active exams list" } },
      },
    },
    "/api/exam/student/{examId}": {
      get: {
        tags: ["Exams"],
        summary: "Get exam questions for student taking the exam",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "examId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Exam questions (without hints/answers)" } },
      },
    },
    "/api/exam/student/{examId}/submit": {
      post: {
        tags: ["Exams"],
        summary: "Submit student exam answers",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "examId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Exam submitted successfully" } },
      },
    },
    "/api/exam/student/{examId}/result": {
      get: {
        tags: ["Exams"],
        summary: "Get student's exam score and feedback",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "examId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Exam results" } },
      },
    },
    "/api/exam/evaluate/{examId}/{studentId}": {
      get: {
        tags: ["Exams"],
        summary: "Get student exam submission for instructor evaluation",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "examId", in: "path", required: true, schema: { type: "integer" } },
          { name: "studentId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Submission answers and evaluation status" } },
      },
      put: {
        tags: ["Exams"],
        summary: "Manually evaluate and score student exam submission",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "examId", in: "path", required: true, schema: { type: "integer" } },
          { name: "studentId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Evaluation saved" } },
      },
    },
    "/api/exam/ai-evaluate/{examId}/{studentId}": {
      post: {
        tags: ["Exams"],
        summary: "Trigger AI evaluation for a specific exam question",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "examId", in: "path", required: true, schema: { type: "integer" } },
          { name: "studentId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "AI scoring and feedback analysis" } },
      },
    },
    "/api/exam/ai-evaluate-all/{examId}/{studentId}": {
      post: {
        tags: ["Exams"],
        summary: "Trigger automated AI evaluation for all questions in an exam submission",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "examId", in: "path", required: true, schema: { type: "integer" } },
          { name: "studentId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Complete AI evaluation for all answers" } },
      },
    },

    // ── MCQ & QUIZZES ──
    "/api/mcq": {
      get: {
        tags: ["MCQ & Quiz"],
        summary: "Get MCQ questions",
        responses: { 200: { description: "MCQ list" } },
      },
      post: {
        tags: ["MCQ & Quiz"],
        summary: "Create MCQ question",
        responses: { 201: { description: "MCQ question created" } },
      },
    },
    "/api/mcq-config": {
      get: {
        tags: ["MCQ & Quiz"],
        summary: "Get MCQ quiz configurations",
        responses: { 200: { description: "Configurations list" } },
      },
      post: {
        tags: ["MCQ & Quiz"],
        summary: "Create MCQ configuration",
        responses: { 201: { description: "MCQ config created" } },
      },
    },

    // ── BOOKS & TOPICS ──
    "/api/books": {
      get: {
        tags: ["Books & Topics"],
        summary: "Get all published interactive books",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Published books list" } },
      },
      post: {
        tags: ["Books & Topics"],
        summary: "Create a new book (Admin)",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Book created" } },
      },
    },
    "/api/books/admin": {
      get: {
        tags: ["Books & Topics"],
        summary: "Get all books with chapters and stats (Admin)",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Admin book catalog" } },
      },
    },
    "/api/books/topics/{id}/content": {
      get: {
        tags: ["Books & Topics"],
        summary: "Get content for a specific unlocked topic",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Topic markdown/rich text content" }, 403: { description: "Topic locked" } },
      },
    },
    "/api/books/access/unlock": {
      post: {
        tags: ["Books & Topics"],
        summary: "Unlock chapters/topics for an entire batch (Admin)",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Batch access granted" } },
      },
    },
    "/api/books/access/unlock-students": {
      post: {
        tags: ["Books & Topics"],
        summary: "Unlock chapters/topics for individual students (Admin)",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Student access granted" } },
      },
    },

    // ── JOBS & RESUME EVALUATION ──
    "/api/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "Get all active job postings",
        responses: { 200: { description: "Job postings array" } },
      },
      post: {
        tags: ["Jobs"],
        summary: "Create job posting (Admin)",
        responses: { 201: { description: "Job posted" } },
      },
    },
    "/api/jobs/{id}": {
      get: {
        tags: ["Jobs"],
        summary: "Get single job details by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Job details" } },
      },
    },
    "/api/resume/evaluate": {
      post: {
        tags: ["Resume & AI Evaluation"],
        summary: "Evaluate uploaded PDF resume against job description using AI",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  resume: { type: "string", format: "binary", description: "PDF Resume File" },
                  jobId: { type: "integer" },
                  jobDescription: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Resume match score, key strengths, and missing skills" } },
      },
    },

    // ── CHATBOT & AI VOICE ──
    "/api/chatbot/ask": {
      post: {
        tags: ["Chatbot & AI Voice"],
        summary: "Send query to 24/7 student support AI chatbot",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ChatbotRequest" } } },
        },
        responses: { 200: { description: "AI answer response" } },
      },
    },
    "/api/ai-voice/talk": {
      post: {
        tags: ["Chatbot & AI Voice"],
        summary: "Process AI voice interview / conversation exchange",
        responses: { 200: { description: "Voice response audio & transcript" } },
      },
    },

    // ── BLOGS & EVENTS ──
    "/api/blogs": {
      get: {
        tags: ["Blogs & Events"],
        summary: "Get community blog articles",
        responses: { 200: { description: "Blogs list" } },
      },
      post: {
        tags: ["Blogs & Events"],
        summary: "Create blog article",
        responses: { 201: { description: "Blog created" } },
      },
    },
    "/api/events": {
      get: {
        tags: ["Blogs & Events"],
        summary: "Get upcoming workshop and webinar events",
        responses: { 200: { description: "Events list" } },
      },
      post: {
        tags: ["Blogs & Events"],
        summary: "Create new event",
        responses: { 201: { description: "Event created" } },
      },
    },
    "/api/event-forms": {
      get: {
        tags: ["Blogs & Events"],
        summary: "Get custom event registration form definitions",
        responses: { 200: { description: "Form fields list" } },
      },
    },

    // ── NOTIFICATIONS ──
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get notification history for user",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Notifications array" } },
      },
      post: {
        tags: ["Notifications"],
        summary: "Broadcast notification to students",
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: "Notification dispatched" } },
      },
    },

    // ── TEAMS & REVIEWS ──
    "/api/teams": {
      get: {
        tags: ["Teams & Reviews"],
        summary: "Get instructor and team profiles",
        responses: { 200: { description: "Team members list" } },
      },
    },
    "/api/reviews": {
      get: {
        tags: ["Teams & Reviews"],
        summary: "Get approved student reviews and testimonials",
        responses: { 200: { description: "Reviews list" } },
      },
      post: {
        tags: ["Teams & Reviews"],
        summary: "Submit student review for approval",
        responses: { 201: { description: "Review submitted for moderation" } },
      },
    },

    // ── IMAGES & ASSETS ──
    "/api/images/upload": {
      post: {
        tags: ["Images & File Management"],
        summary: "Upload image file (multipart/form-data)",
        responses: { 200: { description: "Uploaded image URL" } },
      },
    },

    // ── GOOGLE DRIVE ──
    "/api/googledrive/access": {
      post: {
        tags: ["Google Drive"],
        summary: "Grant or verify student Google Drive course folder access permissions",
        responses: { 200: { description: "Drive access granted" } },
      },
    },
  },
};

module.exports = swaggerDocument;
