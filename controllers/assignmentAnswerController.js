const AssignmentAnswer = require('../models/AssignmentAnswer');
const AssignmentQuestion = require('../models/AssignmentQuestion');
const Student = require('../models/Student');
const User = require('../models/User');
const { sendEmail } = require("../utils/emailHelper");
const { Op } = require("sequelize");

const submitAssignmentAnswer = async (req, res) => {
  const { AssignmentId, StudentId, Submission_Url, Comments } = req.body;

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
      attributes: ['email']
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

    for (const admin of admins) {
      if (admin.email) {
        await sendEmail(admin.email, subject, text);
      }
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

    const answers = await AssignmentAnswer.findAll({
      where: { StudentId: studentId }
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
