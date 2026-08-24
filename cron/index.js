const cron = require("node-cron");
const { runAttendanceReminderJob } = require("./attendanceReminderJob");
const { runExperienceRecalcJob } = require("./experienceRecalcJob");
const { runWeeklyProfileReminderJob } = require("./weeklyProfileReminderJob");
const { runNotificationPruneJob } = require("./notificationPruneJob");

async function registerCronJobs() {
  // 06:00 UTC == 12:00 Asia/Dhaka (process TZ pinned to UTC in server.js; Bangladesh has no DST).
  cron.schedule("0 6 1 * *", () => {
    runExperienceRecalcJob();
  });
  console.log("🕐 [cron] experienceRecalcJob scheduled @ 06:00 UTC (12:00 Asia/Dhaka) on day 1 of each month.");

  // 13:30 UTC == 19:30 Asia/Dhaka (process TZ pinned to UTC in server.js; Bangladesh has no DST).
  cron.schedule("30 13 * * 6", () => {
    runWeeklyProfileReminderJob();
  });
  console.log("🕐 [cron] weeklyProfileReminderJob scheduled @ 13:30 UTC (19:30 Asia/Dhaka) on Saturdays.");

  // Runs every day; runAttendanceReminderJob re-reads each course's class_days
  // live on every run and skips any course where today isn't a scheduled class
  // day. Deliberately NOT baking a day-of-week pattern into the cron trigger
  // itself (that was computed once from a boot-time snapshot of class_days, so
  // editing class_days afterward had no effect until the server restarted).
  // 17:30 UTC == 23:30 Asia/Dhaka (process TZ pinned to UTC in server.js)
  cron.schedule("30 17 * * *", () => {
    runAttendanceReminderJob();
  });
  console.log("🕐 [cron] attendanceReminderJob scheduled @ 17:30 UTC (23:30 Asia/Dhaka) daily — actual run days follow each course's live class_days.");

  // 20:00 UTC == 02:00 Asia/Dhaka (process TZ pinned to UTC in server.js; Bangladesh has no DST).
  cron.schedule("0 20 * * *", () => {
    runNotificationPruneJob();
  });
  console.log("🕐 [cron] notificationPruneJob scheduled @ 20:00 UTC (02:00 Asia/Dhaka) daily.");
}

module.exports = { registerCronJobs };
