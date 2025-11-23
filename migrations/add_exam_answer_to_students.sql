-- Migration: Add exam_answer field to students table
ALTER TABLE students 
ADD COLUMN exam_answer JSON COMMENT 'Array of exam submissions: [{exam_id, exam_question, studentId, student_answer, score, feedback, submission_time}]';
