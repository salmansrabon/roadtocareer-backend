-- Migration: Add istqb_certificate column to students table
-- Date: 2025-11-20
-- Description: Adds column for storing ISTQB certificate URL

ALTER TABLE students 
ADD COLUMN istqb_certificate VARCHAR(500) DEFAULT NULL 
COMMENT 'URL to ISTQB certificate';
