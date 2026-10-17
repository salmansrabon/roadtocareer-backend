// controllers/assignmentSummaryController.js
const Student = require("../models/Student");
const AssignmentAnswer = require("../models/AssignmentAnswer");
const AssignmentQuestion = require("../models/AssignmentQuestion");
const User = require("../models/User");
const McqConfig = require("../models/McqConfig");
const ExamConfig = require("../models/ExamConfig");
const { parseQuizAnswers, getQuizState } = require("./mcqController");
const { Op } = require("sequelize");

// A quiz counts once the attempt is over (submitted, or the clock ran out);
// while the student is still answering it is reported without a score.
// Quizzes and exams belong to the student's CURRENT course, so a student who
// migrated out of this course has neither here.
const buildQuizSummary = (student, courseId, quizConfig) => {
  if (!quizConfig || String(student.CourseId) !== String(courseId)) return null;
  const entries = parseQuizAnswers(student.quiz_answer);
  const state = getQuizState(student.quiz_started_at, entries, quizConfig.totalTime);
  if (state.status === "fresh") return null;
  if (state.status === "in_progress") return { score: null, maxScore: quizConfig.totalQuestion, status: "in_progress" };
  return {
    score: entries.filter((e) => e.isCorrect).length,
    maxScore: quizConfig.totalQuestion,
    status: "submitted"
  };
};

const buildExamSummaries = (student, examTitleById) =>
  (Array.isArray(student.exam_answer) ? student.exam_answer : [])
    .filter((sub) => examTitleById.has(sub.exam_id))
    .map((sub) => ({
      examId: sub.exam_id,
      title: sub.exam_title || examTitleById.get(sub.exam_id),
      evaluated: !!sub.is_evaluated,
      score: sub.is_evaluated ? Number(sub.total_score) || 0 : null,
      maxScore: (sub.answers || []).reduce((sum, a) => sum + (Number(a.max_score) || 0), 0)
    }));

const getAssignmentSummaryByCourse = async (req, res) => {
  const { courseId } = req.query;

  if (!courseId) {
    return res.status(400).json({ message: "courseId is required" });
  }

  try {
    // 0. Total assignments given for this course, and their combined max score
    const courseAssignments = await AssignmentQuestion.findAll({
      where: { courseId },
      attributes: ["id", "TotalScore"]
    });
    const totalAssignments = courseAssignments.length;
    const totalAllocatedScore = courseAssignments.reduce((sum, a) => sum + (a.TotalScore || 0), 0);

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
      where: { CourseId: courseId, isEnrolled: true },
      include: [{ model: User, attributes: ["email"], where: { isValid: true } }]
    });

    const currentStudentIds = new Set(currentStudents.map(s => s.StudentId));
    const migratedOutStudentIds = studentIdsWithSubmissions.filter(id => !currentStudentIds.has(id));

    const migratedOutStudents = migratedOutStudentIds.length
      ? await Student.findAll({
          where: { StudentId: { [Op.in]: migratedOutStudentIds }, isEnrolled: true },
          include: [{ model: User, attributes: ["email"], where: { isValid: true } }]
        })
      : [];

    const students = [...currentStudents, ...migratedOutStudents];

    if (!students.length) {
      return res.status(404).json({ message: "No students found for this course" });
    }

    // 3. Quiz config and exams of this course, for the quiz / written exam scores
    const quizConfig = await McqConfig.findOne({ where: { CourseId: courseId } });
    const courseExams = await ExamConfig.findAll({ where: { courseId }, attributes: ["id", "exam_title"] });
    const examTitleById = new Map(courseExams.map(e => [e.id, e.exam_title]));

    // 4. Group by StudentId
    const summaryMap = {};

    for (const student of students) {
      const sid = student.StudentId;
      const studentAnswers = answers.filter(a => a.StudentId === sid);
      const assignmentScore = studentAnswers.reduce((sum, a) => sum + (a.Score || 0), 0);
      const quiz = buildQuizSummary(student, courseId, quizConfig);
      const exams = buildExamSummaries(student, examTitleById);

      // Pending (unscored) quizzes and exams stay out of the combined total and
      // maximum, so waiting for evaluation never lowers a student's percentage.
      const counted = [quiz, ...exams].filter(item => item && item.score !== null);

      summaryMap[sid] = {
        StudentId: sid,
        student_name: student.student_name,
        email: student.User?.email || "",
        previous_batch: student.previous_batch_no || "",
        submittedCount: studentAnswers.length,
        totalScore: assignmentScore,
        quiz,
        exams,
        grandTotal: assignmentScore + counted.reduce((sum, item) => sum + item.score, 0),
        grandMax: totalAllocatedScore + counted.reduce((sum, item) => sum + item.maxScore, 0),
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

    const summary = Object.values(summaryMap).sort((a, b) => b.grandTotal - a.grandTotal);

    res.status(200).json({
      courseId,
      studentCount: summary.length,
      totalAssignments,
      totalAllocatedScore,
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
