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
 * ✅ Public: companies (with an admin-uploaded logo) where our students work, for the landing
 * "Where Our Students Work" strip. Name + logo + headcount only — no student data.
 *
 *  - Logos live in students.employment.company[].companyLogo (set by admin/teacher from the
 *    student's Employment History modal). One uploaded logo per company is enough: entries are
 *    matched across students by companyKey, the same normalisation the hero count uses.
 *  - Headcount = active students (users.isValid = 1 AND students.isEnrolled = 1) whose flat
 *    students.company (auto-synced current/last employer) maps to that key. It only ranks the
 *    companies; a company with a logo but no active student is still listed, last.
 *  - Display name = the spelling most active students typed, else the logo entry's own name.
 *  - Each company is listed once: entries that share the same logo file are merged.
 *
 * @route GET /api/stats/company-logos?limit=10
 */
exports.getCompanyLogos = async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);

        const logoRows = await sequelize.query(
            `SELECT employment FROM students
              WHERE JSON_CONTAINS_PATH(employment, 'one', '$.company[*].companyLogo')
              ORDER BY updatedAt DESC`,
            { type: QueryTypes.SELECT }
        );

        // key -> { logo, name } (newest student's entry wins when several carry a logo)
        const logos = new Map();
        logoRows.forEach(({ employment }) => {
            const parsed = typeof employment === "string" ? JSON.parse(employment) : employment;
            (parsed?.company || []).forEach((entry) => {
                const logo = typeof entry?.companyLogo === "string" ? entry.companyLogo.trim() : "";
                const name = String(entry?.companyName ?? "").trim();
                const key = companyKey(name);
                if (!logo || !name || !key || NOT_A_COMPANY.has(key) || logos.has(key)) return;
                logos.set(key, { logo, name });
            });
        });

        if (logos.size === 0) {
            return res.status(200).json({ success: true, companies: [] });
        }

        const activeRows = await sequelize.query(
            `SELECT TRIM(s.company) AS company, COUNT(*) AS total
               FROM students s
               JOIN users u ON u.username = s.StudentId
              WHERE u.isValid = 1
                AND s.isEnrolled = 1
                AND s.company IS NOT NULL
                AND TRIM(s.company) <> ''
              GROUP BY TRIM(s.company)`,
            { type: QueryTypes.SELECT }
        );

        // key -> { count, spellings: Map(rawName -> total) }
        const counts = new Map();
        activeRows.forEach(({ company, total }) => {
            const key = companyKey(company);
            if (!logos.has(key)) return;
            const entry = counts.get(key) || { count: 0, spellings: new Map() };
            entry.count += Number(total);
            entry.spellings.set(company, (entry.spellings.get(company) || 0) + Number(total));
            counts.set(key, entry);
        });

        const perKey = [...logos.entries()].map(([key, { logo, name }]) => {
            const seen = counts.get(key);
            const topSpelling = seen
                ? [...seen.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0]
                : name;
            return { name: topSpelling, logo, count: seen ? seen.count : 0 };
        });

        // Each company shows once: spellings the key normalisation can't unify
        // ("Brain Station" / "Brain Station 23") collapse when they share one logo file.
        // The bigger spelling keeps the name; headcounts add up.
        const byLogo = new Map();
        perKey.forEach((c) => {
            const existing = byLogo.get(c.logo);
            if (!existing) return byLogo.set(c.logo, { ...c });
            if (c.count > existing.count) existing.name = c.name;
            existing.count += c.count;
        });

        const companies = [...byLogo.values()]
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
            .slice(0, limit);

        return res.status(200).json({ success: true, companies });
    } catch (error) {
        console.error("Error fetching company logos:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

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
