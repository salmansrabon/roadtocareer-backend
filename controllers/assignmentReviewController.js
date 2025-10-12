const AssignmentAnswer = require('../models/AssignmentAnswer');
const AssignmentQuestion = require('../models/AssignmentQuestion');
const Student = require('../models/Student');
const User = require('../models/User');
const { sendEmail } = require("../utils/emailHelper");

const updateAssignmentScore = async (req, res) => {
  const { assignmentId } = req.params;
  const { StudentId, Score, Comments } = req.body;

  if (!assignmentId || !StudentId) {
    return res.status(400).json({ message: "AssignmentId (path) and StudentId (body) are required." });
  }

  try {
    // 1. Find the answer
    const answer = await AssignmentAnswer.findOne({
      where: {
        AssignmentId: Number(assignmentId),
        StudentId: StudentId
      },
      include: [
        {
          model: AssignmentQuestion,
          as: "Assignment",
          attributes: ["Assignment_Title", "TotalScore"]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (!answer) {
      return res.status(404).json({ message: "Assignment answer not found for this student." });
    }

    // 2. Update fields
    if (Score !== undefined) answer.Score = Score;
    if (Comments !== undefined) answer.Comments = Comments;
    answer.reviewDate = new Date(); // Set review date when assignment is reviewed

    await answer.save();

    // 3. Fetch student info with email
    const student = await Student.findOne({
      where: { StudentId },
      include: [{ model: User, attributes: ["email", "isValid"] }]
    });

    if (student?.User?.email && student.User.isValid === 1) {
      const assignmentTitle = answer.Assignment?.Assignment_Title || "Your Assignment";
      const subject = `Assignment Reviewed - ${assignmentTitle}`;
      const commentText = Array.isArray(Comments) ? Comments.join("\n") : Comments;

      const text = `Hello ${student.student_name},

Your assignment titled "${assignmentTitle}" has been reviewed.

✅ Score: ${Score} / ${answer.Assignment?.TotalScore}
💬 Comments: ${commentText || "No comments"}

Please log in to your dashboard to view the details.

Regards,  
Road to SDET Team`;

      await sendEmail(student.User.email, subject, text);
      console.log(`📧 Email sent to ${student.User.email}`);
    }

    res.status(200).json({
      message: "Assignment score and comments updated successfully.",
      updatedAnswer: answer
    });
  } catch (error) {
    console.error("❌ Error updating assignment answer:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
  
module.exports = { updateAssignmentScore };