-- Add projects JSON column to students table
ALTER TABLE students ADD COLUMN projects JSON AFTER skill;
