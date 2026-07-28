// One-off backfill: converts attendance.attendanceList from a flat array of entries to
// an object keyed by courseId, so each batch's attendance survives a batch migration.
// A pre-existing flat array is attributed to the row's own courseId — the only course
// those entries could have been recorded under.
//   node scripts/backfillAttendanceBatches.js

const Attendance = require("../models/Attendance");
const { parseAttendanceByBatch } = require("../utils/attendanceHelper");

async function backfillAttendanceBatches() {
    const rows = await Attendance.findAll();
    console.log(`🔎 Found ${rows.length} attendance rows to inspect.`);

    let converted = 0;
    let alreadyStructured = 0;
    let empty = 0;
    let skippedNoCourseId = 0;

    for (const row of rows) {
        if (!row.attendanceList) {
            empty += 1;
            continue;
        }

        let parsed;
        try {
            parsed = JSON.parse(row.attendanceList);
            if (typeof parsed === "string") parsed = JSON.parse(parsed);
        } catch {
            parsed = null;
        }

        if (!Array.isArray(parsed)) {
            alreadyStructured += 1;
            continue;
        }

        if (!row.courseId) {
            console.warn(`⚠️ Skipping ${row.StudentId} — flat array but no courseId to key it under.`);
            skippedNoCourseId += 1;
            continue;
        }

        const byBatch = parseAttendanceByBatch(row.attendanceList, row.courseId);
        await row.update({ attendanceList: JSON.stringify(byBatch) });
        converted += 1;
    }

    console.log(
        `✅ Backfill complete. ${converted} converted, ${alreadyStructured} already structured, ${empty} empty, ${skippedNoCourseId} skipped.`
    );
}

if (require.main === module) {
    backfillAttendanceBatches()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ Attendance batch backfill failed:", error);
            process.exit(1);
        });
}

module.exports = { backfillAttendanceBatches };
