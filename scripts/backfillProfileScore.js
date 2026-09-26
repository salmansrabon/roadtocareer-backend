// One-off backfill for TASK-33: computes profile_score for every existing student.
// Also the repair tool for stored scores that drifted from the data (e.g. partial admin saves that
// were scored from only the fields in the request — fixed in studentController.updateStudent).
// Run manually after applying migrations/add_profile_score_to_students.sql:
//   node scripts/backfillProfileScore.js              (writes changed scores)
//   node scripts/backfillProfileScore.js --dry-run    (prints old -> new per student, writes nothing)
//
// students.updatedAt is `ON UPDATE CURRENT_TIMESTAMP` at the DB level and qa-talent orders by it, so
// the write sets `updatedAt = updatedAt` explicitly — otherwise a bulk run reshuffles qa-talent.

const sequelize = require("../config/db");
const Student = require("../models/Student");
const { calculateProfileScore } = require("../utils/profileScoreHelper");

const DRY_RUN = process.argv.includes("--dry-run");

async function backfillProfileScores() {
    const students = await Student.findAll();
    console.log(`🔎 Found ${students.length} students to score.${DRY_RUN ? " (DRY RUN — nothing will be written)" : ""}`);

    let updated = 0;
    for (const student of students) {
        const score = calculateProfileScore(student.toJSON());
        if (score !== student.profile_score) {
            if (DRY_RUN) {
                console.log(`${student.StudentId}: ${student.profile_score} -> ${score}`);
            } else {
                await Student.update(
                    { profile_score: score, updatedAt: sequelize.col("updatedAt") },
                    { where: { StudentId: student.StudentId }, silent: true }
                );
            }
            updated += 1;
        }
    }

    console.log(`✅ Backfill complete. ${updated}/${students.length} students ${DRY_RUN ? "would be updated" : "updated"}.`);
}

if (require.main === module) {
    backfillProfileScores()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ Profile score backfill failed:", error);
            process.exit(1);
        });
}

module.exports = { backfillProfileScores };
