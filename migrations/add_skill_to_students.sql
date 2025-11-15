-- Add skill JSON field to students table
-- Stores soft skills and technical skills

ALTER TABLE students 
ADD COLUMN skill JSON NULL AFTER employment;
