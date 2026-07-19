const Student = require("../models/Student");
const User = require("../models/User");
const { recalculateEmployment } = require("../utils/employmentExperienceHelper");

async function runExperienceRecalcJob() {
  console.log("⏰ [experienceRecalcJob] Starting monthly employment experience recalculation...");
  let checked = 0;
  let updated = 0;
  let failed = 0;
  let studentsWithInvalidRecords = 0;

  try {
    const students = await Student.findAll({
      where: { isEnrolled: true },
      include: [{ model: User, attributes: ["isValid"] }],
    });

    console.log(`[experienceRecalcJob] Found ${students.length} enrolled student(s) to check.`);

    for (const student of students) {
      if (!student.User || student.User.isValid !== 1) continue;
      checked++;

      try {
        const { employment: recalculated, invalidRecordCount } = recalculateEmployment(student.employment);

        if (invalidRecordCount > 0) {
          studentsWithInvalidRecords++;
          console.warn(`[experienceRecalcJob] ${student.StudentId}: ${invalidRecordCount} employment record(s) have corrupted/unparseable dates — left unchanged and excluded from Total Experience.`);
        }

        if (!recalculated) continue;

        await student.update({ employment: recalculated });
        updated++;
      } catch (studentErr) {
        failed++;
        console.error(`[experienceRecalcJob] Failed to recalculate for ${student.StudentId}:`, studentErr);
      }
    }

    console.log(`✅ [experienceRecalcJob] Finished. Checked ${checked} valid enrolled student(s), updated ${updated}, failed ${failed}, ${studentsWithInvalidRecords} with corrupted record(s) flagged.`);
  } catch (err) {
    console.error("❌ [experienceRecalcJob] Job failed with an unexpected error:", err);
  }
}

module.exports = { runExperienceRecalcJob };
