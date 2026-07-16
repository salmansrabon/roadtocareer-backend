const Student = require("../models/Student");
const Course = require("../models/Course");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment-timezone");
const { sendEmail } = require("../utils/emailHelper");
const { isTodayAClassDay, hasAttendedOnDate, getPreviousClassDay } = require("../utils/attendanceHelper");

const TIMEZONE = "Asia/Dhaka";

const buildMissedClassEmailBody = (studentName, previousDateStr, dateStr, courseTitle) => `Dear ${studentName},

We noticed you did not mark attendance for the last two ${courseTitle} classes, on ${previousDateStr} and today (${dateStr}).

Please make sure not to miss upcoming classes, as consistent attendance is important for your progress.

If you believe this is an error, please contact us.

Best regards,
Road to SDET Team
WhatsApp: +8801782808778`;

async function runAttendanceReminderJob() {
  console.log("⏰ [attendanceReminderJob] Starting daily missed-attendance email job...");
  const todayLocal = moment.tz(TIMEZONE);

  try {
    const courses = await Course.findAll({
      where: {
        is_enabled: true,
        [Op.and]: [
          Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("course_initial")), "sdet"),
        ],
      },
    });

    console.log(`[attendanceReminderJob] Found ${courses.length} enabled sdet course(s).`);

    for (const course of courses) {
      try {
        if (!isTodayAClassDay(course.class_days, todayLocal)) {
          console.log(`[attendanceReminderJob] Skipping ${course.courseId} — today is not a class day.`);
          continue;
        }

        const previousClassMoment = getPreviousClassDay(course.class_days, todayLocal);
        if (!previousClassMoment) {
          console.log(`[attendanceReminderJob] Skipping ${course.courseId} — no previous class day found within the lookback window.`);
          continue;
        }

        const students = await Student.findAll({
          where: { CourseId: course.courseId, isEnrolled: true },
          include: [
            { model: User, attributes: ["email", "isValid"] },
            { model: Attendance, required: false },
          ],
        });

        console.log(`[attendanceReminderJob] Course ${course.courseId}: ${students.length} enrolled student(s) to check.`);

        for (const student of students) {
          if (!student.User || student.User.isValid !== 1) continue;
          if (student.profession === "Job Holder") continue;

          const attendanceList = student.Attendance?.attendanceList;
          const attendedToday = hasAttendedOnDate(attendanceList, todayLocal);
          if (attendedToday) continue;

          const attendedPreviousClass = hasAttendedOnDate(attendanceList, previousClassMoment);
          if (attendedPreviousClass) continue; // only flag consecutive misses, not a single miss

          try {
            const dateStr = todayLocal.format("DD-MM-YYYY");
            const previousDateStr = previousClassMoment.format("DD-MM-YYYY");
            const subject = `You Missed the Last Two Classes - ${course.course_title}`;
            const body = buildMissedClassEmailBody(student.student_name, previousDateStr, dateStr, course.course_title);
            const sent = await sendEmail(student.email, subject, body);
            if (sent) {
              console.log(`[attendanceReminderJob] Reminder sent to ${student.email} (${student.StudentId}).`);
            } else {
              console.warn(`[attendanceReminderJob] sendEmail returned false for ${student.email}.`);
            }
          } catch (emailErr) {
            console.error(`[attendanceReminderJob] Failed sending to ${student.email}:`, emailErr);
          }
        }
      } catch (courseErr) {
        console.error(`[attendanceReminderJob] Error processing course ${course.courseId}:`, courseErr);
      }
    }

    console.log("✅ [attendanceReminderJob] Daily missed-attendance email job finished.");
  } catch (err) {
    console.error("❌ [attendanceReminderJob] Job failed with an unexpected error:", err);
  }
}

module.exports = { runAttendanceReminderJob };
