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
    // 1. Get all answers submitted against THIS course's assignments only
    // (a student's answers from a previous batch, pre-migration, must not
    // count toward the batch currently being viewed)
    const answers = await AssignmentAnswer.findAll({
      include: [
        {
          model: AssignmentQuestion,
          attributes: ["Assignment_Title", "topic_name"],
          as: "Assignment",
          where: { courseId },
          required: true
        }
      ]
    });

    const studentIdsWithSubmissions = [...new Set(answers.map(a => a.StudentId))];

    // 2. Students currently enrolled in this course, PLUS students who have
    // since migrated to another batch but still hold submissions against
    // this course's assignments (so their history stays visible here)
    const currentStudents = await Student.findAll({
      where: { CourseId: courseId },
      include: [{ model: User, attributes: ["email"] }]
    });

    const currentStudentIds = new Set(currentStudents.map(s => s.StudentId));
    const migratedOutStudentIds = studentIdsWithSubmissions.filter(id => !currentStudentIds.has(id));

    const migratedOutStudents = migratedOutStudentIds.length
      ? await Student.findAll({
          where: { StudentId: { [Op.in]: migratedOutStudentIds } },
          include: [{ model: User, attributes: ["email"] }]
        })
      : [];

    const students = [...currentStudents, ...migratedOutStudents];

    if (!students.length) {
      return res.status(404).json({ message: "No students found for this course" });
    }

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
