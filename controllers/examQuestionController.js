const ExamQuestion = require("../models/ExamQuestion");
const Course = require("../models/Course");
const { Op } = require("sequelize");

// Create Exam Questions for a Course
exports.createExamQuestions = async (req, res) => {
    try {
        const { courseId, questions } = req.body;

        // Validate input
        if (!courseId || !questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ 
                message: "CourseId and questions array are required" 
            });
        }

        // Validate each question has required fields
        for (const question of questions) {
            if (!question.question || !question.hint || !question.score) {
                return res.status(400).json({ 
                    message: "Each question must have question, hint, and score fields" 
                });
            }
        }

        // Check if course exists
        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Check if exam questions already exist for this course
        const existingQuestions = await ExamQuestion.findOne({ where: { courseId } });
        if (existingQuestions) {
            return res.status(409).json({ 
                message: "Exam questions already exist for this course. Use update instead." 
            });
        }

        // Create exam questions
        const examQuestions = await ExamQuestion.create({
            courseId,
            questions
        });

        res.status(201).json({
            message: "Exam questions created successfully",
            data: examQuestions
        });

    } catch (error) {
        console.error("Error creating exam questions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Exam Questions by Course ID
exports.getExamQuestionsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        const examQuestions = await ExamQuestion.findOne({
            where: { courseId },
            include: [{
                model: Course,
                attributes: ['courseId', 'course_title', 'batch_no']
            }]
        });

        if (!examQuestions) {
            return res.status(404).json({ message: "No exam questions found for this course" });
        }

        res.status(200).json({
            message: "Exam questions retrieved successfully",
            data: examQuestions
        });

    } catch (error) {
        console.error("Error fetching exam questions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get All Exam Questions (Admin view)
exports.getAllExamQuestions = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows } = await ExamQuestion.findAndCountAll({
            include: [{
                model: Course,
                attributes: ['courseId', 'course_title', 'batch_no']
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            message: "All exam questions retrieved successfully",
            data: {
                questions: rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Error fetching all exam questions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update Exam Questions
exports.updateExamQuestions = async (req, res) => {
    try {
        const { id } = req.params;
        const { questions } = req.body;

        // Validate input
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ 
                message: "Questions array is required" 
            });
        }

        // Validate each question has required fields
        for (const question of questions) {
            if (!question.question || !question.hint || !question.score) {
                return res.status(400).json({ 
                    message: "Each question must have question, hint, and score fields" 
                });
            }
        }

        const examQuestions = await ExamQuestion.findByPk(id);
        if (!examQuestions) {
            return res.status(404).json({ message: "Exam questions not found" });
        }

        await examQuestions.update({ questions });

        res.status(200).json({
            message: "Exam questions updated successfully",
            data: examQuestions
        });

    } catch (error) {
        console.error("Error updating exam questions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Delete Exam Questions
exports.deleteExamQuestions = async (req, res) => {
    try {
        const { id } = req.params;

        const examQuestions = await ExamQuestion.findByPk(id);
        if (!examQuestions) {
            return res.status(404).json({ message: "Exam questions not found" });
        }

        await examQuestions.destroy();

        res.status(200).json({
            message: "Exam questions deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting exam questions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
