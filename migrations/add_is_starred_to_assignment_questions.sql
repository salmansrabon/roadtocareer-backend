ALTER TABLE assignment_questions
ADD COLUMN is_starred BOOLEAN NOT NULL DEFAULT 0
AFTER TotalScore;
