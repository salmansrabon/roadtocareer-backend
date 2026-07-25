const AssignmentQuestion = require('../models/AssignmentQuestion');
const AssignmentAnswer = require('../models/AssignmentAnswer');
const Student = require('../models/Student');
const User = require('../models/User');
const { Op } = require('sequelize');
const { sendEmail } = require("../utils/emailHelper");

const createAssignmentQuestion = async (req, res) => {
    try {
        // 1. Create the assignment in DB
        const newAssignment = await AssignmentQuestion.create(req.body);

        // ✅ Generate Assignment Link
        const assignmentLink = `${process.env.FRONTEND_URL || 'https://www.roadtocareer.net'}/assignment/submit/${newAssignment.id}`;

        // 2. Return success response immediately after DB save
        console.log("✅ Assignment created successfully.");
        res.status(201).json({
            message: "Assignment created successfully.",
            assignment: newAssignment,
            assignmentLink
        });

        // 3. Send emails in the background (non-blocking)
        const courseId = req.body.courseId;
        const subject = `New Assignment: ${req.body.Assignment_Title}`;
        const submissionDeadline = new Date(req.body.SubmissionDate).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        const text = `Hello,

A new assignment has been published for your course (${courseId}).

📌 Topic: ${req.body.topic_name}
📄 Title: ${req.body.Assignment_Title}
⏳ Submission Deadline: ${submissionDeadline}

👉 Assignment Link: ${assignmentLink}

Please make sure to submit it before the deadline. Login to your portal to check the assignment details.

Regards,
Team, Road to SDET`;

        // Send emails asynchronously without blocking the response
        setImmediate(async () => {
            try {
                const students = await Student.findAll({
                    where: { CourseId: courseId },
                    include: [{ model: User, attributes: ["email", "isValid"] }]
                });

                console.log(`📧 Starting to send emails to ${students.length} students...`);

                for (const student of students) {
                    if (student.email && student.User?.isValid === 1) {
                        await sendEmail(student.email, subject, text);
                        console.log(`📧 Email sent to ${student.email}`);
                    }
                }

                console.log("✅ All emails sent successfully.");
            } catch (emailError) {
                console.error("❌ Error sending emails in background:", emailError);
            }
        });

    } catch (error) {
        console.error("❌ Error creating assignment:", error);
        res.status(500).json({ message: "Error creating assignment question" });
    }
};


const getAllAssignmentQuestions = async (req, res) => {
    try {
        const { batch_no, assignmentId, courseId  } = req.query;

        let whereClause = {};

        if (assignmentId) {
            whereClause.id = assignmentId; // ✅ Filter by AssignmentId
        }
        if (courseId) {
            // courseId alone identifies the batch; don't also require batch_no to match —
            // previous_course_id/previous_batch_no can be updated independently and drift apart
            whereClause.courseId = courseId;
        } else if (batch_no) {
            whereClause.batch_no = batch_no; // ✅ Otherwise filter by Batch No
        }

        const assignments = await AssignmentQuestion.findAll({ where: whereClause });

        if (assignments.length === 0) {
            return res.status(404).json({ message: "No assignments found.", count: 0, assignments: [] });
        }

        // Tally submitted vs. still-pending-review answers per assignment,
        // so the list view can flag which ones the instructor still needs to score
        const answers = await AssignmentAnswer.findAll({
            where: { AssignmentId: { [Op.in]: assignments.map(a => a.id) } },
            attributes: ["AssignmentId", "Score"]
        });

        const statsByAssignmentId = {};
        for (const answer of answers) {
            const stats = statsByAssignmentId[answer.AssignmentId] || (statsByAssignmentId[answer.AssignmentId] = { submittedCount: 0, pendingReviewCount: 0 });
            stats.submittedCount += 1;
            if (answer.Score === null || answer.Score === undefined) {
                stats.pendingReviewCount += 1;
            }
        }

        const assignmentsWithStats = assignments.map(a => {
            const stats = statsByAssignmentId[a.id] || { submittedCount: 0, pendingReviewCount: 0 };
            return {
                ...a.toJSON(),
                submittedCount: stats.submittedCount,
                pendingReviewCount: stats.pendingReviewCount,
                allReviewed: stats.submittedCount > 0 && stats.pendingReviewCount === 0
            };
        });

        res.status(200).json({
            count: assignmentsWithStats.length,
            assignments: assignmentsWithStats
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

const deleteAssignmentQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if the assignment exists
        const assignment = await AssignmentQuestion.findByPk(id);

        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found." });
        }

        // Delete the assignment
        await assignment.destroy();

        return res.status(200).json({
            message: "Assignment deleted successfully."
        });
    } catch (error) {
        console.error("Error deleting assignment:", error);
        return res.status(500).json({ message: "Error deleting assignment." });
    }
};

module.exports = {
    createAssignmentQuestion,
    getAllAssignmentQuestions,
    updateAssignmentQuestion,
    deleteAssignmentQuestion
};
