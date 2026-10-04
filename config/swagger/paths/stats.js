/**
 * Stats endpoints.
 */

const { jsonRes, errResSuccess } = require("../helpers");

module.exports = {
  "/api/stats/landing": {
    get: {
      tags: ["Stats"],
      summary: "Public aggregate numbers for the landing-page hero",
      description:
        "Counts only, no student data. totalStudents = all student rows; hiringCompanies = distinct companies " +
        "across active students (users.isValid = 1 and students.isEnrolled = 1) after normalising spelling variants " +
        "(imperfect — treat as approximate); batchesCompleted = latest `sdet…` " +
        "batch number minus 1.",
      responses: {
        200: jsonRes("Landing stats", {
          success: true,
          stats: { totalStudents: 1117, hiringCompanies: 216, batchesCompleted: 18 },
        }),
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
  "/api/stats/company-logos": {
    get: {
      tags: ["Stats"],
      summary: "Companies with a logo where our students work (landing page)",
      description:
        "Public. Company name, logo URL and headcount only, no student data. Logos come from " +
        "students.employment.company[].companyLogo, which only admin/teacher can set (PUT /api/students/{studentId} " +
        "ignores the field for any other caller and keeps the stored one). Companies are matched across students " +
        "after normalising spelling variants; `count` = active students (users.isValid = 1 and " +
        "students.isEnrolled = 1) at that company and only ranks the list (highest first).",
      parameters: [
        { name: "limit", in: "query", required: false, schema: { type: "integer", default: 10, minimum: 1, maximum: 30 } },
      ],
      responses: {
        200: jsonRes("Companies with a logo", {
          success: true,
          companies: [{ name: "Brain Station 23", logo: "/images/company-logos/1759500000000-brain-station.png", count: 12 }],
        }),
        500: errResSuccess("Unexpected server error", "Internal Server Error"),
      },
    },
  },
};
