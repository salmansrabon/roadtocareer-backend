-- Migration: students.salutation 'Mrs' -> 'Ms'
-- Date: 2026-11-01
-- Reason: the enrollment form and every screen should say "Ms" instead of "Mrs".
--         The column is ENUM('Mr','Mrs'), so the value itself has to change, not just the label.
--
-- Steps (order matters, and each step is safe to re-run):
--   1. Widen the enum to ('Mr','Mrs','Ms') so 'Ms' is a legal value while 'Mrs' rows still exist.
--   2. Convert every 'Mrs' row to 'Ms'.
--   3. Narrow the enum to ('Mr','Ms').
--
-- updatedAt: students.updatedAt is ON UPDATE CURRENT_TIMESTAMP and qa-talent orders by it, so a
-- plain UPDATE would reshuffle the qa-talent listing for every converted student. Step 2 writes
-- updatedAt = updatedAt explicitly to keep the old value. (The ALTERs do not touch row values.)
--
-- Deploy order: run this BEFORE deploying the code that sends 'Ms' (enroll form, Student model).
-- Old code keeps working after step 3 only for 'Mr'; it would fail to save 'Mrs', so deploy the
-- new code right after. Run against local sdetdb first, then production (ask first).
--
-- Rollback: the reverse of the three steps (widen to ('Mr','Mrs','Ms'), UPDATE ... SET
-- salutation = 'Mrs', updatedAt = updatedAt WHERE salutation = 'Ms', narrow to ('Mr','Mrs')).
-- Note this converts EVERY 'Ms' back, including students who chose 'Ms' after the change.

-- Before: how many rows of each value
SELECT salutation, COUNT(*) AS students FROM students GROUP BY salutation;

-- 1. Widen
ALTER TABLE students
    MODIFY COLUMN salutation ENUM('Mr','Mrs','Ms') COLLATE utf8mb4_unicode_ci DEFAULT 'Mr';

-- 2. Convert (keep updatedAt unchanged)
UPDATE students
   SET salutation = 'Ms',
       updatedAt = updatedAt
 WHERE salutation = 'Mrs';

-- 3. Narrow
ALTER TABLE students
    MODIFY COLUMN salutation ENUM('Mr','Ms') COLLATE utf8mb4_unicode_ci DEFAULT 'Mr';

-- Verify: expect no 'Mrs' row and the enum to read enum('Mr','Ms')
SELECT salutation, COUNT(*) AS students FROM students GROUP BY salutation;
SHOW COLUMNS FROM students LIKE 'salutation';
