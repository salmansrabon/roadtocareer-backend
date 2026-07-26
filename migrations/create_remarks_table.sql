-- One row per student; the `remark` JSON column holds the growing list of
-- timestamped remark entries for that student (adding a remark appends to
-- the list, it does not create a new row).
CREATE TABLE IF NOT EXISTS remarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    studentId VARCHAR(255) NOT NULL,
    remark JSON NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_remarks_student_id (studentId),
    CONSTRAINT fk_rmk_student FOREIGN KEY (studentId) REFERENCES students(StudentId) ON DELETE CASCADE
);
