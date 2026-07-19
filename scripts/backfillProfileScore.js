// One-off backfill for TASK-33: computes profile_score for every existing student.
// Run manually after applying migrations/add_profile_score_to_students.sql:
//   node scripts/backfillProfileScore.js

const Student = require("../models/Student");
const { calculateProfileScore } = require("../utils/profileScoreHelper");

async function backfillProfileScores() {
    const students = await Student.findAll();
    console.log(`🔎 Found ${students.length} students to score.`);

    let updated = 0;
    for (const student of students) {
        const score = calculateProfileScore(student.toJSON());
        if (score !== student.profile_score) {
            await student.update({ profile_score: score });
            updated += 1;
        }
    }

    console.log(`✅ Backfill complete. ${updated}/${students.length} students updated.`);
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
