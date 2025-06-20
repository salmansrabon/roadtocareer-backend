const MCQ = require("../models/MCQ");
const Course = require("../models/Course");
const sequelize = require("../config/db")
const Student = require("../models/Student");
const McqConfig = require("../models/McqConfig");

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

exports.updateMCQ = async (req, res) => {
    try {
        const { mcq_id } = req.params;
        const { question_title, option_1, option_2, option_3, option_4, correct_answer } = req.body;

        // ✅ Check if MCQ Exists
        const mcq = await MCQ.findByPk(mcq_id);
        if (!mcq) {
            return res.status(404).json({ success: false, message: "MCQ not found." });
        }

        // ✅ Extract Existing MCQ JSON Object
        let updatedMcqQuestion = { ...mcq.mcq_question };

        // ✅ Update Only Provided Fields
        if (question_title) updatedMcqQuestion.question_title = question_title;
        if (option_1) updatedMcqQuestion.option_1 = option_1;
        if (option_2) updatedMcqQuestion.option_2 = option_2;
        if (option_3) updatedMcqQuestion.option_3 = option_3;
        if (option_4) updatedMcqQuestion.option_4 = option_4;
        if (correct_answer) updatedMcqQuestion.correct_answer = correct_answer;

        // ✅ Mark JSON Field as Changed
        mcq.mcq_question = updatedMcqQuestion;
        mcq.changed("mcq_question", true);  // ✅ Explicitly mark JSON field as changed

        // ✅ Update MCQ Record in DB
        await mcq.save();  // ✅ Use save() instead of update()

        return res.status(200).json({
            success: true,
            message: "MCQ updated successfully.",
            updatedMcq: mcq
        });

    } catch (error) {
        console.error("Error updating MCQ:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error." });
    }
};

//delete mcq
exports.deleteMCQ = async (req, res) => {
    try {
        const { mcq_id } = req.params;

        // ✅ Check if MCQ exists
        const mcq = await MCQ.findByPk(mcq_id);
        if (!mcq) {
            return res.status(404).json({
                success: false,
                message: "MCQ not found."
            });
        }

        // ✅ Delete the MCQ
        await mcq.destroy();

        return res.status(200).json({
            success: true,
            message: "MCQ deleted successfully.",
            deletedMcqId: mcq_id
        });

    } catch (error) {
        console.error("❌ Error deleting MCQ:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
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
        const { correct_answer, ...questionWithoutAnswer } = parsedQuestion;
        return res.status(200).json({
            mcq_id: selectedMCQ.id, // ✅ Actual MCQ ID from DB
            ques: questionIndex, // ✅ Row Position after Filtering
            CourseId: selectedMCQ.CourseId,
            mcq_question: questionWithoutAnswer
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

        // ✅ Fetch the MCQ
        const mcq = await MCQ.findOne({ where: { id: mcq_id, CourseId } });
        if (!mcq) {
            return res.status(404).json({ message: "MCQ not found." });
        }

        // ✅ Parse mcq_question
        let mcqQuestion;
        try {
            mcqQuestion = typeof mcq.mcq_question === "string"
                ? JSON.parse(mcq.mcq_question)
                : mcq.mcq_question;
        } catch (error) {
            console.error("❌ Error parsing mcq_question:", error);
            return res.status(500).json({ message: "Invalid JSON format in MCQ data." });
        }

        // ✅ Validate answer
        const isCorrect = mcqQuestion.correct_answer === user_answer;

        // ✅ Fetch student
        const student = await Student.findOne({ where: { StudentId } });
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // ✅ Parse quiz_answer safely
        let quizHistory = [];
        try {
            const raw = student.quiz_answer;
            if (typeof raw === "string") {
                quizHistory = JSON.parse(raw);
                if (!Array.isArray(quizHistory)) {
                    quizHistory = [];
                }
            } else if (Array.isArray(raw)) {
                quizHistory = raw;
            }
        } catch (error) {
            console.warn(`⚠️ Failed to parse quiz_answer for ${StudentId}:`, error.message);
            quizHistory = [];
        }

        // ✅ Push current quiz attempt
        quizHistory.push({
            mcq_id,
            question: mcqQuestion.question_title,
            user_answer,
            correct_answer: mcqQuestion.correct_answer,
            isCorrect,
            attempted_at: new Date().toISOString()
        });

        // ✅ Update the student's quiz_answer as string
        const updatedAnswer = JSON.stringify(quizHistory);
        await student.update({ quiz_answer: updatedAnswer });

        return res.status(200).json({
            isCorrect,
            status: isCorrect ? "Correct answer!" : "Wrong answer!",
            StudentId,
            score: isCorrect ? 1 : 0
        });

    } catch (error) {
        console.error("❌ Error validating MCQ answer:", error);
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
            student_name:student.student_name,
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
exports.getAllStudentsResultsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        // ✅ Fetch all students for the given CourseId
        const students = await Student.findAll({
            where: { CourseId: courseId },
            attributes: ["StudentId", "student_name", "quiz_answer"]
        });

        if (!students.length) {
            return res.status(404).json({ message: "No students found for this course." });
        }

        const studentResults = [];

        for (const student of students) {
            let parsedQuizAnswer;
            try {
                parsedQuizAnswer = typeof student.quiz_answer === "string"
                    ? JSON.parse(student.quiz_answer)
                    : student.quiz_answer;
            } catch (error) {
                console.error("Error parsing quiz_answer JSON:", error);
                continue;
            }

            if (!Array.isArray(parsedQuizAnswer) || parsedQuizAnswer.length === 0) {
                continue;
            }

            let totalMarks = 0;
            const answerSheet = [];

            for (const attempt of parsedQuizAnswer) {
                const { mcq_id, question, user_answer, correct_answer, isCorrect, attempted_at } = attempt;

                if (!mcq_id) {
                    console.warn(`Skipping invalid MCQ entry for student: ${student.StudentId}`);
                    continue;
                }

                if (isCorrect) totalMarks += 1;

                answerSheet.push({
                    mcq_id,
                    question,
                    correct_answer,
                    student_answer: user_answer,
                    isCorrect,
                    attempted_at
                });
            }

            // Find the latest attempted_at in answerSheet (if available)
            let submittedAt = null;
            if (answerSheet.length > 0) {
                submittedAt = answerSheet
                    .map(ans => ans.attempted_at)
                    .filter(Boolean)
                    .sort()
                    .pop();
            }

            const mcqConfig = await McqConfig.findOne({
                where: { CourseId: courseId }
            });

            studentResults.push({
                StudentId: student.StudentId,
                student_name: student.student_name,
                totalMarks: totalMarks,
                totalQuestions: mcqConfig ? mcqConfig.totalQuestion : 0,
                answerSheet,
                submittedAt
            });
        }

        if (studentResults.length === 0) {
            return res.status(404).json({ message: "No quiz results found for this course." });
        }

        return res.status(200).json({ courseId, results: studentResults});

    } catch (error) {
        console.error("Error fetching all students' MCQ results:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};

exports.copyMCQQuestions = async (req, res) => {
    const toCourseId = req.params.CourseId; // Target
    const { CourseId: fromCourseId } = req.body; // Source

    try {
        if (!fromCourseId || !toCourseId) {
            return res.status(400).json({ message: 'Both source and target CourseId are required.' });
        }

        if (fromCourseId === toCourseId) {
            return res.status(400).json({ message: 'Source and target CourseId cannot be the same.' });
        }

        // 1. Get all MCQs from source
        const sourceMcqs = await MCQ.findAll({ where: { CourseId: fromCourseId } });

        if (sourceMcqs.length === 0) {
            return res.status(404).json({ message: 'No MCQs found for the source CourseId.' });
        }

        // 2. Prepare new MCQs for insertion
        const mcqsToInsert = sourceMcqs.map(item => ({
            CourseId: toCourseId,
            mcq_question: typeof item.mcq_question === 'string'
                ? JSON.parse(item.mcq_question)
                : item.mcq_question,

            createdAt: new Date(),
            updatedAt: new Date()
        }));

        // 3. Bulk insert into new CourseId
        await MCQ.bulkCreate(mcqsToInsert);

        res.status(200).json({
            message: `Successfully copied ${mcqsToInsert.length} MCQ(s) from '${fromCourseId}' to '${toCourseId}'`
        });
    } catch (error) {
        console.error('Error copying MCQs:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};





