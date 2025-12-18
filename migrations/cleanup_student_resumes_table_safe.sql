-- Safe Migration: Cleanup student_resumes table with backup and rollback capability
-- Date: 2025-12-03
-- Description: Safely remove columns that are no longer used since /resume/create now uses students table data

-- USE DATABASE
USE sdet_student_db;

-- STEP 1: Create backup table before dropping columns
CREATE TABLE student_resumes_backup AS SELECT * FROM student_resumes;

-- STEP 2: Check current table structure
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'student_resumes' 
ORDER BY ORDINAL_POSITION;

-- STEP 3: Remove columns that are now sourced from students table
-- (These have equivalent fields in students table)
ALTER TABLE student_resumes DROP COLUMN fullName;
ALTER TABLE student_resumes DROP COLUMN email;
ALTER TABLE student_resumes DROP COLUMN phoneNumber;
ALTER TABLE student_resumes DROP COLUMN linkedin;
ALTER TABLE student_resumes DROP COLUMN github;
ALTER TABLE student_resumes DROP COLUMN photo;

-- STEP 4: Remove functional columns that are discontinued
-- (These are no longer supported in the new system)
ALTER TABLE student_resumes DROP COLUMN jobStatus;
ALTER TABLE student_resumes DROP COLUMN jobHistory;
ALTER TABLE student_resumes DROP COLUMN skillSet;
ALTER TABLE student_resumes DROP COLUMN personalProjects;
ALTER TABLE student_resumes DROP COLUMN academicInfo;
ALTER TABLE student_resumes DROP COLUMN trainingInfo;
ALTER TABLE student_resumes DROP COLUMN achievements;
ALTER TABLE student_resumes DROP COLUMN primarySkill;
ALTER TABLE student_resumes DROP COLUMN secondarySkill;
ALTER TABLE student_resumes DROP COLUMN careerObjective;
ALTER TABLE student_resumes DROP COLUMN resumeFile;
ALTER TABLE student_resumes DROP COLUMN reference;

-- STEP 5: Add comment to document the change
ALTER TABLE student_resumes COMMENT = 'Cleaned up table - most fields now sourced from students table. Data migration completed on 2025-12-03';

-- STEP 6: Show remaining structure after cleanup
DESCRIBE student_resumes;

-- STEP 7: Show record count before and after
SELECT 
    'Original' as table_name, COUNT(*) as record_count FROM student_resumes_backup
UNION ALL
SELECT 
    'After Cleanup' as table_name, COUNT(*) as record_count FROM student_resumes;

-- ROLLBACK INSTRUCTIONS (if needed):
-- To rollback this migration, run:
-- DROP TABLE student_resumes;
-- CREATE TABLE student_resumes AS SELECT * FROM student_resumes_backup;
-- DROP TABLE student_resumes_backup;

-- CLEANUP BACKUP (run only after confirming everything works):
-- DROP TABLE student_resumes_backup;
