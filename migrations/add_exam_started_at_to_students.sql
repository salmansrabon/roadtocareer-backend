-- Migration: students.exam_started_at
-- Date: 2026-10-03
-- Reason: the exam timer must not restart on a page reload or a second tab.
--         examSubmissionController.getExamForStudent stamps the first time a student
--         opens each exam; remaining time = exam_config.totalTime - (now - started)
--         (also capped by the exam window). Stored per exam as a JSON map:
--         {"<exam_id>": "<ISO start time>"}.
--
-- NULL = the student has not opened any exam yet. An exam with no entry here is
-- treated as not started (the next open stamps it).
--
-- Apply to the target database BEFORE deploying/restarting the backend: the Student
-- model now selects this column, so every student query fails until it exists.
-- Run against local sdetdb first, then production.

ALTER TABLE students
    ADD COLUMN exam_started_at JSON NULL AFTER exam_answer;

-- Verify
SHOW COLUMNS FROM students LIKE 'exam_started_at';
