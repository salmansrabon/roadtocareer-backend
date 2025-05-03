const AssignmentQuestion = require('../models/AssignmentQuestion');

const createAssignmentQuestion = async (req, res) => {
    try {
        const newAssignment = await AssignmentQuestion.create(req.body);
        res.status(201).json(newAssignment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating assignment question' });
    }
};

const getAllAssignmentQuestions = async (req, res) => {
    try {
        const { batch_no, assignmentId } = req.query;

        let whereClause = {};

        if (assignmentId) {
            whereClause.id = assignmentId; // ✅ Filter by AssignmentId
        } else if (batch_no) {
            whereClause.batch_no = batch_no; // ✅ Otherwise filter by Batch No
        }

        const assignments = await AssignmentQuestion.findAll({ where: whereClause });

        if (assignments.length === 0) {
            return res.status(404).json({ message: "No assignments found.", count: 0, assignments: [] });
        }

        res.status(200).json({
            count: assignments.length,
            assignments
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching assignment questions' });
    }
};
const updateAssignmentQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if the assignment exists
        const assignment = await AssignmentQuestion.findByPk(id);

        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found." });
        }

        // Update assignment with new data
        await assignment.update(req.body);

        return res.status(200).json({
            message: "Assignment updated successfully.",
            assignment
        });
    } catch (error) {
        console.error("Error updating assignment:", error);
        return res.status(500).json({ message: "Error updating assignment." });
    }
};

module.exports = {
    createAssignmentQuestion,
    getAllAssignmentQuestions,
    updateAssignmentQuestion
};
