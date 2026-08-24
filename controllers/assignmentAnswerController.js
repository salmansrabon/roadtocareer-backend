const AssignmentAnswer = require('../models/AssignmentAnswer');
const AssignmentQuestion = require('../models/AssignmentQuestion');
const Student = require('../models/Student');
const User = require('../models/User');
const { enqueueEmail } = require("../utils/emailQueue");
const { notify, wasRecentlyNotified } = require("../utils/notificationHelper");
const { NOTIFICATION_TYPES, ENTITY_TYPES } = require("../utils/notificationTypes");
const { Op } = require("sequelize");

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

    const existing = await AssignmentAnswer.findOne({
      where: {
        AssignmentId: Number(AssignmentId),
        StudentId: StudentId
      }
    });

    if (existing) {
      await existing.update({ Submission_Url, Comments });
      answer = existing;
    } else {
      answer = await AssignmentAnswer.create({ AssignmentId, StudentId, Submission_Url, Comments });
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


const getAnswersByAssignmentId = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;

    const answers = await AssignmentAnswer.findAll({
      where: { AssignmentId: assignmentId },
      include: [
        {
          model: AssignmentQuestion,
          as: 'Assignment',
          attributes: ['id', 'Assignment_Title', 'Description', 'SubmissionDate', 'TotalScore']
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
          attributes: ['id', 'Assignment_Title', 'SubmissionDate', 'courseId', 'batch_no'],
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
