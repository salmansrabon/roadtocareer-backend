/**
 * QA Talent Discovery endpoints.
 */

const { jsonRes, SERVER_ERROR } = require("../helpers");

module.exports = {
  "/api/students/public-list": {
    get: {
      tags: ["QA Talent Discovery"],
      summary: "List public QA talent profiles with privacy filtering",
      description:
        "Default listing is gated on `profile_score >= 70` AND `lookingForJob = Yes`. Contact fields are stripped unless the student marked them public.",
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
      ],
      responses: {
        200: jsonRes("Public talent list, ordered by profile_score DESC", {
          totalStudents: 42,
          totalPages: 3,
          currentPage: 1,
          students: [
            {
              StudentId: "RTS-JAD-2601",
              student_name: "Jane Doe",
              photo: "/images/students/RTS-JAD-2601.jpg",
              university: "University of Dhaka",
              designation: "Junior QA Engineer",
              company: "Tech Corp",
              experience: "2",
              skill: ["Selenium", "Playwright", "Java"],
              isISTQBCertified: true,
              lookingForJob: "Yes",
              profile_score: 86,
              linkedin: "https://linkedin.com/in/janedoe",
              github: "https://github.com/janedoe",
              email: "jane.doe@example.com",
              mobile: null,
            },
          ],
        }),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/students/search-talent": {
    get: {
      tags: ["QA Talent Discovery"],
      summary: "Filter talent by skills, experience, certifications, and availability",
      description:
        "Same visibility gate as the default listing: only enrolled students with `profile_score >= 70` AND `lookingForJob = Yes` are ever returned, whatever the filters (a `lookingForJob` param cannot override it). All filters are AND-ed, so each one narrows the result.",
      parameters: [
        {
          name: "searchTerm",
          in: "query",
          schema: { type: "string" },
          description:
            "Free text, split into words; every word must match the name, profession, designation, company, university, a skill, or an employment-history job title/company (case-insensitive). Email is not searched.",
        },
        {
          name: "skills",
          in: "query",
          schema: { type: "string" },
          description:
            "Comma separated skills (e.g. Selenium, Cypress, Playwright). The student must have ALL of them; each is an exact, case-insensitive match (`Java` does not match `JavaScript`).",
        },
        { name: "experience", in: "query", schema: { type: "number", example: 2 }, description: "Minimum years" },
        { name: "maxExperience", in: "query", schema: { type: "number", example: 5 }, description: "Maximum years" },
        { name: "verified", in: "query", schema: { type: "string", enum: ["Yes", "No"] } },
        { name: "university", in: "query", schema: { type: "string" } },
        { name: "company", in: "query", schema: { type: "string" } },
        { name: "isISTQBCertified", in: "query", schema: { type: "boolean" } },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
      ],
      responses: {
        200: jsonRes("Filtered talent list (same visibility gate as the default listing)", {
          totalStudents: 8,
          totalPages: 1,
          currentPage: 1,
          students: [
            {
              StudentId: "RTS-JAD-2601",
              student_name: "Jane Doe",
              photo: "/images/students/RTS-JAD-2601.jpg",
              university: "University of Dhaka",
              company: "Tech Corp",
              designation: "Junior QA Engineer",
              experience: "2",
              skill: ["Selenium", "Playwright", "Java"],
              isISTQBCertified: true,
              profile_score: 86,
            },
          ],
        }),
        500: SERVER_ERROR,
      },
    },
  },
  "/api/students/ai-search": {
    post: {
      tags: ["QA Talent Discovery"],
      summary: "AI-powered natural language talent search",
      description:
        "Understands developer, QA and SDET requests. Results (including the near-match fallback) are limited to the same visibility gate as the default listing: enrolled, `profile_score >= 70`, `lookingForJob = Yes`.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/AISearchRequest" } } },
      },
      responses: {
        200: jsonRes(
          "Ranked candidates matched against the prompt. When nothing matches exactly, `isFallbackSearch: true` is added and near-matches are returned.",
          {
            totalStudents: 3,
            students: [
              {
                StudentId: "RTS-JAD-2601",
                student_name: "Jane Doe",
                experience: "2",
                skill: ["Playwright", "Selenium", "Jenkins"],
                company: "Tech Corp",
                designation: "Junior QA Engineer",
                address: "Mirpur DOHS, Dhaka",
                profile_score: 86,
              },
            ],
            searchParams: {
              skills: ["Playwright", "CI/CD"],
              minExperience: 2,
              location: "Dhaka",
              findBest: true,
            },
            originalQuery:
              "Find QA engineers with 2+ years of Playwright and CI/CD experience in Dhaka",
            requestedCount: null,
            aiMessage: "Here are the top results based on your query.",
          }
        ),
        400: jsonRes("Query missing or off-topic", {
          error: "Please query about searching qa talent",
          aiMessage: "Please query about searching qa talent",
        }),
        500: jsonRes("AI call failed", {
          error: "AI search failed. Please try again or use manual filters.",
          details: "Request failed with status code 429",
        }),
      },
    },
  },
  "/api/students/send-contact-email": {
    post: {
      tags: ["QA Talent Discovery"],
      summary: "Send recruiter inquiry email to a candidate",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["studentId", "subject", "body"],
              properties: {
                studentId: { type: "string", example: "RTS-JAD-2601" },
                subject: { type: "string", example: "SDET opening at Cefalo" },
                body: {
                  type: "string",
                  example: "Hi Jane, we saw your profile on the QA Talent portal and would love to talk.",
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Contact email dispatched", {
          message: "Email sent successfully!",
          studentName: "Jane Doe",
        }),
        400: jsonRes("Missing fields or candidate has no email", {
          error: "Student ID, subject, and message body are required.",
        }),
        404: jsonRes("Student not found", { error: "Student not found." }),
        500: jsonRes("Mail delivery failed", {
          error: "Failed to send email. Please try again.",
        }),
      },
    },
  },
};
