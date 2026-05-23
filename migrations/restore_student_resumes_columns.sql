-- Migration: Restore columns removed by cleanup_student_resumes_table_safe.sql
-- Date: 2026-05-24
-- Reason: getAllStudentResumes query and StudentResume model require these columns.

USE sdet_student_db;

ALTER TABLE student_resumes
    ADD COLUMN fullName        VARCHAR(255)    NOT NULL DEFAULT '',
    ADD COLUMN email           VARCHAR(255)    NOT NULL DEFAULT '',
    ADD COLUMN phoneNumber     VARCHAR(50)     NOT NULL DEFAULT '',
    ADD COLUMN linkedin        VARCHAR(255)    NULL,
    ADD COLUMN github          VARCHAR(255)    NULL,
    ADD COLUMN photo           VARCHAR(255)    NULL,
    ADD COLUMN jobStatus       ENUM('Employed','Unemployed','Looking') NOT NULL DEFAULT 'Unemployed',
    ADD COLUMN jobHistory      LONGTEXT        NULL,
    ADD COLUMN skillSet        LONGTEXT        NULL,
    ADD COLUMN personalProjects LONGTEXT       NULL,
    ADD COLUMN academicInfo    LONGTEXT        NULL,
    ADD COLUMN trainingInfo    LONGTEXT        NULL,
    ADD COLUMN achievements    LONGTEXT        NULL,
    ADD COLUMN primarySkill    LONGTEXT        NULL,
    ADD COLUMN secondarySkill  LONGTEXT        NULL,
    ADD COLUMN careerObjective TEXT            NULL,
    ADD COLUMN resumeFile      VARCHAR(255)    NULL,
    ADD COLUMN reference       LONGTEXT        NULL;

-- Verify restored structure
DESCRIBE student_resumes;
