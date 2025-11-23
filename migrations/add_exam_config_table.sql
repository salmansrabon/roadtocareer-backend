-- Migration: Create exam_config table
CREATE TABLE exam_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    courseId VARCHAR(255) NOT NULL,
    exam_title VARCHAR(255) NOT NULL,
    exam_description TEXT,
    totalQuestion INT NOT NULL,
    isActive BOOLEAN DEFAULT FALSE,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    totalTime INT NOT NULL COMMENT 'Exam duration in minutes',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (courseId) REFERENCES courses(courseId) ON DELETE CASCADE
);

-- Add index for better performance
CREATE INDEX idx_exam_config_courseId ON exam_config(courseId);
CREATE INDEX idx_exam_config_active ON exam_config(isActive);
