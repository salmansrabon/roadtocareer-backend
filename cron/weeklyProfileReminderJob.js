const { Op } = require("sequelize");
const moment = require("moment-timezone");
const Student = require("../models/Student");
const User = require("../models/User");
const { sendEmailWithAttachment } = require("../utils/emailHelper");
const { enqueueEmail } = require("../utils/emailQueue");
const { getProfileGapAnalysis, buildPersonalizedReminderBody } = require("../utils/profileGapHelper");
const { notify, notifyRoles } = require("../utils/notificationHelper");
const { NOTIFICATION_TYPES, ENTITY_TYPES } = require("../utils/notificationTypes");

const TIMEZONE = "Asia/Dhaka";
const PROFILE_SCORE_THRESHOLD = 70;

let isJobRunning = false;

const escapeCSV = (value) => {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

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

async function sendAdminReminderReport(studentsWithGaps, successCount, failedCount, reportDateStr) {
  try {
    const admins = await User.findAll({
      where: { role: "admin" },
      attributes: ["email"],
    });

    if (admins.length === 0) {
      console.log("[weeklyProfileReminderJob] No admin users found — skipping admin summary.");
      return;
    }

    const headers = [
      "course_id", "batch_no", "student_name", "email", "mobile", "isMigrated", "profile_score",
      "employment_status", "points_to_threshold", "top_gap", "missing_sections",
    ];
    const csvRows = [headers.join(",")];
    studentsWithGaps.forEach(({ student: s, gap }) => {
      const topGap = [...gap.missingItems].sort((a, b) => b.pointsAvailable - a.pointsAvailable)[0];
      const missingSections = gap.sections
        .filter((section) => section.currentSectionScore < section.sectionMaxAchievable)
        .map((section) => section.section)
        .join("; ");
      csvRows.push(
        [
          s.CourseId, s.batch_no, s.student_name, s.email, s.mobile, s.isMigrated, s.profile_score,
          gap.employmentStatus, gap.pointsToThreshold, topGap ? topGap.label : "", missingSections,
        ]
          .map(escapeCSV)
          .join(",")
      );
    });
    const csvContent = csvRows.join("\n");
    const filename = `profile-completion-reminder-report-${reportDateStr}.csv`;

    const toAddresses = admins.map((a) => a.email).join(", ");
    const subject = `Weekly Profile Completion Reminder Report — ${reportDateStr}`;
    const body = buildAdminSummaryBody(studentsWithGaps.length, successCount, failedCount, reportDateStr);

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

    // 🔔 Summarised in-app notification for admins (SRS 24) — the in-app
    // counterpart of the CSV email above. One row per admin, NOT one per student.
    // Scoped to role "admin", matching the email's recipient list.
    //
    // Skipped when nobody qualifies, so admins never get a "0 students" bell.
    // (The email above has no such guard — that is pre-existing behaviour and is
    // deliberately left alone; only the notification is gated here. Compare
    // attendanceReminderJob, which early-returns the whole summary at zero.)
    if (studentsWithGaps.length === 0) {
      console.log("[weeklyProfileReminderJob] No students with gaps — skipping admin in-app summary.");
      return;
    }

    await notifyRoles(["admin"], {
      type: NOTIFICATION_TYPES.PROFILE_INCOMPLETE_SUMMARY,
      title: `${studentsWithGaps.length} student${studentsWithGaps.length === 1 ? "" : "s"} with incomplete profiles`,
      body: `${studentsWithGaps.length} student${studentsWithGaps.length === 1 ? "" : "s"} scored under ${PROFILE_SCORE_THRESHOLD}% as of ${reportDateStr}. ` +
        `${successCount} reminder${successCount === 1 ? "" : "s"} sent, ${failedCount} failed. The full list was emailed as a CSV.`,
      link: "/students/list",
      actorUsername: null,
      actorName: "Road to SDET",
      entityType: ENTITY_TYPES.PROFILE,
      entityId: `summary:${moment.tz(TIMEZONE).format("YYYY-MM-DD")}`,
      metadata: { studentCount: studentsWithGaps.length, successCount, failedCount, date: reportDateStr },
    });
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

    // Computed once per student and reused for both the email body and the
    // admin CSV — avoids running the gap analysis twice per student.
    const studentsWithGaps = eligibleStudents.map((student) => ({
      student,
      gap: getProfileGapAnalysis(student.toJSON(), PROFILE_SCORE_THRESHOLD),
    }));

    // Enqueued (not awaited one-by-one) so sends happen concurrently via emailQueue's
    // worker pool (retries included); one student's failure never blocks the rest.
    const sendResults = await Promise.all(
      studentsWithGaps.map(async ({ student, gap }) => {
        const subject = `Complete Your Road to SDET Profile — Current Score: ${student.profile_score}%`;
        const body = buildPersonalizedReminderBody(student, gap);
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

    // 🔔 In-app notification per student (SRS 24), the counterpart of the email
    // above. ONE notify() call with per-recipient bodies rather than one call per
    // student: this fans out to 500+ students, and N separate calls would be N
    // round-trips against a 5-connection pool. Sent regardless of email outcome —
    // a bounced address shouldn't cost the student the in-app nudge.
    await notify({
      recipients: studentsWithGaps.map(({ student, gap }) => {
        // gap.currentScore is recomputed here, so prefer it over the stored
        // students.profile_score column, which can be stale between recalcs.
        const score = gap?.currentScore ?? student.profile_score;
        const sections = [...new Set((gap?.missingItems || []).map((i) => i.section))].slice(0, 3);
        return {
          username: student.StudentId,
          body: `Your profile is ${score}% complete` +
            `${gap?.pointsToThreshold ? ` — ${gap.pointsToThreshold} points from ${PROFILE_SCORE_THRESHOLD}%` : ""}.` +
            `${sections.length ? ` Still missing: ${sections.join(", ")}.` : ""}` +
            ` Complete it to appear in QA Talent and get placement support.`,
          metadata: {
            profileScore: score,
            threshold: PROFILE_SCORE_THRESHOLD,
            pointsToThreshold: gap?.pointsToThreshold ?? null,
          },
        };
      }),
      type: NOTIFICATION_TYPES.PROFILE_INCOMPLETE,
      title: "Complete your profile",
      link: "/profile",
      actorUsername: null,
      actorName: "Road to SDET",
      entityType: ENTITY_TYPES.PROFILE,
      // One reminder per weekly run, so a same-day re-run can't duplicate it.
      entityId: `weekly:${moment.tz(TIMEZONE).format("YYYY-MM-DD")}`,
    });

    await sendAdminReminderReport(studentsWithGaps, successCount, failedCount, reportDateStr);

    console.log(`✅ [weeklyProfileReminderJob] Job finished. Success: ${successCount}, Failed: ${failedCount}.`);
  } catch (err) {
    console.error("❌ [weeklyProfileReminderJob] Job failed with an unexpected error:", err);
  } finally {
    isJobRunning = false;
  }
}

module.exports = { runWeeklyProfileReminderJob };
