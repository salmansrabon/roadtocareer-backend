// One-off migration for TASK-34: backfills fromMonth/fromYear/toMonth/toYear/currentlyWorking
// onto legacy employment.company records by parsing their free-text `employmentDuration` string
// (e.g. "July 2021-Continue", "June 2015-March 2019"). Only ADDS the new fields — experience,
// employmentDuration and totalExperience are left exactly as they are today; the monthly
// experienceRecalcJob cron (or the student's next profile save) refreshes those from the new
// fields afterwards. Records whose employmentDuration doesn't cleanly match a known pattern are
// left completely untouched — never guessed at.
//
// Usage:
//   node scripts/backfillEmploymentDates.js            (dry run — prints the diff, writes nothing)
//   node scripts/backfillEmploymentDates.js --apply    (writes the changes)

const sequelize = require("../config/db");
const Student = require("../models/Student");

const APPLY = process.argv.includes("--apply");

const MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
];
const MONTH_ABBR = MONTH_NAMES.map((m) => m.slice(0, 3));
const ONGOING_KEYWORDS = ["present", "current", "continue", "ongoing", "now", "till date", "to date"];

function parseMonthToken(token) {
    const clean = token.trim().toLowerCase();
    let idx = MONTH_NAMES.indexOf(clean);
    if (idx === -1) idx = MONTH_ABBR.indexOf(clean);
    return idx === -1 ? null : idx + 1;
}

// Matches "<Month name or abbreviation> <4-digit year>", e.g. "July 2022", "Jan 2023".
function parseMonthYearToken(text) {
    const match = text.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (!match) return null;
    const month = parseMonthToken(match[1]);
    const year = Number(match[2]);
    if (!month || !Number.isInteger(year) || year < 1950 || year > 2100) return null;
    return { month, year };
}

function parseEmploymentDuration(employmentDuration) {
    if (typeof employmentDuration !== "string" || !employmentDuration.trim()) return null;

    const normalized = employmentDuration.replace(/[‒-―]/g, "-").trim(); // en/em dash -> hyphen
    const dashIndex = normalized.indexOf("-");
    if (dashIndex === -1) return null;

    const from = parseMonthYearToken(normalized.slice(0, dashIndex));
    if (!from) return null;

    const rightRaw = normalized.slice(dashIndex + 1).trim().replace(/\.$/, "");
    if (ONGOING_KEYWORDS.includes(rightRaw.toLowerCase())) {
        return { fromMonth: from.month, fromYear: from.year, toMonth: "", toYear: "", currentlyWorking: true };
    }

    const to = parseMonthYearToken(rightRaw);
    if (!to) return null;

    const totalMonths = (to.year - from.year) * 12 + (to.month - from.month);
    if (totalMonths < 0) return null;

    return { fromMonth: from.month, fromYear: from.year, toMonth: to.month, toYear: to.year, currentlyWorking: false };
}

async function main() {
    console.log(APPLY ? "Running in APPLY mode — changes will be written.\n" : "Running in DRY-RUN mode — no changes will be written (pass --apply to write).\n");

    const students = await Student.findAll({
        where: sequelize.literal("employment IS NOT NULL AND JSON_LENGTH(JSON_EXTRACT(employment, '$.company')) > 0"),
    });

    console.log(`Found ${students.length} student(s) with employment history.`);

    let studentsChanged = 0;
    let studentsFailed = 0;
    let recordsBackfilled = 0;
    let recordsSkipped = 0;

    for (const student of students) {
        try {
            const employment = student.employment;
            if (!employment || !Array.isArray(employment.company)) continue;

            let changed = false;
            const before = employment.company;
            const company = before.map((entry) => {
                try {
                    if (entry?.fromMonth || entry?.fromYear) return entry; // already has the new structure

                    const parsed = parseEmploymentDuration(entry?.employmentDuration);
                    if (!parsed) {
                        recordsSkipped++;
                        return entry;
                    }

                    recordsBackfilled++;
                    changed = true;
                    return { ...entry, ...parsed };
                } catch (recordErr) {
                    // Never let one malformed record skip the rest of this student's employment history.
                    recordsSkipped++;
                    console.error(`[backfillEmploymentDates] ${student.StudentId}: skipping one unreadable employment record —`, recordErr.message);
                    return entry;
                }
            });

            if (!changed) continue;
            studentsChanged++;

            console.log(`\n${student.StudentId}:`);
            console.log("  before:", JSON.stringify(before));
            console.log("  after: ", JSON.stringify(company));

            if (APPLY) {
                await student.update({ employment: { ...employment, company } });
            }
        } catch (studentErr) {
            // Never let one student's failure abort the rest of the batch.
            studentsFailed++;
            console.error(`\n[backfillEmploymentDates] Failed to process ${student.StudentId}:`, studentErr.message);
        }
    }

    console.log(`\n${APPLY ? "" : "[DRY RUN] "}Done. ${studentsChanged} student(s) ${APPLY ? "updated" : "would be updated"}, ${recordsBackfilled} record(s) ${APPLY ? "backfilled" : "would be backfilled"}, ${recordsSkipped} record(s) left as-is (unparseable or already migrated), ${studentsFailed} student(s) failed and were skipped.`);
}

main()
    .catch((err) => {
        console.error("Migration failed:", err);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
