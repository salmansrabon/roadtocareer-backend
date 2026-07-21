const { Op } = require("sequelize");
const moment = require("moment-timezone");
const Student = require("../models/Student");
const User = require("../models/User");
const { sendEmailWithAttachment } = require("../utils/emailHelper");
const { enqueueEmail } = require("../utils/emailQueue");

const TIMEZONE = "Asia/Dhaka";
const PROFILE_SCORE_THRESHOLD = 80;

let isJobRunning = false;

const escapeCSV = (value) => {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildReminderEmailBody = (studentName, profileScore) => `Dear ${studentName},

We noticed that your Road to SDET profile is currently ${profileScore}% complete.

Please update your profile and increase your profile completion score to at least 80%.

To improve your profile score, please review and update the following information where applicable:

Technical skills
Soft skills
Employment details
Academic information
Projects
Certifications
Other relevant profile information

Keeping your profile complete and up to date increases your visibility and helps us better evaluate you for internships, job opportunities, and recruiter recommendations.

Regards,
Team Road to SDET
WhatsApp: 01782808778`;

const buildAdminSummaryBody = (totalEligible, successCount, failedCount, reportDateStr) => `Dear Admin,

The weekly profile completion reminder process has been completed.

A total of ${totalEligible} students with a profile score below ${PROFILE_SCORE_THRESHOLD}% were identified across all eligible courses and batches.

Email Processing Summary
Total eligible students: ${totalEligible}
Emails sent successfully: ${successCount}
Emails failed: ${failedCount}
Report generated on: ${reportDateStr}
Scheduled execution time: Saturday at 7:30 PM (Asia/Dhaka)

Please find the detailed student report attached as a CSV file.
The report includes each student's course, batch, contact information, migration status, and current profile score.

Regards,
Road to SDET System`;

async function sendAdminReminderReport(eligibleStudents, successCount, failedCount, reportDateStr) {
  try {
    const admins = await User.findAll({
      where: { role: "admin" },
      attributes: ["email"],
    });

    if (admins.length === 0) {
      console.log("[weeklyProfileReminderJob] No admin users found — skipping admin summary.");
      return;
    }

    const headers = ["course_id", "batch_no", "student_name", "email", "mobile", "isMigrated", "profile_score"];
    const csvRows = [headers.join(",")];
    eligibleStudents.forEach((s) => {
      csvRows.push(
        [s.CourseId, s.batch_no, s.student_name, s.email, s.mobile, s.isMigrated, s.profile_score]
          .map(escapeCSV)
          .join(",")
      );
    });
    const csvContent = csvRows.join("\n");
    const filename = `profile-completion-reminder-report-${reportDateStr}.csv`;

    const toAddresses = admins.map((a) => a.email).join(", ");
    const subject = `Weekly Profile Completion Reminder Report — ${reportDateStr}`;
    const body = buildAdminSummaryBody(eligibleStudents.length, successCount, failedCount, reportDateStr);

    const sent = await sendEmailWithAttachment(
      toAddresses,
      subject,
      body,
      {
        filename,
        content: csvContent,
        mimeType: "text/csv",
      },
      { priority: "high" }
    );

    if (sent) {
      console.log(`[weeklyProfileReminderJob] Admin summary (${filename}) sent to ${toAddresses}.`);
    } else {
      console.warn("[weeklyProfileReminderJob] sendEmailWithAttachment returned false for admin summary.");
    }
  } catch (err) {
    console.error("[weeklyProfileReminderJob] Failed to send admin summary:", err);
  }
}

async function runWeeklyProfileReminderJob() {
  if (isJobRunning) {
    console.warn("[weeklyProfileReminderJob] Previous run still in progress — skipping this trigger to avoid duplicate emails.");
    return;
  }
  isJobRunning = true;

  console.log("⏰ [weeklyProfileReminderJob] Starting weekly profile completion reminder job...");
  const reportDateStr = moment.tz(TIMEZONE).format("DD-MM-YYYY");

  try {
    const eligibleStudents = await Student.findAll({
      where: {
        isEnrolled: true,
        profile_score: { [Op.lt]: PROFILE_SCORE_THRESHOLD },
      },
      include: [{ model: User, attributes: ["email", "isValid"], where: { isValid: true } }],
    });

    console.log(`[weeklyProfileReminderJob] Found ${eligibleStudents.length} eligible student(s).`);

    // Enqueued (not awaited one-by-one) so sends happen concurrently via emailQueue's
    // worker pool (retries included); one student's failure never blocks the rest.
    const sendResults = await Promise.all(
      eligibleStudents.map(async (student) => {
        const subject = `Complete Your Road to SDET Profile — Current Score: ${student.profile_score}%`;
        const body = buildReminderEmailBody(student.student_name, student.profile_score);
        const sent = await enqueueEmail({
          to: student.email,
          subject,
          body,
          meta: { studentId: student.StudentId },
          options: { priority: "high" },
        });
        if (sent) {
          console.log(`[weeklyProfileReminderJob] Reminder sent to ${student.email} (${student.StudentId}).`);
        } else {
          console.warn(`[weeklyProfileReminderJob] Reminder failed for ${student.email} (${student.StudentId}) after retries.`);
        }
        return sent;
      })
    );
    const successCount = sendResults.filter(Boolean).length;
    const failedCount = sendResults.length - successCount;

    await sendAdminReminderReport(eligibleStudents, successCount, failedCount, reportDateStr);

    console.log(`✅ [weeklyProfileReminderJob] Job finished. Success: ${successCount}, Failed: ${failedCount}.`);
  } catch (err) {
    console.error("❌ [weeklyProfileReminderJob] Job failed with an unexpected error:", err);
  } finally {
    isJobRunning = false;
  }
}

module.exports = { runWeeklyProfileReminderJob };
