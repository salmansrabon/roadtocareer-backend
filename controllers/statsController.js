const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");

// Company names are free text ("Bjit limited" / "BJIT", "TheySaid.io" / "TheySaid"),
// so we reduce each to a comparison key before counting. Words that only
// describe the legal form or location of a company are dropped.
const COMPANY_NOISE_WORDS = new Set([
    "ltd", "limited", "pvt", "private", "inc", "incorporated", "llc", "co", "company", "corp",
    "corporation", "plc", "bd", "bangladesh", "dhaka", "technologies", "technology", "tech",
    "solutions", "solution", "software", "softwares", "systems", "system", "services", "service",
    "it", "infotech", "group", "global", "international", "labs", "lab", "digital", "the", "and",
    "of", "com", "io", "ai", "net", "org",
]);
// Answers that are not an employer.
const NOT_A_COMPANY = new Set([
    "", "notapplicable", "unemployed", "na", "none", "nil", "null", "freelancer", "self", "selfemployed",
]);

const companyKey = (name) =>
    String(name)
        .toLowerCase()
        .replace(/\(.*?\)/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w && !COMPANY_NOISE_WORDS.has(w))
        .join("")
        .replace(/(ltd|limited|inc|llc|pvt)+$/, ""); // suffix glued on, e.g. "FintechHubLtd"

/**
 * ✅ Public aggregate numbers for the landing-page hero. Counts only — no
 * student data leaves this endpoint.
 *
 * "Active" student = users.isValid = 1 AND students.isEnrolled = 1, the same
 * pair the notification code treats as a real, current student.
 *
 *  - totalStudents:   every student row ever registered
 *  - hiringCompanies: distinct companies across active students after
 *                     normalising spelling variants (see companyKey). Matching
 *                     free text is imperfect — some variants still count twice,
 *                     so the frontend rounds this DOWN to a coarse "N+" figure.
 *  - batchesCompleted: latest `sdet…` batch minus 1 (the newest batch is the
 *                     one still running). `psdet…` advanced courses are
 *                     excluded by the LIKE prefix.
 *
 * @route GET /api/stats/landing
 */
exports.getLandingStats = async (req, res) => {
    try {
        const [row] = await sequelize.query(
            `SELECT
                (SELECT COUNT(DISTINCT StudentId) FROM students) AS totalStudents,
                (SELECT MAX(CAST(batch_no AS UNSIGNED))
                   FROM courses
                  WHERE courseId LIKE 'sdet%') AS latestSdetBatch`,
            { type: QueryTypes.SELECT }
        );

        const companyRows = await sequelize.query(
            `SELECT DISTINCT TRIM(s.company) AS company
               FROM students s
               JOIN users u ON u.username = s.StudentId
              WHERE u.isValid = 1
                AND s.isEnrolled = 1
                AND s.company IS NOT NULL
                AND TRIM(s.company) <> ''`,
            { type: QueryTypes.SELECT }
        );
        const companyKeys = new Set(companyRows.map((r) => companyKey(r.company)));
        NOT_A_COMPANY.forEach((k) => companyKeys.delete(k));

        const latestSdetBatch = Number(row.latestSdetBatch) || 0;

        return res.status(200).json({
            success: true,
            stats: {
                totalStudents: Number(row.totalStudents) || 0,
                hiringCompanies: companyKeys.size,
                batchesCompleted: Math.max(0, latestSdetBatch - 1),
            },
        });
    } catch (error) {
        console.error("Error fetching landing stats:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
