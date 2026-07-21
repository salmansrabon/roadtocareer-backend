/**
 * Manual verification script for the weekly profile completion reminder job.
 * Run with: node tests/test-weekly-profile-reminder-job.js
 *
 * Safe by default: does NOT send real emails unless SEND_MAIL=true is set,
 * because emailHelper.js checks process.env.SEND_MAIL === "false" and
 * short-circuits (logs the email body, returns true) without calling the Gmail API.
 */
process.env.SEND_MAIL = process.env.SEND_MAIL || "false";

require("dotenv").config();
const { runWeeklyProfileReminderJob } = require("../cron/weeklyProfileReminderJob");

(async () => {
    console.log("Running weeklyProfileReminderJob manually with SEND_MAIL =", process.env.SEND_MAIL);
    await runWeeklyProfileReminderJob();
    console.log("Done. Exiting.");
    process.exit(0);
})();
