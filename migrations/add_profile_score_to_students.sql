-- Add profile_score column to students table
-- Stores the calculated 0-100 profile completion score (TASK-33)

ALTER TABLE students
ADD COLUMN profile_score INT NOT NULL DEFAULT 0 AFTER get_certificate;
