const AssignmentQuestion = require('../models/AssignmentQuestion');
const Student = require('../models/Student');
const User = require('../models/User');
const { sendEmail } = require("../utils/emailHelper");

const createAssignmentQuestion = async (req, res) => {
    try {
        // 1. Create the assignment in DB
        const newAssignment = await AssignmentQuestion.create(req.body);

        // 2. Get students directly from DB for given courseId
        const courseId = req.body.courseId;
        const students = await Student.findAll({
            where: { CourseId: courseId },
            include: [{ model: User, attributes: ["email", "isValid"] }]
        });

        console.log(students);

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
  📝 Description: ${req.body.Description}
  ⏳ Submission Deadline: ${submissionDeadline}
  
  Please make sure to submit it before the deadline.Login your portal to check the assignment details.
  
  Regards,
  Team, Road to SDET`;

        // 3. Send emails to all students (only if email exists and isValid === 0)
        for (const student of students) {
            if (student.email && student.User?.isValid === 1) {
                await sendEmail(student.email, subject, text);
                console.log(`📧 Email sent to ${student.email}`);
            }
        }

        // 4. Return success response
        console.log("✅ Assignment created and emails sent successfully.");
        res.status(201).json(newAssignment);
    } catch (error) {
        console.error("❌ Error creating assignment or sending emails:", error);
        res.status(500).json({ message: "Error creating assignment question or sending emails" });
    }
};

const getAllAssignmentQuestions = async (req, res) => {
    try {
        const { batch_no, assignmentId, courseId  } = req.query;

        let whereClause = {};

        if (assignmentId) {
            whereClause.id = assignmentId; // ✅ Filter by AssignmentId
        } if (batch_no) {
            whereClause.batch_no = batch_no; // ✅ Otherwise filter by Batch No
        }
        if (courseId) {
            whereClause.courseId = courseId; // ✅ Optional: Filter by CourseId
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
