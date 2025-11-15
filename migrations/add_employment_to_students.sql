-- Add employment JSON field to students table
-- Stores employment history with total experience and company details

ALTER TABLE students 
ADD COLUMN employment JSON NULL AFTER experience;
