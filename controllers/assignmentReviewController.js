const AssignmentAnswer = require('../models/AssignmentAnswer');
const AssignmentQuestion = require('../models/AssignmentQuestion');
const Student = require('../models/Student');
const User = require('../models/User');
const { enqueueEmail } = require("../utils/emailQueue");
const { notify, wasRecentlyNotified } = require("../utils/notificationHelper");
const { NOTIFICATION_TYPES, ENTITY_TYPES } = require("../utils/notificationTypes");

const updateAssignmentScore = async (req, res) => {
  const { assignmentId } = req.params;
  const { StudentId, Score, Comments, NewComments } = req.body;

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

    // Hoisted above the email-validity check so the in-app notification below can
    // use them regardless of whether the student has a valid email on file.
    const assignmentTitle = answer.Assignment?.Assignment_Title || "Your Assignment";
    // Reviewing comments without touching the score is a supported path (see the
    // `Score !== undefined` guard above), so fall back to the stored score rather
    // than printing "Score: undefined" to the student.
    const finalScore = Score !== undefined ? Score : answer.Score;

    // Suppress duplicates across BOTH channels: an admin fixing a typo and saving
    // three times would otherwise send the student three notifications and three
    // emails. Routine workflow, not an edge case.
    const alreadyNotified = await wasRecentlyNotified({
      recipients: StudentId,
      type: NOTIFICATION_TYPES.ASSIGNMENT_REVIEWED,
      entityType: ENTITY_TYPES.ASSIGNMENT_ANSWER,
      entityId: answer.id,
    });

    if (!alreadyNotified && student?.User?.email && student.User.isValid === 1) {
      const subject = `Assignment Reviewed - ${assignmentTitle}`;
      const emailComments = Array.isArray(NewComments) && NewComments.length > 0 ? NewComments : Comments;
      const commentText = Array.isArray(emailComments) ? emailComments.join("\n") : emailComments;

      const text = `Hello ${student.student_name},

Your assignment titled "${assignmentTitle}" has been reviewed.

✅ Score: ${finalScore ?? "-"} / ${answer.Assignment?.TotalScore ?? "-"}
💬 Comments: ${commentText || "No comments"}

Please log in to your dashboard to view the details.

Regards,  
Road to SDET Team`;

      enqueueEmail({
        to: student.User.email,
        subject,
        body: text,
        meta: { assignmentId, StudentId },
      }).then((sent) => {
        if (!sent) console.error(`[assignment] Review email failed for ${student.User.email}`, { assignmentId, StudentId });
      });
    }

    // 🔔 In-app notification for the student (SRS 24). Never throws.
    if (!alreadyNotified) await notify({
      recipients: StudentId,
      type: NOTIFICATION_TYPES.ASSIGNMENT_REVIEWED,
      title: "Assignment reviewed",
      body: `Your assignment "${assignmentTitle}" has been reviewed. Score: ${finalScore ?? "-"} / ${answer.Assignment?.TotalScore ?? "-"}.`,
      link: `/assignment/summary/mysubmission`,
      actorUsername: req.user?.username || null,
      actorName: req.user?.username || null,
      entityType: ENTITY_TYPES.ASSIGNMENT_ANSWER,
      entityId: answer.id,
      metadata: {
        assignmentId: Number(assignmentId),
        score: finalScore ?? null,
        totalScore: answer.Assignment?.TotalScore ?? null,
      },
    });

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