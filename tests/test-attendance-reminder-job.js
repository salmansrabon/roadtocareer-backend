/**
 * Manual verification script for the daily attendance reminder job.
 * Run with: node tests/test-attendance-reminder-job.js
 *
 * Safe by default: does NOT send real emails unless SEND_MAIL=true is set,
 * because emailHelper.js checks process.env.SEND_MAIL === "false" and
 * short-circuits (logs the email body, returns true) without calling the Gmail API.
 */
process.env.SEND_MAIL = process.env.SEND_MAIL || "false";

require("dotenv").config();
const { runAttendanceReminderJob } = require("../cron/attendanceReminderJob");

(async () => {
    console.log("Running attendanceReminderJob manually with SEND_MAIL =", process.env.SEND_MAIL);
    await runAttendanceReminderJob();
    console.log("Done. Exiting.");
    process.exit(0);
})();
