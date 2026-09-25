// One-off backfill: students.company / students.designation were only ever set at enrollment, so
// for students who later edited their employment history they no longer match the employer marked
// "Currently Working Here" (or the latest job). Re-derives both from employment.company using the
// same selector the profile save now uses, and recomputes profile_score since it credits `company`.
// Preserves students.updatedAt — qa-talent orders by updatedAt DESC and a bulk backfill must not
// reshuffle it.
//
// Usage:
//   node scripts/backfillCurrentEmployer.js            (dry run — prints the diff, writes nothing)
//   node scripts/backfillCurrentEmployer.js --apply    (writes the changes)

const sequelize = require("../config/db");
const Student = require("../models/Student");
const { getCurrentOrLastEmployer } = require("../utils/employmentExperienceHelper");
const { calculateProfileScore } = require("../utils/profileScoreHelper");

const APPLY = process.argv.includes("--apply");

async function main() {
    console.log(APPLY ? "Running in APPLY mode — changes will be written.\n" : "Running in DRY-RUN mode — no changes will be written (pass --apply to write).\n");

    const students = await Student.findAll({
        where: sequelize.literal("employment IS NOT NULL AND JSON_LENGTH(JSON_EXTRACT(employment, '$.company')) > 0"),
    });
    console.log(`Found ${students.length} student(s) with employment history.`);

    let changed = 0;
    let failed = 0;

    for (const student of students) {
        try {
            const employer = getCurrentOrLastEmployer(student.employment?.company);
            const company = String(employer?.companyName ?? "").trim();
            if (company === "" || company === "N/A") continue; // same "no employer" rule as updateStudent

            const designation = String(employer.designation ?? "").trim();
            if (student.company === company && student.designation === designation) continue;

            const profile_score = calculateProfileScore({ ...student.toJSON(), company, designation });

            changed++;
            console.log(`\n${student.StudentId}:`);
            console.log(`  company:       ${JSON.stringify(student.company)} -> ${JSON.stringify(company)}`);
            console.log(`  designation:   ${JSON.stringify(student.designation)} -> ${JSON.stringify(designation)}`);
            console.log(`  profile_score: ${student.profile_score} -> ${profile_score}`);

            if (APPLY) {
                // updatedAt is `ON UPDATE CURRENT_TIMESTAMP` at the DB level, so neither `silent` nor
                // re-assigning the same JS value protects it (Sequelize drops an unchanged field from
                // the SET clause). Only an explicit `updatedAt = updatedAt` in the UPDATE keeps it.
                await Student.update(
                    { company, designation, profile_score, updatedAt: sequelize.col("updatedAt") },
                    { where: { StudentId: student.StudentId }, silent: true }
                );
            }
        } catch (err) {
            // Never let one student's failure abort the rest of the batch.
            failed++;
            console.error(`\n[backfillCurrentEmployer] Failed to process ${student.StudentId}:`, err.message);
        }
    }

    console.log(`\n${APPLY ? "" : "[DRY RUN] "}Done. ${changed} student(s) ${APPLY ? "updated" : "would be updated"}, ${failed} failed and were skipped.`);
}

main()
    .catch((err) => {
        console.error("Backfill failed:", err);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
