const AssignmentAnswer = require('../models/AssignmentAnswer');

const updateAssignmentScore = async (req, res) => {
    const { assignmentId } = req.params;
    const { StudentId, Score, Comments } = req.body;
  
    if (!assignmentId || !StudentId) {
      return res.status(400).json({ message: "AssignmentId (path) and StudentId (body) are required." });
    }
  
    try {
      const answer = await AssignmentAnswer.findOne({
        where: {
          AssignmentId: Number(assignmentId),
          StudentId: StudentId
        },
        order: [['createdAt', 'DESC']]
      });
  
      if (!answer) {
        return res.status(404).json({ message: "Assignment answer not found for this student." });
      }
  
      // Update fields if provided
      if (Score !== undefined) answer.Score = Score;
      if (Comments !== undefined) answer.Comments = Comments;
  
      await answer.save();
  
      res.status(200).json({
        message: "Assignment score and comments updated successfully.",
        updatedAnswer: answer
      });
    } catch (error) {
      console.error("Error updating assignment answer:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  };
  
  module.exports = { updateAssignmentScore };