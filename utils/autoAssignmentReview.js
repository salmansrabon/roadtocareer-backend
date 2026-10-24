// Automatic AI review of Self-Learning submissions (TASK-67).
//
// Separate from the admin's Evaluate button (TASK-64, assignmentEvaluationController.js):
// that one is a read-only draft the admin edits and saves. This one SAVES the result
// itself and marks it reviewed_by = "ai", so it is never confused with an admin review.
// It reuses the same rubric, OpenAI call and scoring (utils/assignmentEvaluator.js).
require("../models/Course"); // Package <-> Course circular require: Course must load first
const Package = require("../models/Package");
const Student = require("../models/Student");
const User = require("../models/User");
const AssignmentAnswer = require("../models/AssignmentAnswer");
const { enqueueEmail } = require("./emailQueue");
const { notify } = require("./notificationHelper");
const { NOTIFICATION_TYPES, ENTITY_TYPES } = require("./notificationTypes");
const { loadAnswerForReview, finalizeReview } = require("./assignmentEvaluator");
const { reviewSubmission } = require("./multiPartReview");

const AI_COMMENT_PREFIX = "AI review:\n";

// Same lookup as getCourseProgress: the student's package name on the student's
// own course, flagged is_self_learning. Self-Learning is per account (TASK-63).
// A course with no Self-Learning package never matches, so its students always
// keep the manual review. `assignmentCourseId`: the assignment must belong to that
// same course, so work from any other course is never auto-reviewed.
async function isSelfLearningStudent(studentId, assignmentCourseId) {
  const student = await Student.findOne({
    where: { StudentId: studentId },
    attributes: ["CourseId", "package"],
  });
  if (!student?.CourseId || !student.package) return false;
  if (!assignmentCourseId || assignmentCourseId !== student.CourseId) return false;
  const pkg = await Package.findOne({
    where: { courseId: student.CourseId, packageName: student.package },
    attributes: ["is_self_learning"],
  });
  return Boolean(pkg?.is_self_learning);
}

// Tells the student the result, in the app and by email, like a manual review.
// No duplicate guard: every resubmission gets its own review and its own result.
async function notifyStudent(answer, result) {
  const studentId = answer.StudentId;
  const assignmentTitle = answer.Assignment?.Assignment_Title || "Your Assignment";
  const scoreText = `${result.score} / ${result.totalScore}`;

  const student = await Student.findOne({
    where: { StudentId: studentId },
    include: [{ model: User, attributes: ["email", "isValid"] }],
  });

  if (student?.User?.email && student.User.isValid === 1) {
    enqueueEmail({
      to: student.User.email,
      subject: `Assignment Reviewed (AI) - ${assignmentTitle}`,
      body: `Hello ${student.student_name},

Your assignment titled "${assignmentTitle}" has been reviewed automatically by AI.

✅ Score: ${scoreText}
💬 Comments:
${result.comment}

You can improve your work and submit again at any time. Each submission gets a new review.

Regards,
Road to SDET Team`,
      meta: { assignmentId: answer.AssignmentId, StudentId: studentId, ai: true },
    }).then((sent) => {
      if (!sent) console.error(`[auto-review] Review email failed for ${student.User.email}`, { answerId: answer.id });
    });
  }

  await notify({
    recipients: studentId,
    type: NOTIFICATION_TYPES.ASSIGNMENT_REVIEWED,
    title: "Assignment reviewed by AI",
    body: `Your assignment "${assignmentTitle}" has been reviewed by AI. Score: ${scoreText}.`,
    link: `/assignment/summary/mysubmission`,
    actorUsername: null,
    actorName: "AI reviewer",
    entityType: ENTITY_TYPES.ASSIGNMENT_ANSWER,
    entityId: answer.id,
    metadata: {
      assignmentId: Number(answer.AssignmentId),
      score: result.score,
      totalScore: result.totalScore,
      reviewedBy: "ai",
    },
  });
}

/**
 * Runs the AI review for one stored answer and saves the result. Never throws:
 * it is started in the background after the submit response has gone out.
 *
 * @param {number} answerId
 * @param {{text: string}} snapshot the submission text, already read at submit time
 *   with buildSubmissionSnapshot(url, { deep: true })
 * @param {number} submittedAt the answer's updatedAt (ms) when this review started;
 *   if the student resubmits meanwhile, the newer submission wins and this result is dropped.
 */
async function runAutoReview(answerId, snapshot, submittedAt) {
  try {
    const answer = await loadAnswerForReview(answerId);
    if (!answer || !answer.Assignment) return;

    let raw;
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
      // A long submission is read in parts rather than cut short (multiPartReview.js).
      const review = await reviewSubmission(answer.Assignment, snapshot.text);
      raw = review.raw;
      if (review.parts > 1) console.log(`[auto-review] Answer ${answerId} reviewed in ${review.parts} parts.`);
    } catch (err) {
      console.error(`[auto-review] AI review failed for answer ${answerId}:`, err.message);
      await markIfCurrent(answerId, submittedAt, { ai_review_status: "failed" });
      return;
    }

    const result = finalizeReview(answer, raw, { skipLatePenalty: true });

    // Comments is a shared history list (student notes + reviews). Keep it and add
    // this review at the end, labelled so it reads as an AI review.
    const history = (Array.isArray(answer.Comments) ? answer.Comments : []).filter((c) => c && String(c).trim());
    const saved = await markIfCurrent(answerId, submittedAt, {
      Score: result.score,
      Comments: [...history, `${AI_COMMENT_PREFIX}${result.comment}`],
      reviewDate: new Date(),
      reviewed_by: "ai",
      ai_review_status: "done",
    });
    if (saved) await notifyStudent(answer, result);
  } catch (error) {
    console.error(`[auto-review] Unexpected error for answer ${answerId}:`, error);
    await markIfCurrent(answerId, submittedAt, { ai_review_status: "failed" }).catch(() => {});
  }
}

// assignment_answers.updatedAt is a DATETIME with whole seconds, while the value
// Sequelize returns right after a save still has milliseconds. Compare seconds.
const toSeconds = (value) => Math.floor(new Date(value).getTime() / 1000);

// Writes `fields` only if the answer was not resubmitted after this review started.
async function markIfCurrent(answerId, submittedAt, fields) {
  const answer = await AssignmentAnswer.findByPk(answerId);
  if (!answer) return false;
  if (toSeconds(answer.updatedAt) !== toSeconds(submittedAt)) {
    console.log(`[auto-review] Answer ${answerId} was resubmitted during the review; result dropped.`);
    return false;
  }
  await answer.update(fields);
  return true;
}

// Self-Learning work has no due date, so no late penalty, whoever runs the AI
// review (auto-review, the admin's Evaluate button, or the review chat).
// `answer` comes from loadAnswerForReview (includes Assignment.courseId).
const isNoDeadlineAnswer = (answer) => isSelfLearningStudent(answer.StudentId, answer.Assignment?.courseId);

module.exports = { isSelfLearningStudent, isNoDeadlineAnswer, runAutoReview, AI_COMMENT_PREFIX };
