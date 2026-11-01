-- Migration: students.quiz_history
-- Date: 2026-11-01
-- Reason: migrating a student to a new batch used to set quiz_answer and quiz_started_at to
--         NULL, destroying the old batch's quiz attempt. migrateStudent now archives the old
--         attempt here, keyed by courseId, so the student can view it from the previous-batch
--         view (profile menu) and so migrating back to that batch can restore it.
--
-- Shape (JSON text): { "<courseId>": [ { "quiz_answer": [...], "quiz_started_at": "<ISO>|null", "archived_at": "<ISO>" }, ... ] }
-- (a list per course, oldest first: a same-course migration and a later move away can both archive under one course)
-- NULL = nothing archived.
--
-- Apply to the target database BEFORE deploying/restarting the backend: the Student model
-- now selects this column, so every student query fails until it exists.
-- Run against local sdetdb first, then production (ask first).

ALTER TABLE students
    ADD COLUMN quiz_history LONGTEXT NULL AFTER quiz_started_at;

-- Verify
SHOW COLUMNS FROM students LIKE 'quiz_history';
