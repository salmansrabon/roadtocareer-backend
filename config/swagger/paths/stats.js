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
};
