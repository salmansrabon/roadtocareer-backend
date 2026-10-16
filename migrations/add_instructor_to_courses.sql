ALTER TABLE courses
  ADD COLUMN instructor_name VARCHAR(255) NULL,
  ADD COLUMN instructor_designation VARCHAR(255) NULL,
  ADD COLUMN instructor_company VARCHAR(255) NULL,
  ADD COLUMN instructor_bio TEXT NULL,
  ADD COLUMN instructor_photo VARCHAR(255) NULL;
