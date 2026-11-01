/**
 * Pure tests for quizHistoryHelper (no DB, no server).
 * Run with: node tests/test-quiz-history-helper.js   (from backend/)
 */
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { parseQuizHistory, getArchivedAttempt, planQuizOnMigration } = require("../utils/quizHistoryHelper");

let passed = 0;
const check = (name, fn) => {
    try { fn(); passed++; console.log(`  ok  ${name}`); }
    catch (err) { console.error(`  FAIL ${name}\n       ${err.message}`); process.exitCode = 1; }
};

const ANSWERS = [
    { mcq_id: 1, question: "Q1", user_answer: "a", correct_answer: "a", isCorrect: true, attempted_at: "2026-01-01T10:00:00.000Z", submitted_at: "2026-01-01T10:20:00.000Z" },
    { mcq_id: 2, question: "Q2", user_answer: "b", correct_answer: "c", isCorrect: false, attempted_at: "2026-01-01T10:01:00.000Z", submitted_at: "2026-01-01T10:20:00.000Z" },
];
const STARTED = new Date("2026-01-01T09:59:00.000Z");
const NOW = new Date("2026-02-02T00:00:00.000Z");
const plan = (over) => planQuizOnMigration({
    oldCourseId: "A", newCourseId: "B",
    quizAnswer: JSON.stringify(ANSWERS), quizStartedAt: STARTED, quizHistory: null, now: NOW, ...over,
});

check("parseQuizHistory: null, garbage, arrays and strings all give {}", () => {
    assert.deepStrictEqual(parseQuizHistory(null), {});
    assert.deepStrictEqual(parseQuizHistory("not json"), {});
    assert.deepStrictEqual(parseQuizHistory("[1,2]"), {});
    assert.deepStrictEqual(parseQuizHistory(""), {});
    assert.deepStrictEqual(parseQuizHistory('{"A":{"quiz_answer":[]}}'), { A: { quiz_answer: [] } });
});

check("migrating A -> B archives A's attempt and clears the live quiz", () => {
    const r = plan();
    assert.strictEqual(r.quiz_answer, null);
    assert.strictEqual(r.quiz_started_at, null);
    const archived = getArchivedAttempt(r.quiz_history, "A");
    assert.deepStrictEqual(archived.quiz_answer, ANSWERS);
    assert.strictEqual(archived.quiz_started_at, STARTED.toISOString());
    assert.strictEqual(archived.archived_at, NOW.toISOString());
});

check("no attempt at all: nothing is archived and history stays null", () => {
    const r = plan({ quizAnswer: null, quizStartedAt: null });
    assert.strictEqual(r.quiz_history, null);
    assert.strictEqual(getArchivedAttempt(r.quiz_history, "A"), null);
});

check("started but nothing answered (expired/abandoned) is still archived, with an empty answer list", () => {
    const r = plan({ quizAnswer: null });
    const archived = getArchivedAttempt(r.quiz_history, "A");
    assert.deepStrictEqual(archived.quiz_answer, []);
    assert.strictEqual(archived.quiz_started_at, STARTED.toISOString());
});

check("migrating back B -> A restores A's attempt and removes it from the archive", () => {
    const away = plan(); // A -> B
    const back = planQuizOnMigration({
        oldCourseId: "B", newCourseId: "A",
        quizAnswer: null, quizStartedAt: null, quizHistory: away.quiz_history, now: NOW,
    });
    assert.deepStrictEqual(JSON.parse(back.quiz_answer), ANSWERS);
    assert.strictEqual(back.quiz_started_at.toISOString(), STARTED.toISOString());
    assert.strictEqual(back.quiz_history, null, "A was restored; B had no attempt, so the archive is empty again");
});

check("A -> B -> C keeps both earlier attempts and never mixes them", () => {
    const toB = plan();
    const bAnswers = [{ mcq_id: 9, question: "QB", user_answer: "x", correct_answer: "x", isCorrect: true, attempted_at: "2026-03-01T10:00:00.000Z" }];
    const toC = planQuizOnMigration({
        oldCourseId: "B", newCourseId: "C",
        quizAnswer: JSON.stringify(bAnswers), quizStartedAt: new Date("2026-03-01T09:00:00.000Z"),
        quizHistory: toB.quiz_history, now: NOW,
    });
    assert.strictEqual(toC.quiz_answer, null);
    assert.deepStrictEqual(getArchivedAttempt(toC.quiz_history, "A").quiz_answer, ANSWERS);
    assert.deepStrictEqual(getArchivedAttempt(toC.quiz_history, "B").quiz_answer, bAnswers);
});

check("same course (only the package changes): the attempt is archived, the live quiz is cleared so a new one can be taken, and nothing is restored", () => {
    const r = plan({ oldCourseId: "A", newCourseId: "A" });
    assert.strictEqual(r.quiz_answer, null);
    assert.strictEqual(r.quiz_started_at, null);
    const archived = getArchivedAttempt(r.quiz_history, "A");
    assert.deepStrictEqual(archived.quiz_answer, ANSWERS);
    assert.strictEqual(archived.quiz_started_at, STARTED.toISOString());
});

check("same course with no attempt: nothing changes and an unrelated archive is kept", () => {
    const existing = { Z: [{ quiz_answer: ANSWERS, quiz_started_at: null, archived_at: NOW.toISOString() }] };
    const r = plan({ oldCourseId: "A", newCourseId: "A", quizAnswer: null, quizStartedAt: null, quizHistory: JSON.stringify(existing) });
    assert.strictEqual(r.quiz_answer, null);
    assert.strictEqual(r.quiz_started_at, null);
    assert.deepStrictEqual(JSON.parse(r.quiz_history), existing);
    assert.strictEqual(plan({ oldCourseId: "A", newCourseId: "A", quizAnswer: null, quizStartedAt: null }).quiz_history, null);
});

check("several attempts in one course are all kept; the newest is the one viewed and the one restored", () => {
    const second = [{ mcq_id: 7, question: "Q7", user_answer: "z", correct_answer: "z", isCorrect: true, attempted_at: "2026-03-01T10:00:00.000Z", submitted_at: "2026-03-01T10:10:00.000Z" }];
    const third = [{ mcq_id: 8, question: "Q8", user_answer: "y", correct_answer: "x", isCorrect: false, attempted_at: "2026-04-01T10:00:00.000Z", submitted_at: "2026-04-01T10:10:00.000Z" }];
    // 1st attempt, then a same-course migration (package change)
    const afterFirst = plan({ oldCourseId: "A", newCourseId: "A" });
    // 2nd attempt, another same-course migration
    const afterSecond = planQuizOnMigration({
        oldCourseId: "A", newCourseId: "A", quizAnswer: JSON.stringify(second),
        quizStartedAt: new Date("2026-03-01T09:59:00.000Z"), quizHistory: afterFirst.quiz_history, now: NOW,
    });
    assert.strictEqual(JSON.parse(afterSecond.quiz_history).A.length, 2);
    assert.deepStrictEqual(getArchivedAttempt(afterSecond.quiz_history, "A").quiz_answer, second);
    // 3rd attempt, then the student moves to batch B
    const toB = planQuizOnMigration({
        oldCourseId: "A", newCourseId: "B", quizAnswer: JSON.stringify(third),
        quizStartedAt: new Date("2026-04-01T09:59:00.000Z"), quizHistory: afterSecond.quiz_history, now: NOW,
    });
    assert.strictEqual(JSON.parse(toB.quiz_history).A.length, 3);
    // ...and back to A: the newest attempt (the 3rd) is restored, the first two stay archived
    const back = planQuizOnMigration({
        oldCourseId: "B", newCourseId: "A", quizAnswer: null, quizStartedAt: null, quizHistory: toB.quiz_history, now: NOW,
    });
    assert.deepStrictEqual(JSON.parse(back.quiz_answer), third);
    const left = JSON.parse(back.quiz_history).A;
    assert.strictEqual(left.length, 2);
    assert.deepStrictEqual(left[0].quiz_answer, ANSWERS);
    assert.deepStrictEqual(left[1].quiz_answer, second);
});

check("a malformed archive does not throw and is rebuilt", () => {
    const r = plan({ quizHistory: "{{{ not json" });
    assert.deepStrictEqual(getArchivedAttempt(r.quiz_history, "A").quiz_answer, ANSWERS);
});

check("getArchivedAttempt: unknown course, null history", () => {
    assert.strictEqual(getArchivedAttempt(null, "A"), null);
    assert.strictEqual(getArchivedAttempt(plan().quiz_history, "NOPE"), null);
});

check("migrateStudent uses the quiz plan and never writes exam data (the new batch's exams start fresh; old submissions survive a migrate-back)", () => {
    const src = fs.readFileSync(path.join(__dirname, "../controllers/studentController.js"), "utf8");
    const start = src.indexOf("exports.migrateStudent = async");
    assert(start !== -1, "migrateStudent not found");
    const next = src.indexOf("\nexports.", start + 10);
    const body = src.slice(start, next === -1 ? undefined : next);
    assert(/planQuizOnMigration/.test(body), "migrateStudent must use planQuizOnMigration for the quiz");
    assert(!/exam_answer|exam_started_at/.test(body), "migrateStudent must not touch exam_answer / exam_started_at");
});

console.log(`\n${passed} checks passed${process.exitCode ? " (with failures above)" : ""}`);
