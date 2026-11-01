/**
 * Verification for the previous-batch view: GET /mcq/result/:studentId?courseId= and
 * GET /students/attendance/:studentId?courseId=.
 * Run with: node tests/test-previous-batch-view.js   (from backend/)
 *
 * READ-ONLY against whichever DB backend/.env points at (use local sdetdb). The quiz
 * checks patch Student.findOne / McqConfig.findOne in memory (restored after) because no
 * real student has a quiz_history yet. Does not start the server: no cron, seeders or emails.
 */
require("dotenv").config();
const assert = require("node:assert");
const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const Student = require("../models/Student");
const McqConfig = require("../models/McqConfig");
const Course = require("../models/Course");
const { getStudentResult } = require("../controllers/mcqController");
const { getAttendance } = require("../controllers/studentController");
const { getBatchEntries } = require("../utils/attendanceHelper");

const mockRes = () => {
    const res = { statusCode: 200, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    return res;
};

let passed = 0;
const check = (name, fn) => Promise.resolve(fn()).then(
    () => { passed++; console.log(`  ok  ${name}`); },
    (err) => { console.error(`  FAIL ${name}\n       ${err.message}`); process.exitCode = 1; }
);

const call = async (handler, { params, query, user }) => {
    const res = mockRes();
    await handler({ params, query: query || {}, user }, res);
    return res;
};
const asStudent = (username) => ({ id: 1, username, role: "student" });
const asAdmin = { id: 2, username: "admin", role: "admin" };

(async () => {
    console.log(`DB: ${process.env.DB_HOST}/${process.env.DB_NAME}`);

    // ---------------- quiz (patched models) ----------------
    const ANSWERS = [
        { mcq_id: 1, question: "Q1", user_answer: "a", correct_answer: "a", isCorrect: true, attempted_at: "2026-01-01T10:00:00.000Z" },
        { mcq_id: 2, question: "Q2", user_answer: "b", correct_answer: "c", isCorrect: false, attempted_at: "2026-01-01T10:01:00.000Z" },
    ];
    const fakeStudent = {
        StudentId: "FAKE1", student_name: "Fake One", CourseId: "cur", previous_course_id: "prev",
        quiz_answer: null, quiz_started_at: null,
        quiz_history: JSON.stringify({ prev: { quiz_answer: ANSWERS, quiz_started_at: "2026-01-01T09:59:00.000Z", archived_at: "2026-02-02T00:00:00.000Z" } }),
    };
    const realFindStudent = Student.findOne;
    const realFindConfig = McqConfig.findOne;
    Student.findOne = async () => fakeStudent;
    McqConfig.findOne = async () => ({ totalQuestion: 20, totalTime: 30 });
    try {
        await check("quiz: no courseId = current batch, unchanged (404 when nothing attempted)", async () => {
            const r = await call(getStudentResult, { params: { studentId: "FAKE1" }, user: asStudent("FAKE1") });
            assert.strictEqual(r.statusCode, 404);
            assert.strictEqual(r.body.message, "No MCQ responses found for this student.");
        });

        await check("quiz: student opens their previous batch -> 200 with the archived score and answers", async () => {
            const r = await call(getStudentResult, { params: { studentId: "FAKE1" }, query: { courseId: "prev" }, user: asStudent("FAKE1") });
            assert.strictEqual(r.statusCode, 200);
            assert.strictEqual(r.body.totalMarks, 1);
            assert.strictEqual(r.body.totalQuestions, 20);
            assert.strictEqual(r.body.answerSheet.length, 2);
            assert.strictEqual(r.body.courseId, "prev");
        });

        await check("quiz: student asking for a course that is neither current nor previous -> 403", async () => {
            const r = await call(getStudentResult, { params: { studentId: "FAKE1" }, query: { courseId: "other" }, user: asStudent("FAKE1") });
            assert.strictEqual(r.statusCode, 403);
        });

        await check("quiz: another student asking for this student's previous batch -> 403", async () => {
            const r = await call(getStudentResult, { params: { studentId: "FAKE1" }, query: { courseId: "prev" }, user: asStudent("SOMEONE_ELSE") });
            assert.strictEqual(r.statusCode, 403);
        });

        await check("quiz: admin can open any archived batch; a batch with no archive -> 404", async () => {
            const ok = await call(getStudentResult, { params: { studentId: "FAKE1" }, query: { courseId: "prev" }, user: asAdmin });
            assert.strictEqual(ok.statusCode, 200);
            const none = await call(getStudentResult, { params: { studentId: "FAKE1" }, query: { courseId: "never" }, user: asAdmin });
            assert.strictEqual(none.statusCode, 404);
            assert.strictEqual(none.body.message, "No quiz attempt found for that batch.");
        });

        await check("quiz: asking for the CURRENT course by id behaves like no courseId", async () => {
            const r = await call(getStudentResult, { params: { studentId: "FAKE1" }, query: { courseId: "cur" }, user: asStudent("FAKE1") });
            assert.strictEqual(r.statusCode, 404);
            assert.strictEqual(r.body.message, "No MCQ responses found for this student.");
        });
    } finally {
        Student.findOne = realFindStudent;
        McqConfig.findOne = realFindConfig;
    }

    // ---------------- attendance (real data, read-only) ----------------
    const sample = await sequelize.query(
        `SELECT s.StudentId, s.CourseId, s.previous_course_id, a.attendanceList, a.courseId AS rowCourseId
         FROM students s JOIN attendance a ON a.StudentId = s.StudentId
         WHERE s.previous_course_id IS NOT NULL AND s.previous_course_id <> ''
           AND s.CourseId = a.courseId
           AND JSON_VALID(a.attendanceList) AND JSON_TYPE(a.attendanceList) = 'OBJECT'
           AND JSON_LENGTH(a.attendanceList, CONCAT('$."', s.previous_course_id, '"')) > 0
         LIMIT 1`,
        { type: QueryTypes.SELECT }
    ).then((rows) => rows[0]);
    assert(sample, "local DB needs a student whose previous batch has saved attendance");
    const expectedPrevious = getBatchEntries(sample.attendanceList, sample.rowCourseId, sample.previous_course_id).length;
    const expectedCurrent = getBatchEntries(sample.attendanceList, sample.rowCourseId, sample.rowCourseId).length;
    const previousCourse = await Course.findOne({ where: { courseId: sample.previous_course_id } });
    const sid = sample.StudentId;

    await check("attendance: no courseId = current batch, exactly as before", async () => {
        const r = await call(getAttendance, { params: { studentId: sid }, user: asStudent(sid) });
        assert.strictEqual(r.statusCode, 200);
        assert.strictEqual(r.body.courseId, sample.CourseId);
        assert.strictEqual(JSON.parse(r.body.attendanceList).length, expectedCurrent);
    });

    await check("attendance: student opens their previous batch -> that bucket, with that course's batch and total classes", async () => {
        const r = await call(getAttendance, { params: { studentId: sid }, query: { courseId: sample.previous_course_id }, user: asStudent(sid) });
        assert.strictEqual(r.statusCode, 200);
        assert.strictEqual(r.body.courseId, sample.previous_course_id);
        assert.strictEqual(JSON.parse(r.body.attendanceList).length, expectedPrevious);
        assert.strictEqual(r.body.totalClicks, expectedPrevious);
        if (previousCourse) {
            assert.strictEqual(String(r.body.batch_no), String(previousCourse.batch_no));
            assert.strictEqual(r.body.totalClass, previousCourse.total_class || 30);
        }
    });

    await check("attendance: asking for the CURRENT course by id behaves like no courseId", async () => {
        const r = await call(getAttendance, { params: { studentId: sid }, query: { courseId: sample.CourseId }, user: asStudent(sid) });
        assert.strictEqual(r.statusCode, 200);
        assert.strictEqual(JSON.parse(r.body.attendanceList).length, expectedCurrent);
    });

    await check("attendance: student asking for an unrelated course -> 403", async () => {
        const r = await call(getAttendance, { params: { studentId: sid }, query: { courseId: "not-a-course" }, user: asStudent(sid) });
        assert.strictEqual(r.statusCode, 403);
    });

    await check("attendance: another student asking for this student's previous batch -> 403", async () => {
        const r = await call(getAttendance, { params: { studentId: sid }, query: { courseId: sample.previous_course_id }, user: asStudent("SOMEONE_ELSE") });
        assert.strictEqual(r.statusCode, 403);
    });

    await check("attendance: admin can open any batch; a batch with no entries is 200 with an empty list", async () => {
        const r = await call(getAttendance, { params: { studentId: sid }, query: { courseId: "never-attended-batch" }, user: asAdmin });
        assert.strictEqual(r.statusCode, 200);
        assert.deepStrictEqual(JSON.parse(r.body.attendanceList), []);
        assert.strictEqual(r.body.totalClicks, 0);
    });

    await check("attendance: unknown student is still 404", async () => {
        const r = await call(getAttendance, { params: { studentId: "NO-SUCH-STUDENT" }, user: asAdmin });
        assert.strictEqual(r.statusCode, 404);
    });

    console.log(`\n${passed} checks passed${process.exitCode ? " (with failures above)" : ""}`);
    await sequelize.close();
})();
