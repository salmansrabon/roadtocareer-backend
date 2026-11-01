/**
 * Verification for the "My Exam Results" list: summarizeExamSubmissions (pure),
 * the route order, and GET /exam/student/results against real data (read-only).
 * Run with: node tests/test-exam-results.js   (from backend/)
 *
 * READ-ONLY against whichever DB backend/.env points at (use local sdetdb).
 * Does not start the server: no cron, seeders or emails.
 */
require("dotenv").config();
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const { summarizeExamSubmissions } = require("../utils/examResultsHelper");
const { getMyExamResults } = require("../controllers/examSubmissionController");

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

const sub = (over) => ({
    exam_id: 1, exam_title: "Mid exam", course_id: "A", batch_no: "19",
    submission_time: "2026-01-10T10:00:00.000Z", is_evaluated: true, total_score: 7,
    answers: [{ max_score: 5 }, { max_score: 5 }], ...over,
});

(async () => {
    console.log(`DB: ${process.env.DB_HOST}/${process.env.DB_NAME}`);

    await check("summarize: newest first, current vs previous batch, scores", () => {
        const rows = summarizeExamSubmissions(
            [sub({ exam_id: 1, course_id: "A", submission_time: "2026-01-10T10:00:00.000Z" }),
             sub({ exam_id: 2, course_id: "B", batch_no: "20", exam_title: "Final", submission_time: "2026-03-10T10:00:00.000Z" })],
            "B"
        );
        assert.deepStrictEqual(rows.map((r) => r.examId), [2, 1]);
        assert.strictEqual(rows[0].isCurrentBatch, true);
        assert.strictEqual(rows[1].isCurrentBatch, false);
        assert.strictEqual(rows[1].totalScore, 7);
        assert.strictEqual(rows[1].maxScore, 10);
        assert.strictEqual(rows[1].batch_no, "19");
    });

    await check("summarize: not evaluated yet -> no score, max still known", () => {
        const [row] = summarizeExamSubmissions([sub({ is_evaluated: false, total_score: null })], "A");
        assert.strictEqual(row.evaluated, false);
        assert.strictEqual(row.totalScore, null);
        assert.strictEqual(row.maxScore, 10);
    });

    await check("summarize: an old entry without title/course/batch falls back to the exam config", () => {
        const configById = new Map([[9, { id: 9, courseId: "OLD", exam_title: "Legacy exam", Course: { batch_no: "12" } }]]);
        const [row] = summarizeExamSubmissions([{ exam_id: 9, submission_time: "2025-05-05T00:00:00.000Z", answers: [] }], "NEW", configById);
        assert.strictEqual(row.examTitle, "Legacy exam");
        assert.strictEqual(row.courseId, "OLD");
        assert.strictEqual(row.batch_no, "12");
        assert.strictEqual(row.isCurrentBatch, false);
    });

    await check("summarize: unknown config and no data degrades without throwing", () => {
        const [row] = summarizeExamSubmissions([{ exam_id: 4 }], "A");
        assert.strictEqual(row.examTitle, "Exam 4");
        assert.strictEqual(row.courseId, null);
        assert.strictEqual(row.isCurrentBatch, false);
        assert.deepStrictEqual(summarizeExamSubmissions(null, "A"), []);
        assert.deepStrictEqual(summarizeExamSubmissions([null, {}], "A"), []);
    });

    await check("route order: /student/results is registered before /student/:examId (else 'results' is read as an exam id)", () => {
        const src = fs.readFileSync(path.join(__dirname, "../routes/examRoutes.js"), "utf8");
        const results = src.indexOf('"/student/results"');
        const byId = src.indexOf('"/student/:examId"');
        assert(results !== -1, "GET /student/results is not registered");
        assert(byId !== -1);
        assert(results < byId, "/student/results must come before /student/:examId");
    });

    // ---- real data (read-only) ----------------------------------------------
    const sample = await sequelize.query(
        `SELECT s.StudentId, s.CourseId, JSON_LENGTH(s.exam_answer) AS n, e.courseId AS other_course
         FROM students s JOIN JSON_TABLE(s.exam_answer, '$[*]' COLUMNS (exam_id INT PATH '$.exam_id')) jt
         JOIN exam_config e ON e.id = jt.exam_id
         WHERE s.isMigrated = 1 AND e.courseId <> s.CourseId LIMIT 1`,
        { type: QueryTypes.SELECT }
    ).then((rows) => rows[0]);
    assert(sample, "local DB needs a migrated student with an exam submission from another course");

    await check("GET /exam/student/results: a migrated student sees their old-batch exam as 'Previous'", async () => {
        const res = mockRes();
        await getMyExamResults({ user: { username: sample.StudentId, role: "student" } }, res);
        assert.strictEqual(res.statusCode, 200);
        const rows = res.body.data.results;
        assert.strictEqual(rows.length, Number(sample.n));
        const old = rows.find((r) => r.courseId === sample.other_course);
        assert(old, "the old-batch exam must be listed");
        assert.strictEqual(old.isCurrentBatch, false);
        assert(old.examTitle && old.examTitle.length > 0);
    });

    await check("GET /exam/student/results: a student with no submissions gets an empty list", async () => {
        const none = await sequelize.query(
            "SELECT StudentId FROM students WHERE exam_answer IS NULL LIMIT 1", { type: QueryTypes.SELECT }
        ).then((rows) => rows[0]);
        assert(none, "local DB needs a student without exam submissions");
        const res = mockRes();
        await getMyExamResults({ user: { username: none.StudentId, role: "student" } }, res);
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body.data.results, []);
    });

    await check("GET /exam/student/results: unknown student is 404", async () => {
        const res = mockRes();
        await getMyExamResults({ user: { username: "NO-SUCH-STUDENT", role: "student" } }, res);
        assert.strictEqual(res.statusCode, 404);
    });

    console.log(`\n${passed} checks passed${process.exitCode ? " (with failures above)" : ""}`);
    await sequelize.close();
})();
