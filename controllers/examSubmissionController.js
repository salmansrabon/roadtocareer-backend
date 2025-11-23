const ExamConfig = require("../models/ExamConfig");
const ExamQuestion = require("../models/ExamQuestion");
const Student = require("../models/Student");
const Course = require("../models/Course");
const { Op } = require("sequelize");

// Get Exam for Student (without hints)
exports.getExamForStudent = async (req, res) => {
    try {
        const { examId } = req.params;
        const studentId = req.user.username; // From JWT token (username contains StudentId)

        // Get student details
        const student = await Student.findOne({
            where: { StudentId: studentId }
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Get exam configuration
        const examConfig = await ExamConfig.findByPk(examId, {
            include: [{
                model: Course,
                attributes: ['courseId', 'course_title', 'batch_no']
            }]
        });

        if (!examConfig) {
            return res.status(404).json({ message: "Exam not found" });
        }

        // Check if exam is for student's course
        if (examConfig.courseId !== student.CourseId) {
            return res.status(403).json({ message: "Exam not available for your course" });
        }

        // Check if exam is active and within time range
        const now = new Date();
        if (!examConfig.isActive) {
            return res.status(403).json({ message: "Exam is not active" });
        }

        if (now < examConfig.start_datetime) {
            return res.status(403).json({ message: "Exam has not started yet" });
        }

        if (now > examConfig.end_datetime) {
            return res.status(403).json({ message: "Exam has ended" });
        }

        // Check if student has already submitted
        const studentAnswers = student.exam_answer || [];
        const hasSubmitted = studentAnswers.some(answer => answer.exam_id === parseInt(examId));

        if (hasSubmitted) {
            return res.status(409).json({ message: "You have already submitted this exam" });
        }

        // Get exam questions (without hints)
        const examQuestions = await ExamQuestion.findOne({
            where: { courseId: examConfig.courseId }
        });

        if (!examQuestions) {
            return res.status(404).json({ message: "No questions found for this exam" });
        }

        // Remove hints from questions for student view
        const questionsForStudent = examQuestions.questions.map((q, index) => ({
            questionNumber: index + 1,
            question: q.question,
            score: q.score
        }));

        res.status(200).json({
            message: "Exam retrieved successfully",
            data: {
                examConfig: {
                    id: examConfig.id,
                    exam_title: examConfig.exam_title,
                    exam_description: examConfig.exam_description,
                    totalQuestion: examConfig.totalQuestion,
                    totalTime: examConfig.totalTime,
                    end_datetime: examConfig.end_datetime
                },
                questions: questionsForStudent
            }
        });

    } catch (error) {
        console.error("Error getting exam for student:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Submit Exam Answers
exports.submitExamAnswers = async (req, res) => {
    try {
        const { examId } = req.params;
        const { answers } = req.body; // Array of {questionNumber, answer}
        const studentId = req.user.username; // From JWT token (username contains StudentId)

        // Validate input
        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ message: "Answers array is required" });
        }

        // Get student
        const student = await Student.findOne({
            where: { StudentId: studentId }
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Get exam configuration
        const examConfig = await ExamConfig.findByPk(examId);
        if (!examConfig) {
            return res.status(404).json({ message: "Exam not found" });
        }

        // Check if exam is still active and within time
        const now = new Date();
        if (now > examConfig.end_datetime) {
            return res.status(403).json({ message: "Exam submission time has ended" });
        }

        // Check if student has already submitted
        const existingAnswers = student.exam_answer || [];
        const hasSubmitted = existingAnswers.some(answer => answer.exam_id === parseInt(examId));

        if (hasSubmitted) {
            return res.status(409).json({ message: "You have already submitted this exam" });
        }

        // Get exam questions
        const examQuestions = await ExamQuestion.findOne({
            where: { courseId: examConfig.courseId }
        });

        if (!examQuestions) {
            return res.status(404).json({ message: "Exam questions not found" });
        }

        // Create submission data
        const submissionData = {
            exam_id: parseInt(examId),
            exam_title: examConfig.exam_title,
            studentId: student.StudentId,
            student_name: student.student_name,
            course_id: student.CourseId,
            batch_no: student.batch_no,
            submission_time: now.toISOString(),
            answers: answers.map((studentAnswer, index) => {
                const questionData = examQuestions.questions[studentAnswer.questionNumber - 1];
                return {
                    questionNumber: studentAnswer.questionNumber,
                    question: questionData?.question || '',
                    student_answer: studentAnswer.answer,
                    hint: questionData?.hint || '',
                    max_score: questionData?.score || 0,
                    score: null, // To be filled by admin during evaluation
                    feedback: null // To be filled by admin during evaluation
                };
            }),
            total_score: null, // To be calculated during evaluation
            is_evaluated: false
        };

        // Update student's exam_answer field
        const updatedAnswers = [...existingAnswers, submissionData];
        await student.update({ exam_answer: updatedAnswers });

        res.status(201).json({
            message: "Exam submitted successfully",
            data: {
                submissionTime: submissionData.submission_time,
                totalQuestions: answers.length
            }
        });

    } catch (error) {
        console.error("Error submitting exam:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Student's Exam Result
exports.getStudentExamResult = async (req, res) => {
    try {
        const { examId } = req.params;
        const studentId = req.user.username; // From JWT token (username contains StudentId)

        const student = await Student.findOne({
            where: { StudentId: studentId }
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const examAnswers = student.exam_answer || [];
        const examResult = examAnswers.find(answer => answer.exam_id === parseInt(examId));

        if (!examResult) {
            return res.status(404).json({ message: "No submission found for this exam" });
        }

        // Return result only if evaluated
        if (!examResult.is_evaluated) {
            return res.status(200).json({
                message: "Exam submitted but not yet evaluated",
                data: {
                    submitted: true,
                    evaluated: false,
                    submission_time: examResult.submission_time
                }
            });
        }

        res.status(200).json({
            message: "Exam result retrieved successfully",
            data: {
                submitted: true,
                evaluated: true,
                exam_title: examResult.exam_title,
                submission_time: examResult.submission_time,
                total_score: examResult.total_score,
                max_possible_score: examResult.answers.reduce((sum, ans) => sum + (ans.max_score || 0), 0),
                answers: examResult.answers.map(ans => ({
                    questionNumber: ans.questionNumber,
                    question: ans.question,
                    student_answer: ans.student_answer,
                    score: ans.score,
                    max_score: ans.max_score,
                    feedback: ans.feedback
                }))
            }
        });

    } catch (error) {
        console.error("Error getting exam result:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Evaluate Student Submission (Admin only)
exports.evaluateStudentSubmission = async (req, res) => {
    try {
        const { examId, studentId } = req.params;
        const { evaluations } = req.body; // Array of {questionNumber, score, feedback}

        console.log("=== EVALUATION REQUEST ===");
        console.log("Exam ID:", examId);
        console.log("Student ID:", studentId);
        console.log("Evaluations received:", evaluations);

        // Validate input
        if (!evaluations || !Array.isArray(evaluations)) {
            return res.status(400).json({ message: "Evaluations array is required" });
        }

        // Get student
        const student = await Student.findOne({
            where: { StudentId: studentId }
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        console.log("Student found:", student.student_name);
        console.log("Current exam_answer:", JSON.stringify(student.exam_answer, null, 2));

        // Get student's exam answer
        const examAnswers = [...(student.exam_answer || [])]; // Create a copy
        const examIndex = examAnswers.findIndex(answer => answer.exam_id === parseInt(examId));

        if (examIndex === -1) {
            return res.status(404).json({ message: "No submission found for this exam" });
        }

        console.log("Found exam submission at index:", examIndex);
        console.log("Original submission:", JSON.stringify(examAnswers[examIndex], null, 2));

        // Update scores and feedback
        let totalScore = 0;
        const updatedAnswers = examAnswers[examIndex].answers.map(answer => {
            const evaluation = evaluations.find(evalItem => evalItem.questionNumber === answer.questionNumber);
            if (evaluation) {
                const newScore = parseFloat(evaluation.score) || 0;
                const newFeedback = evaluation.feedback || '';
                
                console.log(`Updating Q${answer.questionNumber}: score ${answer.score} → ${newScore}, feedback: "${newFeedback}"`);
                
                answer.score = newScore;
                answer.feedback = newFeedback;
                totalScore += newScore;
            }
            return answer;
        });

        // Update submission data
        examAnswers[examIndex].answers = updatedAnswers;
        examAnswers[examIndex].total_score = totalScore;
        examAnswers[examIndex].is_evaluated = true;
        examAnswers[examIndex].evaluation_date = new Date().toISOString();

        console.log("Final updated exam_answer:", JSON.stringify(examAnswers, null, 2));

        // Use raw SQL update to force JSON field update
        const sequelize = require('../config/db');
        const updateQuery = `
            UPDATE students 
            SET exam_answer = :examAnswer, updatedAt = NOW() 
            WHERE StudentId = :studentId
        `;
        
        await sequelize.query(updateQuery, {
            replacements: {
                examAnswer: JSON.stringify(examAnswers),
                studentId: studentId
            },
            type: sequelize.QueryTypes.UPDATE
        });

        console.log("Database update completed using raw SQL");

        // Verify the update by fetching the student again
        const verifyStudent = await Student.findOne({
            where: { StudentId: studentId }
        });
        console.log("Verification - Updated exam_answer:", JSON.stringify(verifyStudent.exam_answer, null, 2));

        // Double check that the specific exam was updated
        const verifyExamSubmission = verifyStudent.exam_answer.find(answer => answer.exam_id === parseInt(examId));
        console.log("Verified exam submission:", JSON.stringify(verifyExamSubmission, null, 2));
        
        if (!verifyExamSubmission || !verifyExamSubmission.is_evaluated) {
            console.error("WARNING: Evaluation was not saved properly!");
            throw new Error("Failed to save evaluation to database");
        }

        res.status(200).json({
            message: "Exam evaluation completed successfully",
            data: {
                studentId: student.StudentId,
                studentName: student.student_name,
                totalScore: totalScore,
                evaluatedAnswers: updatedAnswers.length
            }
        });

    } catch (error) {
        console.error("Error evaluating exam submission:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Get Student Submission for Evaluation (Admin only)
exports.getStudentSubmissionForEvaluation = async (req, res) => {
    try {
        const { examId, studentId } = req.params;

        const student = await Student.findOne({
            where: { StudentId: studentId }
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const examAnswers = student.exam_answer || [];
        const submission = examAnswers.find(answer => answer.exam_id === parseInt(examId));

        if (!submission) {
            return res.status(404).json({ message: "No submission found for this exam" });
        }

        res.status(200).json({
            message: "Student submission retrieved successfully",
            data: {
                student: {
                    studentId: student.StudentId,
                    studentName: student.student_name,
                    email: student.email,
                    batch: student.batch_no
                },
                submission
            }
        });

    } catch (error) {
        console.error("Error getting student submission for evaluation:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
