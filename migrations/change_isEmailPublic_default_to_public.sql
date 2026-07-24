-- Email is now public by default; students opt into making it private.
-- Existing rows are still isEmailPublic=0 from the original migration (the column
-- was never actually honored until now) — backfill those to 1 separately so current
-- students don't suddenly lose email visibility on qa-talent/portfolio.

ALTER TABLE students
MODIFY COLUMN isEmailPublic TINYINT(1) DEFAULT 1;

UPDATE students SET isEmailPublic = 1 WHERE isEmailPublic = 0;
