-- Migration: Add ai_voice_interviews column to students table
-- This stores AI voice interview results as JSON array

ALTER TABLE students 
ADD COLUMN ai_voice_interviews JSON 
COMMENT 'Array of AI voice interview results: [{score, role, level, feedback, interview_date, topics_covered, session_duration}]';
