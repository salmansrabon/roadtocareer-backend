const Student = require("../models/Student");
const Course = require("../models/Course");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Event = require("../models/Event");
const moment = require("moment-timezone");
const { sendEmail, sendEmailWithAttachment } = require("../utils/emailHelper");
const { isTodayAClassDay, hasAttendedOnDate, getPreviousClassDay } = require("../utils/attendanceHelper");

const TIMEZONE = "Asia/Dhaka";

const escapeCSV = (value) => {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildMissedClassEmailBody = (studentName, previousDateStr, dateStr, courseTitle) => `Dear ${studentName},

We noticed you did not mark attendance for the last two ${courseTitle} classes, on ${previousDateStr} and today (${dateStr}).

Please make sure not to miss upcoming classes, as consistent attendance is important for your progress.

If you believe this is an error, please contact us.

Best regards,
Road to SDET Team
WhatsApp: +8801782808778`;

async function sendAdminAbsentListSummary(todayLocal, mailedStudents) {
  if (mailedStudents.length === 0) {
    console.log("[attendanceReminderJob] No students were mailed today — skipping admin summary.");
    return;
  }

  try {
    const admins = await User.findAll({
      where: { role: "admin" },
      attributes: ["email"],
    });

    if (admins.length === 0) {
      console.log("[attendanceReminderJob] No admin users found — skipping admin summary.");
      return;
    }

    const dateStr = todayLocal.format("DD-MM-YYYY");
    const headers = ["Batch No", "Student Name", "Email", "Profession", "isMigrated"];
    const csvRows = [headers.map(escapeCSV).join(",")];
    mailedStudents.forEach((s) => {
      csvRows.push(
        [s.batch_no, s.studentName, s.email, s.profession, s.isMigrated].map(escapeCSV).join(",")
      );
    });
    const csvContent = csvRows.join("\n");
    const filename = `${dateStr}-absent-students-list.csv`;

    const toAddresses = admins.map((a) => a.email).join(", ");
    const subject = `Absent Students List - ${dateStr}`;
    const body = `Hi,\n\n${mailedStudents.length} student(s) were emailed today (${dateStr}) for missing two consecutive classes.\n\nThe full list is attached as a CSV.\n\nBest regards,\nRoad to SDET Team`;

    const sent = await sendEmailWithAttachment(toAddresses, subject, body, {
      filename,
      content: csvContent,
      mimeType: "text/csv",
    });

    if (sent) {
      console.log(`[attendanceReminderJob] Admin summary (${filename}) sent to ${toAddresses}.`);
    } else {
      console.warn(`[attendanceReminderJob] sendEmailWithAttachment returned false for admin summary.`);
    }

    await Event.create({
      event_title: "Absent Students List",
      event_description: {
        absentStudentCount: mailedStudents.length,
        // Stored as an already-formatted Dhaka wall-clock string (not left to
        // createdAt + a client-side timezone conversion) because MySQL's
        // TIMESTAMP session-timezone conversion and mysql2/Sequelize's own
        // timezone assumptions don't agree on this server, which silently
        // shifts createdAt by several hours when read back.
        triggeredAtDhaka: todayLocal.format("MMM DD, YYYY, hh:mm A"),
        students: mailedStudents,
      },
      createdAt: todayLocal.toDate(),
    });
    console.log(`[attendanceReminderJob] Logged "Absent Students List" event with ${mailedStudents.length} student(s).`);
  } catch (err) {
    console.error("[attendanceReminderJob] Failed to send admin summary:", err);
  }
}

async function runAttendanceReminderJob() {
  console.log("⏰ [attendanceReminderJob] Starting daily missed-attendance email job...");
  const todayLocal = moment.tz(TIMEZONE);
  const mailedStudents = [];

  try {
    const courses = await Course.findAll({
      where: { is_latest: true },
    });

    console.log(`[attendanceReminderJob] Found ${courses.length} course(s) flagged is_latest.`);

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
              mailedStudents.push({
                StudentId: student.StudentId,
                batch_no: student.batch_no,
                studentName: student.student_name,
                email: student.email,
                profession: student.profession,
                isMigrated: student.isMigrated,
              });
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

    await sendAdminAbsentListSummary(todayLocal, mailedStudents);

    console.log("✅ [attendanceReminderJob] Daily missed-attendance email job finished.");
  } catch (err) {
    console.error("❌ [attendanceReminderJob] Job failed with an unexpected error:", err);
  }
}

module.exports = { runAttendanceReminderJob };
