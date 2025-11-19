-- Migration: Add education column to students table
-- Date: 2025-11-20
-- Description: Adds JSON column for storing academic information

ALTER TABLE students 
ADD COLUMN education JSON DEFAULT NULL 
COMMENT 'Stores academic information as JSON array with examName, institute, cgpa, year';

-- Example data structure:
-- [
--   {
--     "examName": "Post Graduation",
--     "institute": "Dhaka University",
--     "cgpa": "3.75",
--     "year": "2020"
--   },
--   {
--     "examName": "Graduation",
--     "institute": "BUET",
--     "cgpa": "3.50",
--     "year": "2018"
--   }
-- ]
