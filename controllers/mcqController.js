const MCQ = require("../models/MCQ");
const Course = require("../models/Course");
const sequelize = require("../config/db")
const Student = require("../models/Student");
const McqConfig = require("../models/McqConfig");
const { notifyRoles } = require("../utils/notificationHelper");
const { NOTIFICATION_TYPES, ENTITY_TYPES } = require("../utils/notificationTypes");

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
// Courses that have at least one MCQ, with their question counts (import sources).
exports.getCoursesWithMcqs = async (req, res) => {
    try {
        const rows = await MCQ.findAll({
            attributes: ['CourseId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['CourseId'],
            raw: true
        });
        res.status(200).json({
            courses: rows.map(r => ({ CourseId: r.CourseId, count: Number(r.count) }))
        });
    } catch (error) {
        console.error('Error fetching courses with MCQs:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

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





// ---------------------------------------------------------------------------
// Quiz attempt state
//
// students.quiz_started_at is stamped the moment the student opens the quiz
// (POST /mcq/start) and is the single source of the quiz clock:
// quiz_started_at + config.totalTime. A refresh, crash or lost connection can
// never restart it.
//
// Answers are saved one by one while the student takes the quiz and live in
// students.quiz_answer (a JSON array, one entry per question). `submitted_at`
// is stamped on every entry when the student submits (or the page auto-submits
// at 0:00) and ends the attempt early. Saved answers with no quiz_started_at
// predate this column and count as a finished attempt.
// ---------------------------------------------------------------------------
const QUIZ_SAVE_GRACE_MS = 10 * 1000; // lets the final auto-save land right at 0:00

const parseQuizAnswers = (raw) => {
    try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("⚠️ Failed to parse quiz_answer:", error.message);
        return [];
    }
};

// status: fresh (not started) | in_progress | expired (time up, not submitted)
// | finished (submitted, or a pre-change attempt)
const getQuizState = (startedAt, entries, totalTimeMin, now = Date.now()) => {
    const totalMs = totalTimeMin * 60 * 1000;
    if (!startedAt) {
        return entries.length > 0
            ? { status: "finished", remainingMs: 0 }
            : { status: "fresh", remainingMs: totalMs };
    }
    if (entries.some(e => e.submitted_at)) {
        return { status: "finished", remainingMs: 0 };
    }
    const endsAt = new Date(startedAt).getTime() + totalMs;
    const remainingMs = Math.max(0, endsAt - now);
    return { status: remainingMs > 0 ? "in_progress" : "expired", remainingMs, endsAt };
};

// quiz_started_at is a DATETIME (no fractional seconds): stamp whole seconds so
// the value returned right after stamping equals what every later read returns.
const wholeSecond = (ms) => new Date(Math.floor(ms / 1000) * 1000);

const answersByMcqId = (entries) =>
    Object.fromEntries(entries.map(e => [e.mcq_id, e.user_answer]));

// A student may only act on their own quiz (admins/teachers are not blocked).
const isOtherStudent = (req, studentId) =>
    req.user?.role === "student" && req.user.username !== studentId;

// ✅ API to start (or resume) the logged-in student's quiz. Stamps the start
// time on first call; later calls return the same clock plus saved answers, so
// the page can resume after a refresh. Idempotent.
exports.startQuiz = async (req, res) => {
    try {
        const studentId = req.user?.username;
        if (!studentId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const outcome = await sequelize.transaction(async (t) => {
            const student = await Student.findOne({
                where: { StudentId: studentId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            if (!student) return { code: 404, body: { message: "Student not found." } };

            const config = await McqConfig.findOne({ where: { CourseId: student.CourseId }, transaction: t });
            if (!config) return { code: 404, body: { message: "Quiz configuration not found." } };

            const entries = parseQuizAnswers(student.quiz_answer);
            const now = Date.now();
            let startedAt = student.quiz_started_at;
            const state = getQuizState(startedAt, entries, config.totalTime, now);

            if (state.status === "finished" || state.status === "expired") {
                return { code: 403, body: { message: "You have already attempted the quiz." } };
            }

            if (state.status === "fresh") {
                // A NEW attempt may only begin while the quiz is active and inside
                // its start/end window. Resuming one already in progress (above) is
                // not blocked: the student's own clock governs it.
                const opensAt = new Date(config.start_datetime).getTime();
                const closesAt = new Date(config.end_datetime).getTime();
                if (!config.isActive || now < opensAt || now > closesAt) {
                    return { code: 403, body: { message: "Quiz is not available at this time.", code: "QUIZ_UNAVAILABLE" } };
                }
                startedAt = wholeSecond(now);
                await student.update({ quiz_started_at: startedAt }, { transaction: t });
            }

            const after = getQuizState(startedAt, entries, config.totalTime, now);
            return {
                code: 200,
                body: {
                    message: state.status === "fresh" ? "Quiz started." : "Quiz resumed.",
                    resume: state.status === "in_progress",
                    startedAt: new Date(startedAt).toISOString(),
                    remainingSeconds: Math.ceil(after.remainingMs / 1000),
                    answers: answersByMcqId(entries)
                }
            };
        });

        return res.status(outcome.code).json(outcome.body);
    } catch (error) {
        console.error("❌ Error starting quiz:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};

// ✅ API to save a student's answer for one MCQ (called as each option is picked)
exports.validateMCQAnswer = async (req, res) => {
    try {
        const { CourseId, StudentId, mcq_id, user_answer } = req.body;

        if (!CourseId || !mcq_id || !user_answer || !StudentId) {
            return res.status(400).json({ message: "Missing required fields: CourseId, mcq_id, StudentId, or user_answer." });
        }

        if (isOtherStudent(req, StudentId)) {
            return res.status(403).json({ message: "You can only save your own quiz answers." });
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

        const isCorrect = mcqQuestion.correct_answer === user_answer;

        // Row lock: answers arrive in quick succession and each one is a
        // read-modify-write of the same JSON column.
        const outcome = await sequelize.transaction(async (t) => {
            const student = await Student.findOne({
                where: { StudentId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            if (!student) return { code: 404, body: { message: "Student not found." } };

            const config = await McqConfig.findOne({ where: { CourseId: student.CourseId }, transaction: t });
            if (!config) return { code: 404, body: { message: "Quiz configuration not found." } };

            const entries = parseQuizAnswers(student.quiz_answer);
            const now = Date.now();
            const state = getQuizState(student.quiz_started_at, entries, config.totalTime, now);
            const canSave =
                state.status === "fresh" ||
                state.status === "in_progress" ||
                (state.status === "expired" && now - state.endsAt <= QUIZ_SAVE_GRACE_MS);
            if (!canSave) {
                return { code: 403, body: { message: "The quiz is already submitted or the time is over." } };
            }

            const existingIndex = entries.findIndex(e => String(e.mcq_id) === String(mcq.id));
            const entry = {
                mcq_id: mcq.id,
                question: mcqQuestion.question_title,
                user_answer,
                correct_answer: mcqQuestion.correct_answer,
                isCorrect,
                attempted_at: new Date(now).toISOString()
            };
            if (existingIndex >= 0) {
                entries[existingIndex] = entry; // changing an answer replaces it, never duplicates
            } else {
                entries.push(entry);
            }

            // A save for a quiz that was never explicitly started (e.g. a tab
            // opened before this change) starts the clock now.
            const startedAt = student.quiz_started_at || wholeSecond(now);
            const updates = { quiz_answer: JSON.stringify(entries) };
            if (!student.quiz_started_at) updates.quiz_started_at = startedAt;
            await student.update(updates, { transaction: t });

            const after = getQuizState(startedAt, entries, config.totalTime, now);
            return {
                code: 200,
                body: {
                    message: "Answer saved.",
                    StudentId,
                    remainingSeconds: Math.ceil(after.remainingMs / 1000)
                }
            };
        });

        // Deliberately no isCorrect/score in the response: answers are saved
        // mid-quiz, and returning correctness would let students see which
        // answers are wrong and change them.
        return res.status(outcome.code).json(outcome.body);

    } catch (error) {
        console.error("❌ Error saving MCQ answer:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};

// ✅ API to finalize the logged-in student's quiz attempt (manual submit or
// the page's auto-submit at 0:00). Answers are already saved; this ends the
// attempt so it cannot be resumed. Idempotent.
exports.submitQuiz = async (req, res) => {
    try {
        const studentId = req.user?.username;
        if (!studentId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const outcome = await sequelize.transaction(async (t) => {
            const student = await Student.findOne({
                where: { StudentId: studentId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            if (!student) return { code: 404, body: { message: "Student not found." } };

            const entries = parseQuizAnswers(student.quiz_answer);
            if (entries.length === 0) {
                // Never started: nothing to end.
                if (!student.quiz_started_at) {
                    return { code: 400, body: { message: "No answers to submit." } };
                }
                // Started but nothing answered (e.g. the page auto-submitted after
                // the student left the quiz tab). There is no answer to stamp
                // `submitted_at` on, so end the attempt by moving the clock to
                // already-elapsed; the student cannot resume it. Idempotent.
                const config = await McqConfig.findOne({ where: { CourseId: student.CourseId }, transaction: t });
                if (config && getQuizState(student.quiz_started_at, entries, config.totalTime).status === "in_progress") {
                    await student.update(
                        { quiz_started_at: wholeSecond(Date.now() - config.totalTime * 60 * 1000) },
                        { transaction: t }
                    );
                }
                return { code: 200, body: { message: "Quiz ended with no answers.", answered: 0 } };
            }

            // Only the call that actually finalizes the attempt notifies the admins;
            // a repeat or double submit finds everything already stamped.
            let justFinalized = null;
            if (entries.some(e => !e.submitted_at)) {
                const submittedAt = new Date().toISOString();
                const stamped = entries.map(e => (e.submitted_at ? e : { ...e, submitted_at: submittedAt }));
                await student.update({ quiz_answer: JSON.stringify(stamped) }, { transaction: t });
                justFinalized = {
                    studentId: student.StudentId,
                    studentName: student.student_name,
                    courseId: student.CourseId,
                    answered: entries.length,
                    correct: entries.filter(e => e.isCorrect).length
                };
            }

            return { code: 200, body: { message: "Quiz submitted.", answered: entries.length }, justFinalized };
        });

        // 🔔 Tell the admins (in-app only, no email) after the transaction has
        // committed. notify() never throws, so it cannot fail the submission.
        if (outcome.justFinalized) {
            const q = outcome.justFinalized;
            await notifyRoles(["admin"], {
                type: NOTIFICATION_TYPES.QUIZ_SUBMITTED,
                title: "New quiz submission",
                body: `${q.studentName || q.studentId} submitted the quiz: ${q.correct} correct out of ${q.answered} answered.`,
                link: `/admin/quizzes/results/${q.studentId}`,
                actorUsername: q.studentId,
                actorName: q.studentName || q.studentId,
                entityType: ENTITY_TYPES.QUIZ_ATTEMPT,
                entityId: q.studentId,
                metadata: {
                    studentId: q.studentId,
                    courseId: q.courseId,
                    answered: q.answered,
                    correct: q.correct,
                },
            });
        }

        return res.status(outcome.code).json(outcome.body);
    } catch (error) {
        console.error("❌ Error submitting quiz:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
};


// ✅ API for admins/teachers: reset a student's quiz so they can attempt it again.
// Clears the saved answers (and so the result) and the start time, which gives
// the student a fresh clock on their next start. Irreversible.
exports.resetQuiz = async (req, res) => {
    try {
        const { studentId } = req.params;

        const outcome = await sequelize.transaction(async (t) => {
            const student = await Student.findOne({
                where: { StudentId: studentId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            if (!student) return { code: 404, body: { message: "Student not found." } };

            const clearedAnswers = parseQuizAnswers(student.quiz_answer).length;
            await student.update({ quiz_answer: null, quiz_started_at: null }, { transaction: t });

            return {
                code: 200,
                body: {
                    message: `Quiz reset for ${studentId}. They can attempt it again.`,
                    clearedAnswers
                }
            };
        });

        if (outcome.code === 200) {
            console.log(`🔄 Quiz reset for ${studentId} by ${req.user?.username} (${outcome.body.clearedAnswers} answer(s) cleared)`);
        }
        return res.status(outcome.code).json(outcome.body);
    } catch (error) {
        console.error("❌ Error resetting quiz:", error);
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
            // An attempt that ended with nothing answered (time ran out, or the
            // page auto-submitted after the student left the tab) is a real
            // submission scored 0, matching the admin results list.
            const endedConfig = student.quiz_started_at
                ? await McqConfig.findOne({ where: { CourseId: student.CourseId } })
                : null;
            if (endedConfig && getQuizState(student.quiz_started_at, [], endedConfig.totalTime).status === "expired") {
                return res.status(200).json({
                    student_name: student.student_name,
                    StudentId: studentId,
                    totalMarks: 0,
                    totalQuestions: endedConfig.totalQuestion,
                    answerSheet: []
                });
            }
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

// Read-only eligibility check (the landing page's "Start Quiz" gate). Eligible
// means the student can start or resume; it never starts the clock itself.
exports.checkQuizAttempt = async (req, res) => {
    try {
        const { studentId } = req.params;

        if (!studentId) {
            return res.status(400).json({ message: "Student ID is required." });
        }

        if (isOtherStudent(req, studentId)) {
            return res.status(403).json({ message: "You can only check your own quiz attempt." });
        }

        // ✅ Fetch Student
        const student = await Student.findOne({ where: { StudentId: studentId } });

        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        const entries = parseQuizAnswers(student.quiz_answer);
        const config = await McqConfig.findOne({ where: { CourseId: student.CourseId } });

        const alreadyAttempted = {
            isEligible: false,
            message: "You have already attempted the quiz."
        };

        // Without a config there is no clock: any saved answer or start = attempted.
        if (!config) {
            return res.status(200).json(
                entries.length > 0 || student.quiz_started_at
                    ? alreadyAttempted
                    : { isEligible: true, message: "You have not attempted the quiz yet." }
            );
        }

        const state = getQuizState(student.quiz_started_at, entries, config.totalTime);

        if (state.status === "finished" || state.status === "expired") {
            return res.status(200).json(alreadyAttempted);
        }

        return res.status(200).json({
            isEligible: true,
            resume: state.status === "in_progress",
            message: state.status === "in_progress"
                ? "You have a quiz in progress."
                : "You have not attempted the quiz yet."
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
            attributes: ["StudentId", "student_name", "quiz_answer", "quiz_started_at"]
        });

        // No students / no submissions yet is an empty list, not an error —
        // the admin results and error-stats pages render their own empty state.
        if (!students.length) {
            return res.status(200).json({ courseId, results: [] });
        }

        const mcqConfig = await McqConfig.findOne({
            where: { CourseId: courseId }
        });

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
                // Started but answered nothing and the attempt is over (time ran
                // out, or the page auto-submitted after the student left the tab):
                // still a submission, scored 0, so the admin can see and reset it.
                // The attempt's end is when its clock ran out.
                if (student.quiz_started_at && mcqConfig) {
                    const state = getQuizState(student.quiz_started_at, [], mcqConfig.totalTime);
                    if (state.status === "expired") {
                        studentResults.push({
                            StudentId: student.StudentId,
                            student_name: student.student_name,
                            totalMarks: 0,
                            totalQuestions: mcqConfig.totalQuestion,
                            answerSheet: [],
                            startedAt: new Date(student.quiz_started_at).toISOString(),
                            submittedAt: new Date(state.endsAt).toISOString(),
                            status: "submitted"
                        });
                    }
                }
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

            // Submission time is only meaningful once the attempt is over. While
            // the student is still answering, answers are saved one by one, so
            // the latest attempted_at is NOT a submission time — report
            // "in_progress" with no submittedAt instead.
            const latestAttemptedAt = answerSheet
                .map(ans => ans.attempted_at)
                .filter(Boolean)
                .sort()
                .pop() || null;

            let status = "submitted";
            let submittedAt = latestAttemptedAt;
            if (mcqConfig && student.quiz_started_at) {
                const state = getQuizState(student.quiz_started_at, parsedQuizAnswer, mcqConfig.totalTime);
                if (state.status === "in_progress") {
                    status = "in_progress";
                    submittedAt = null;
                } else if (state.status === "expired") {
                    // Time ran out without a final submit: the attempt ended when the clock did.
                    submittedAt = new Date(state.endsAt).toISOString();
                } else {
                    // Prefer the explicit final-submit stamp over the last answer time.
                    submittedAt = parsedQuizAnswer.find(e => e.submitted_at)?.submitted_at || latestAttemptedAt;
                }
            }

            studentResults.push({
                StudentId: student.StudentId,
                student_name: student.student_name,
                totalMarks: totalMarks,
                totalQuestions: mcqConfig ? mcqConfig.totalQuestion : 0,
                answerSheet,
                // null for attempts that predate quiz_started_at
                startedAt: student.quiz_started_at
                    ? new Date(student.quiz_started_at).toISOString()
                    : null,
                submittedAt,
                status
            });
        }

        return res.status(200).json({ courseId, results: studentResults });

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

        // 2. Skip questions the target already has (matched by normalized title)
        const parseQuestion = (q) => (typeof q === 'string' ? JSON.parse(q) : q);
        const titleKey = (q) => String(q?.question_title || '').trim().replace(/\s+/g, ' ').toLowerCase();

        const existingMcqs = await MCQ.findAll({ where: { CourseId: toCourseId } });
        const seenTitles = new Set(existingMcqs.map(item => titleKey(parseQuestion(item.mcq_question))));

        const mcqsToInsert = [];
        for (const item of sourceMcqs) {
            const question = parseQuestion(item.mcq_question);
            const key = titleKey(question);
            if (seenTitles.has(key)) continue;
            seenTitles.add(key); // also dedupes within the source itself
            mcqsToInsert.push({
                CourseId: toCourseId,
                mcq_question: question,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        const skipped = sourceMcqs.length - mcqsToInsert.length;

        // 3. Bulk insert into new CourseId
        if (mcqsToInsert.length > 0) {
            await MCQ.bulkCreate(mcqsToInsert);
        }

        res.status(200).json({
            copied: mcqsToInsert.length,
            skipped,
            message: `Copied ${mcqsToInsert.length} MCQ(s) from '${fromCourseId}' to '${toCourseId}'` +
                (skipped > 0 ? `; skipped ${skipped} already existing.` : '.')
        });
    } catch (error) {
        console.error('Error copying MCQs:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};





