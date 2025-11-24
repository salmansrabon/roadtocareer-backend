const ExamConfig = require("../models/ExamConfig");
const Course = require("../models/Course");
const Student = require("../models/Student");
const { Op } = require("sequelize");

// Create Exam Configuration
exports.createExamConfig = async (req, res) => {
    try {
        const {
            courseId,
            exam_title,
            exam_description,
            totalQuestion,
            isActive = false,
            start_datetime,
            end_datetime,
            totalTime
        } = req.body;

        // Validate required fields
        if (!courseId || !exam_title || !totalQuestion || !start_datetime || !end_datetime || !totalTime) {
            return res.status(400).json({
                message: "CourseId, exam_title, totalQuestion, start_datetime, end_datetime, and totalTime are required"
            });
        }

        // Validate datetime format and logic
        const startDate = new Date(start_datetime);
        const endDate = new Date(end_datetime);

        if (startDate >= endDate) {
            return res.status(400).json({
                message: "End datetime must be after start datetime"
            });
        }

        if (endDate <= new Date()) {
            return res.status(400).json({
                message: "End datetime must be in the future"
            });
        }

        // Check if course exists
        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Create exam configuration
        const examConfig = await ExamConfig.create({
            courseId,
            exam_title,
            exam_description,
            totalQuestion: parseInt(totalQuestion),
            isActive: Boolean(isActive),
            start_datetime: startDate,
            end_datetime: endDate,
            totalTime: parseInt(totalTime)
        });

        res.status(201).json({
            message: "Exam configuration created successfully",
            data: examConfig
        });

    } catch (error) {
        console.error("Error creating exam configuration:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get All Exam Configurations (Admin view)
exports.getAllExamConfigs = async (req, res) => {
    try {
        const { page = 1, limit = 10, isActive } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (isActive !== undefined) {
            whereClause.isActive = isActive === 'true';
        }

        const { count, rows } = await ExamConfig.findAndCountAll({
            where: whereClause,
            include: [{
                model: Course,
                attributes: ['courseId', 'course_title', 'batch_no']
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            message: "Exam configurations retrieved successfully",
            data: {
                examConfigs: rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Error fetching exam configurations:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Exam Configuration by ID
exports.getExamConfigById = async (req, res) => {
    try {
        const { id } = req.params;

        const examConfig = await ExamConfig.findByPk(id, {
            include: [{
                model: Course,
                attributes: ['courseId', 'course_title', 'batch_no']
            }]
        });

        if (!examConfig) {
            return res.status(404).json({ message: "Exam configuration not found" });
        }

        res.status(200).json({
            message: "Exam configuration retrieved successfully",
            data: examConfig
        });

    } catch (error) {
        console.error("Error fetching exam configuration:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update Exam Configuration
exports.updateExamConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            exam_title,
            exam_description,
            totalQuestion,
            isActive,
            start_datetime,
            end_datetime,
            totalTime
        } = req.body;

        const examConfig = await ExamConfig.findByPk(id);
        if (!examConfig) {
            return res.status(404).json({ message: "Exam configuration not found" });
        }

        // Validate datetime if provided
        if (start_datetime && end_datetime) {
            const startDate = new Date(start_datetime);
            const endDate = new Date(end_datetime);

            if (startDate >= endDate) {
                return res.status(400).json({
                    message: "End datetime must be after start datetime"
                });
            }
        }

        // Update fields if provided
        const updateData = {};
        if (exam_title) updateData.exam_title = exam_title;
        if (exam_description !== undefined) updateData.exam_description = exam_description;
        if (totalQuestion) updateData.totalQuestion = parseInt(totalQuestion);
        if (isActive !== undefined) updateData.isActive = Boolean(isActive);
        if (start_datetime) updateData.start_datetime = new Date(start_datetime);
        if (end_datetime) updateData.end_datetime = new Date(end_datetime);
        if (totalTime) updateData.totalTime = parseInt(totalTime);

        await examConfig.update(updateData);

        res.status(200).json({
            message: "Exam configuration updated successfully",
            data: examConfig
        });

    } catch (error) {
        console.error("Error updating exam configuration:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Delete Exam Configuration
exports.deleteExamConfig = async (req, res) => {
    try {
        const { id } = req.params;

        const examConfig = await ExamConfig.findByPk(id);
        if (!examConfig) {
            return res.status(404).json({ message: "Exam configuration not found" });
        }

        await examConfig.destroy();

        res.status(200).json({
            message: "Exam configuration deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting exam configuration:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Active Exams for Student's Course/Batch
exports.getActiveExamsForStudent = async (req, res) => {
    try {
        const studentId = req.user.username; // From JWT token (username contains StudentId)
        
        console.log("Fetching active exams for student:", studentId);

        // Get student details to find their course and batch
        const student = await Student.findOne({
            where: { StudentId: studentId },
            include: [{
                model: Course,
                attributes: ['courseId', 'course_title', 'batch_no']
            }]
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Get active exams for student's course
        // Use UTC time for consistent global comparison - database should store UTC times
        const now = new Date();
        console.log("Server UTC time:", now.toISOString());
        console.log("Server local time:", now.toString());
        
        // Get all exams for this course first
        const allExams = await ExamConfig.findAll({
            where: {
                courseId: student.CourseId,
                isActive: true
            },
            include: [{
                model: Course,
                attributes: ['courseId', 'course_title', 'batch_no']
            }],
            order: [['start_datetime', 'ASC']]
        });
        
        console.log("All active exams for course:", JSON.stringify(allExams.map(exam => ({
            id: exam.id,
            title: exam.exam_title,
            start: exam.start_datetime,
            end: exam.end_datetime,
            startISO: new Date(exam.start_datetime).toISOString(),
            endISO: new Date(exam.end_datetime).toISOString(),
            isActive: exam.isActive
        })), null, 2));
        
        // Filter exams that are currently active based on UTC time
        const activeExams = await ExamConfig.findAll({
            where: {
                courseId: student.CourseId,
                isActive: true,
                start_datetime: { [Op.lte]: now },
                end_datetime: { [Op.gte]: now }
            },
            include: [{
                model: Course,
                attributes: ['courseId', 'course_title', 'batch_no']
            }],
            order: [['start_datetime', 'ASC']]
        });
        
        console.log("Time-filtered active exams:", JSON.stringify(activeExams.map(exam => ({
            id: exam.id,
            title: exam.exam_title,
            start: exam.start_datetime,
            end: exam.end_datetime,
            startISO: new Date(exam.start_datetime).toISOString(),
            endISO: new Date(exam.end_datetime).toISOString()
        })), null, 2));

        res.status(200).json({
            message: "Active exams retrieved successfully",
            data: {
                student: {
                    studentId: student.StudentId,
                    studentName: student.student_name,
                    batch: student.batch_no,
                    course: student.Course
                },
                activeExams
            }
        });

    } catch (error) {
        console.error("Error fetching active exams for student:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Student Submissions for an Exam (Admin view)
exports.getExamSubmissions = async (req, res) => {
    try {
        const { examId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // Get exam configuration
        const examConfig = await ExamConfig.findByPk(examId, {
            include: [{
                model: Course,
                attributes: ['courseId', 'course_title', 'batch_no']
            }]
        });

        if (!examConfig) {
            return res.status(404).json({ message: "Exam configuration not found" });
        }

        // Get all students for this course
        const { count, rows: students } = await Student.findAndCountAll({
            where: { CourseId: examConfig.courseId },
            attributes: [
                'id', 'StudentId', 'student_name', 'email', 'batch_no', 'exam_answer'
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['student_name', 'ASC']]
        });

        // Filter students who have submitted this exam
        const studentsWithSubmissions = students.map(student => {
            const examAnswers = student.exam_answer || [];
            const examSubmission = examAnswers.find(answer => 
                answer.exam_id === parseInt(examId)
            );

            return {
                ...student.toJSON(),
                hasSubmitted: !!examSubmission,
                submissionData: examSubmission || null
            };
        });

        res.status(200).json({
            message: "Exam submissions retrieved successfully",
            data: {
                examConfig,
                students: studentsWithSubmissions,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error("Error fetching exam submissions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
