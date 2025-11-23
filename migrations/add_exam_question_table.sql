-- Migration: Create exam_question table
CREATE TABLE exam_question (
    id INT PRIMARY KEY AUTO_INCREMENT,
    courseId VARCHAR(255) NOT NULL,
    questions JSON NOT NULL COMMENT 'Array of {question, hint, score} objects',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (courseId) REFERENCES courses(courseId) ON DELETE CASCADE
);

-- Add index for better performance
CREATE INDEX idx_exam_question_courseId ON exam_question(courseId);
