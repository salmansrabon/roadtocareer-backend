-- Migration: students.quiz_started_at
-- Date: 2026-10-03
-- Reason: the quiz clock must start when the student opens the quiz and survive
--         a refresh/crash/network drop. mcqController.startQuiz stamps this column;
--         remaining time = quiz_started_at + mcq_config.totalTime - now.
--
-- NULL = quiz not started. Students who already have quiz_answer data and a NULL
-- value here are treated as "already attempted" (they cannot retake).
--
-- Apply to the target database BEFORE deploying/restarting the backend: the Student
-- model now selects this column, so every student query fails until it exists.
-- Run against local sdetdb first, then production.

ALTER TABLE students
    ADD COLUMN quiz_started_at DATETIME NULL AFTER quiz_answer;

-- Verify
SHOW COLUMNS FROM students LIKE 'quiz_started_at';
