CREATE TABLE IF NOT EXISTS book_topic_batch_access (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic_id INT NOT NULL,
    course_id VARCHAR(100) NOT NULL,
    unlocked_by VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_topic_course (topic_id, course_id),
    INDEX idx_btba_topic_id (topic_id),
    INDEX idx_btba_course_id (course_id)
);
