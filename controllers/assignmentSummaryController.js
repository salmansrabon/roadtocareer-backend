// controllers/assignmentSummaryController.js
const Student = require("../models/Student");
const AssignmentAnswer = require("../models/AssignmentAnswer");
const AssignmentQuestion = require("../models/AssignmentQuestion");
const User = require("../models/User");
const { Op } = require("sequelize");

const getAssignmentSummaryByCourse = async (req, res) => {
  const { courseId } = req.query;

  if (!courseId) {
    return res.status(400).json({ message: "courseId is required" });
  }

  try {
    // 1. Get all students of the course
    const students = await Student.findAll({
      where: { CourseId: courseId },
      include: [{ model: User, attributes: ["email"] }]
    });

    if (!students.length) {
      return res.status(404).json({ message: "No students found for this course" });
    }

    const studentIds = students.map(s => s.StudentId);

    // 2. Get all assignment answers by students of this course
    const answers = await AssignmentAnswer.findAll({
      where: {
        StudentId: { [Op.in]: studentIds }
      },
      include: [
        {
          model: AssignmentQuestion,
          attributes: ["Assignment_Title", "topic_name"],
          as: "Assignment"
        }
      ]
    });

    // 3. Group by StudentId
    const summaryMap = {};

    for (const student of students) {
      const sid = student.StudentId;
      const studentAnswers = answers.filter(a => a.StudentId === sid);

      summaryMap[sid] = {
        StudentId: sid,
        student_name: student.student_name,
        email: student.User?.email || "",
        submittedCount: studentAnswers.length,
        totalScore: studentAnswers.reduce((sum, a) => sum + (a.Score || 0), 0),
        answers: studentAnswers.map(a => ({
          AssignmentId: a.AssignmentId,
          Assignment_Title: a.Assignment?.Assignment_Title || "",
          topic_name: a.Assignment?.topic_name || "",
          Submission_Url: a.Submission_Url,
          Score: a.Score,
          Comments: a.Comments
        }))
      };
    }

    const summary = Object.values(summaryMap).sort((a, b) => b.totalScore - a.totalScore);

    res.status(200).json({
      courseId,
      studentCount: summary.length,
      summary
    });

  } catch (err) {
    console.error("❌ Error in getAssignmentSummaryByCourse:", err);
    res.status(500).json({ message: "Server error while fetching assignment summary" });
  }
};

module.exports = {
  getAssignmentSummaryByCourse
};
