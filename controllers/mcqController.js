const MCQ = require("../models/MCQ");
const Course = require("../models/Course");
const sequelize = require("../config/db")
const Student = require("../models/Student");
const McqConfig = require("../models/MCQConfig");

exports.addMCQ = async (req, res) => {
    try {
        const { CourseId, mcq_question } = req.body;

        // ✅ Validate Inputs
        if (!CourseId || !mcq_question || !mcq_question.question_title || !mcq_question.correct_answer) {
            return res.status(400).json({ message: "Missing required fields: CourseId, question title, or correct answer." });
        }

        // ✅ Ensure Course Exists
        const course = await Course.findOne({ where: { courseId: CourseId } });
        if (!course) {
            return res.status(404).json({ message: "Course not found." });
        }

        // ✅ Store MCQ in Database
        const newMCQ = await MCQ.create({
            CourseId,
            mcq_question
        });

        return res.status(201).json({ message: "MCQ added successfully!", mcq: newMCQ });

    } catch (error) {
        console.error("Error adding MCQ:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};

// ✅ API to Fetch a Unique Random MCQ
exports.getMCQ = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { ques } = req.query;

        // ✅ Fetch all MCQs for the given CourseId (Ordered by ID)
        const mcqs = await MCQ.findAll({
            where: { CourseId: courseId },
            order: [["id", "ASC"]] // ✅ Ensure ordered retrieval
        });

        if (!mcqs.length) {
            return res.status(404).json({ message: "No MCQs found for this course." });
        }

        // ✅ If `ques` is NOT provided, return all questions
        if (!ques) {
            return res.status(200).json({
                totalQuestions: mcqs.length,
                questions: mcqs.map((mcq, index) => ({
                    mcq_id: mcq.id,
                    ques: index + 1, // ✅ Row Position after Filtering
                    CourseId: mcq.CourseId,
                    mcq_question: typeof mcq.mcq_question === "string"
                        ? JSON.parse(mcq.mcq_question)
                        : mcq.mcq_question
                }))
            });
        }

        // ✅ Ensure `ques` is a valid number
        const questionIndex = parseInt(ques, 10);
        if (isNaN(questionIndex) || questionIndex < 1) {
            return res.status(400).json({ message: "Invalid question number. It must be a positive integer." });
        }

        // ✅ Ensure the requested question exists
        if (questionIndex > mcqs.length) {
            return res.status(404).json({
                message: `Only ${mcqs.length} questions available, requested question ${questionIndex} is out of range.`
            });
        }

        // ✅ Fetch the requested question by its sequential position
        const selectedMCQ = mcqs[questionIndex - 1]; // Index starts from 0 in arrays

        // ✅ Parse mcq_question field
        let parsedQuestion;
        try {
            parsedQuestion = typeof selectedMCQ.mcq_question === "string"
                ? JSON.parse(selectedMCQ.mcq_question)
                : selectedMCQ.mcq_question;
        } catch (error) {
            console.error("Error parsing mcq_question:", error);
            return res.status(500).json({ message: "Invalid JSON format in MCQ data." });
        }

        return res.status(200).json({
            mcq_id: selectedMCQ.id, // ✅ Actual MCQ ID from DB
            ques: questionIndex, // ✅ Row Position after Filtering
            CourseId: selectedMCQ.CourseId,
            mcq_question: parsedQuestion
        });

    } catch (error) {
        console.error("Error fetching MCQ:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};





// ✅ API to Validate MCQ Answer
exports.validateMCQAnswer = async (req, res) => {
    try {
        const { CourseId, StudentId, mcq_id, user_answer } = req.body;

        if (!CourseId || !mcq_id || !user_answer || !StudentId) {
            return res.status(400).json({ message: "Missing required fields: CourseId, mcq_id, StudentId, or user_answer." });
        }

        // ✅ Fetch the MCQ by ID and Course ID
        const mcq = await MCQ.findOne({ where: { id: mcq_id, CourseId } });

        if (!mcq) {
            return res.status(404).json({ message: "MCQ not found." });
        }

        // ✅ Ensure mcq_question is parsed properly
        let mcqQuestion;
        try {
            mcqQuestion = typeof mcq.mcq_question === "string"
                ? JSON.parse(mcq.mcq_question)
                : mcq.mcq_question;
        } catch (error) {
            console.error("Error parsing mcq_question:", error);
            return res.status(500).json({ message: "Invalid JSON format in MCQ data." });
        }

        // ✅ Check if the answer is correct
        const isCorrect = mcqQuestion.correct_answer === user_answer;

        // ✅ Fetch Student Record
        const student = await Student.findOne({ where: { StudentId } });

        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // ✅ Ensure quiz_answer column is stored in JSON format
        let quizHistory;
        try {
            quizHistory = typeof student.quiz_answer === "string"
                ? JSON.parse(student.quiz_answer)
                : student.quiz_answer || [];
        } catch (error) {
            console.error("Error parsing quiz_answer:", error);
            quizHistory = []; // ✅ Default to an empty array if parsing fails
        }

        // ✅ Add the new quiz attempt
        quizHistory.push({
            mcq_id,
            question: mcqQuestion.question_title,
            user_answer,
            correct_answer: mcqQuestion.correct_answer,
            isCorrect,
            attempted_at: new Date().toISOString()
        });

        // ✅ Update Student's quiz_answer column
        await student.update({ quiz_answer: JSON.stringify(quizHistory) });

        return res.status(200).json({
            isCorrect: isCorrect,
            status: isCorrect ? "Correct answer!" : "Wrong answer!",
            StudentId,
            score: isCorrect ? 1 : 0
        });

    } catch (error) {
        console.error("Error validating MCQ answer:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};
exports.getStudentResult = async (req, res) => {
    try {
        const { studentId } = req.params;

        // ✅ Fetch student details
        const student = await Student.findOne({
            where: { StudentId: studentId }
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // ✅ Parse quiz_answer field safely
        let parsedQuizAnswer;
        try {
            parsedQuizAnswer = typeof student.quiz_answer === "string"
                ? JSON.parse(student.quiz_answer)
                : student.quiz_answer;
        } catch (error) {
            console.error("Error parsing quiz_answer JSON:", error);
            return res.status(500).json({ message: "Invalid quiz_answer format in database." });
        }

        // ✅ Ensure quiz_answer is an array
        if (!Array.isArray(parsedQuizAnswer) || parsedQuizAnswer.length === 0) {
            return res.status(404).json({ message: "No MCQ responses found for this student." });
        }

        let totalMarks = 0;
        const answerSheet = [];

        for (const attempt of parsedQuizAnswer) {
            const { mcq_id, question, user_answer, correct_answer, isCorrect, attempted_at } = attempt;

            // ✅ Validate mcq_id
            if (!mcq_id) {
                console.warn(`Skipping invalid MCQ entry for student: ${studentId}`);
                continue;
            }

            // ✅ Compute total marks
            if (isCorrect) totalMarks += 1;

            // ✅ Push to answer sheet
            answerSheet.push({
                mcq_id,
                question,
                correct_answer,
                student_answer: user_answer,
                isCorrect,
                attempted_at
            });
        }

        const mcqConfig = await McqConfig.findOne({
            where: { CourseId: student.CourseId }
        });


        return res.status(200).json({
            StudentId: studentId,
            totalMarks: totalMarks,
            totalQuestions: mcqConfig.totalQuestion,
            answerSheet
        });

    } catch (error) {
        console.error("Error fetching student MCQ result:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};

exports.checkQuizAttempt = async (req, res) => {
    try {
        const { studentId } = req.params;

        if (!studentId) {
            return res.status(400).json({ message: "Student ID is required." });
        }

        // ✅ Fetch Student
        const student = await Student.findOne({ where: { StudentId: studentId } });

        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // ✅ Check quiz_answer field
        if (student.quiz_answer && student.quiz_answer !== "[]" && student.quiz_answer !== "{}") {
            return res.status(200).json(
                {
                    isEligible: false,
                    message: "You have already attempted the quiz."
                }
            );
        }

        return res.status(200).json(
            {
                isEligible: true,
                message: "You have not attempted the quiz yet."

            });

    } catch (error) {
        console.error("Error checking quiz attempt:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};




