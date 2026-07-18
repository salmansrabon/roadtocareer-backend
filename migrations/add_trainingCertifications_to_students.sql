-- Add trainingCertifications JSON column to students table
ALTER TABLE students ADD COLUMN trainingCertifications JSON AFTER projects;
