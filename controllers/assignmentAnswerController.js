const AssignmentAnswer = require('../models/AssignmentAnswer');
const AssignmentQuestion = require('../models/AssignmentQuestion');
const Student = require('../models/Student');
const User = require('../models/User');
const { enqueueEmail } = require("../utils/emailQueue");
const { notify, wasRecentlyNotified } = require("../utils/notificationHelper");
const { NOTIFICATION_TYPES, ENTITY_TYPES } = require("../utils/notificationTypes");
const { Op } = require("sequelize");
const { buildSubmissionSnapshot } = require("../utils/submissionSnapshot");
const { SubmissionFetchError } = require("../utils/submissionFetchError");
const { isSelfLearningStudent, runAutoReview } = require("../utils/autoAssignmentReview");

const PUBLIC_LINK_HELP =
  "Please submit a public link: a public GitHub repository, or a Google Doc or Google Sheet shared as \"Anyone with the link can view\".";

const submitAssignmentAnswer = async (req, res) => {
  const { AssignmentId, Submission_Url, Comments } = req.body;

  // Identity comes from the JWT, never from the request body. Trusting
  // body.StudentId let any authenticated student submit as a classmate, which
  // also spoofed the actor name shown in the admin notification feed.
  // (req.user.username IS the StudentId — see models/Student.js.)
  const isStaff = req.user.role === "admin" || req.user.role === "teacher";
  if (!isStaff && req.body.StudentId && req.body.StudentId !== req.user.username) {
    return res.status(403).json({ message: "You may only submit your own assignment." });
  }
  // Staff keep the ability to submit on a student's behalf; everyone else is
  // pinned to their own id.
  const StudentId = isStaff && req.body.StudentId ? req.body.StudentId : req.user.username;

  if (!AssignmentId || !StudentId) {
    return res.status(400).json({ message: "AssignmentId and StudentId are required." });
  }

  try {
    let answer;

    // TASK-67: a Self-Learning student's own submission is reviewed by AI right away.
    // The link is read BEFORE saving, so an unreadable link is rejected with a clear
    // message and nothing is stored. Staff submitting on a student's behalf keep the
    // normal (manual) flow. Courses without a Self-Learning package never auto-review.
    let autoReview = false;
    if (!isStaff) {
      const assignmentCourse = await AssignmentQuestion.findByPk(AssignmentId, { attributes: ["courseId"] });
      autoReview = await isSelfLearningStudent(StudentId, assignmentCourse?.courseId);
    }
    let snapshot = null;
    if (autoReview) {
      try {
        // deep: read much more of the work; the review reads it in parts if needed.
        snapshot = await buildSubmissionSnapshot(Submission_Url, { deep: true });
      } catch (err) {
        if (!(err instanceof SubmissionFetchError)) throw err;
        return res.status(422).json({
          message: `The AI reviewer could not read your link. ${PUBLIC_LINK_HELP}`,
          detail: err.message,
          code: "LINK_NOT_READABLE",
        });
      }
    }

    const existing = await AssignmentAnswer.findOne({
      where: {
        AssignmentId: Number(AssignmentId),
        StudentId: StudentId
      }
    });

    const reviewFields = autoReview ? { ai_review_status: "pending" } : {};
    if (existing) {
      await existing.update({ Submission_Url, Comments, ...reviewFields });
      answer = existing;
    } else {
      answer = await AssignmentAnswer.create({ AssignmentId, StudentId, Submission_Url, Comments, ...reviewFields });
    }

    if (autoReview) {
      // Background: the student gets an answer now and polls for the result. No admin
      // email or notification, since nobody reviews Self-Learning work by hand.
      runAutoReview(answer.id, snapshot, new Date(answer.updatedAt).getTime());
      return res.status(existing ? 200 : 201).json({
        message: "Answer submitted. The AI is reviewing it now.",
        answer,
        autoReview: true,
      });
    }

    // 🔔 Notify Admins
    const assignment = await AssignmentQuestion.findByPk(AssignmentId, {
      attributes: ['Assignment_Title']
    });

    const student = await Student.findOne({
      where: { StudentId },
      attributes: ['student_name']
    });

    const admins = await User.findAll({
      where: {
        role: {
          [Op.in]: ["admin", "teacher"]  // ✅ Match both roles
        }
      },
      attributes: ['username', 'email']
    });

    const subject = `Assignment Submitted - ${assignment?.Assignment_Title || 'Untitled'}`;
    const text = `Hello Admin,
  
  ✅ A student has submitted an assignment.
  
  👤 Student: ${student?.student_name || StudentId}
  📄 Assignment: ${assignment?.Assignment_Title || AssignmentId}
  🔗 Submission URL: ${Submission_Url}
  
  Please review it from your admin dashboard.
  
  Regards,  
  Road to SDET System`;

    // 🔔 Notify admins/teachers, in-app and by email (SRS 24).
    //
    // Both channels are gated on the SAME suppression check: a student hammering
    // Save would otherwise still send one email per admin per save, which is the
    // noisier half of the problem. notify() never throws, so a notification
    // failure can never fail the submission.
    const staffUsernames = admins.map((a) => a.username);
    const alreadyNotified = await wasRecentlyNotified({
      recipients: staffUsernames,
      type: NOTIFICATION_TYPES.ASSIGNMENT_SUBMITTED,
      entityType: ENTITY_TYPES.ASSIGNMENT_ANSWER,
      entityId: answer.id,
    });

    if (!alreadyNotified) {
      // Queued rather than awaited: this used to be a blocking loop that made the
      // student's submit response wait on one SMTP round-trip per admin.
      for (const admin of admins) {
        if (admin.email) {
          enqueueEmail({
            to: admin.email,
            subject,
            body: text,
            meta: { AssignmentId, StudentId },
          }).then((sent) => {
            if (!sent) console.error(`[assignment] Submission email failed for ${admin.email}`, { AssignmentId, StudentId });
          });
        }
      }

      const studentName = student?.student_name || StudentId;
      const assignmentTitle = assignment?.Assignment_Title || `Assignment #${AssignmentId}`;

      await notify({
        recipients: staffUsernames,
        type: NOTIFICATION_TYPES.ASSIGNMENT_SUBMITTED,
        title: existing ? "Assignment resubmitted" : "New assignment submission",
        body: `${studentName} ${existing ? "resubmitted" : "submitted"} "${assignmentTitle}".`,
        link: `/assignment/answer/${AssignmentId}`,
        actorUsername: req.user?.username || StudentId,
        actorName: studentName,
        entityType: ENTITY_TYPES.ASSIGNMENT_ANSWER,
        entityId: answer.id,
        metadata: {
          assignmentId: Number(AssignmentId),
          studentId: StudentId,
          resubmission: !!existing,
        },
      });
    }

    return res.status(existing ? 200 : 201).json({
      message: existing ? "Answer updated successfully" : "Answer submitted successfully",
      answer
    });
  } catch (error) {
    console.error("❌ Error submitting assignment answer:", error);
    return res.status(500).json({ message: 'Error submitting assignment answer' });
  }
};


// Admins and teachers can read any student's answers; a student only their own.
// Identity comes from the JWT (req.user.username IS the StudentId), never from the
// request. Without these checks any logged-in student could list every classmate's
// submission links, scores and comments.
const isStaff = (user) => user?.role === "admin" || user?.role === "teacher";
const canViewStudent = (req, studentId) => isStaff(req.user) || studentId === req.user?.username;

const getAnswersByAssignmentId = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;

    // Staff get the whole review queue; a student gets only their own submission
    // (the student assignments page picks its own row out of this list).
    const where = { AssignmentId: assignmentId };
    if (!isStaff(req.user)) where.StudentId = req.user?.username;

    const answers = await AssignmentAnswer.findAll({
      where,
      include: [
        {
          model: AssignmentQuestion,
          as: 'Assignment',
          attributes: ['id', 'Assignment_Title', 'Description', 'SubmissionDate', 'TotalScore', 'is_starred']
        },
        {
          model: Student,
          as: 'Student',
          attributes: ['StudentId', 'student_name', 'batch_no']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ count: answers.length, answers });
  } catch (error) {
    console.error("Error fetching assignment answers:", error);
    res.status(500).json({ message: 'Error fetching assignment answers' });
  }
};
// ✅ Get all answers by StudentId
const getAnswersByStudentId = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const { courseId, batch_no } = req.query;

    if (!canViewStudent(req, studentId)) {
      return res.status(403).json({ message: "You may only view your own submissions." });
    }

    const assignmentWhere = {};
    if (courseId) {
      // courseId alone identifies the batch; don't also require batch_no to match —
      // previous_course_id/previous_batch_no can be updated independently and drift apart
      assignmentWhere.courseId = courseId;
    } else if (batch_no) {
      assignmentWhere.batch_no = batch_no;
    }

    const answers = await AssignmentAnswer.findAll({
      where: { StudentId: studentId },
      include: [
        {
          model: AssignmentQuestion,
          as: 'Assignment',
          attributes: ['id', 'Assignment_Title', 'TotalScore', 'SubmissionDate', 'courseId', 'batch_no'],
          where: Object.keys(assignmentWhere).length ? assignmentWhere : undefined,
          required: Object.keys(assignmentWhere).length > 0,
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (answers.length === 0) {
      return res.status(404).json({ message: `No answers found for Student ID: ${studentId}` });
    }

    res.status(200).json({ count: answers.length, answers });
  } catch (error) {
    console.error('Error fetching assignment answers by StudentId:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
const getAssignmentAnswerByStudentAndAssignmentId = async (req, res) => {
  const { studentId, assignmentId } = req.query;

  if (!studentId || !assignmentId) {
    return res.status(400).json({ message: "studentId and assignmentId are required." });
  }
  if (!canViewStudent(req, studentId)) {
    return res.status(403).json({ message: "You may only view your own submissions." });
  }

  try {
    const answer = await AssignmentAnswer.findOne({
      where: {
        StudentId: studentId,
        AssignmentId: Number(assignmentId)
      },
      order: [['createdAt', 'DESC']]
    });

    if (!answer) {
      return res.status(404).json({ message: "Assignment answer not found." });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    console.error("Error fetching assignment answer:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = {
  submitAssignmentAnswer,
  getAnswersByAssignmentId,
  getAnswersByStudentId,
  getAssignmentAnswerByStudentAndAssignmentId
};
