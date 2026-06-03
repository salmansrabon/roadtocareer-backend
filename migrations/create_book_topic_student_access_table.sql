CREATE TABLE IF NOT EXISTS book_topic_student_access (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic_id INT NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    unlocked_by VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_topic_student (topic_id, student_id),
    INDEX idx_btsa_topic_id (topic_id),
    INDEX idx_btsa_student_id (student_id)
);
