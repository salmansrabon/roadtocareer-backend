const cron = require("node-cron");
const { Op, Sequelize } = require("sequelize");
const Course = require("../models/Course");
const { runAttendanceReminderJob } = require("./attendanceReminderJob");
const { runExperienceRecalcJob } = require("./experienceRecalcJob");

const CRON_DOW = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

async function registerCronJobs() {
  // 06:00 UTC == 12:00 Asia/Dhaka (process TZ pinned to UTC in server.js; Bangladesh has no DST).
  // Registered before the attendance job's course lookup below so its own early return
  // (no qualifying class_days) can never accidentally skip this unrelated job.
  cron.schedule("0 6 1 * *", () => {
    runExperienceRecalcJob();
  });
  console.log("🕐 [cron] experienceRecalcJob scheduled @ 06:00 UTC (12:00 Asia/Dhaka) on day 1 of each month.");

  const courses = await Course.findAll({
    where: {
      is_enabled: true,
      [Op.and]: [
        Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("course_initial")), "sdet"),
      ],
    },
  });

  // Union of weekdays across all qualifying courses' class_days, parsed defensively
  const dowSet = new Set();
  for (const course of courses) {
    let days = course.class_days;
    if (typeof days === "string") {
      try {
        days = JSON.parse(days);
      } catch {
        days = [];
      }
    }
    if (!Array.isArray(days)) days = [];
    days.forEach((d) => {
      if (d in CRON_DOW) dowSet.add(CRON_DOW[d]);
    });
  }

  if (dowSet.size === 0) {
    console.log("🕐 [cron] No qualifying sdet course class_days found — attendanceReminderJob not scheduled.");
    return;
  }

  const dowExpr = [...dowSet].sort().join(",");
  // 17:59 UTC == 23:59 Asia/Dhaka (process TZ pinned to UTC in server.js)
  cron.schedule(`59 17 * * ${dowExpr}`, () => {
    runAttendanceReminderJob();
  });
  console.log(`🕐 [cron] attendanceReminderJob scheduled @ 17:59 UTC (23:59 Asia/Dhaka) on day-of-week [${dowExpr}]`);
}

module.exports = { registerCronJobs };
