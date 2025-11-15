-- Migration: Add photo field to students table
-- Date: November 15, 2025
-- Description: Add photo column to store student profile pictures

ALTER TABLE students 
ADD COLUMN photo VARCHAR(255) NULL AFTER certificate;

-- Optional: Add comment to the column
ALTER TABLE students 
MODIFY COLUMN photo VARCHAR(255) NULL COMMENT 'Student profile photo URL';
