-- Add isISTQBCertified field to students table
-- Enum values: Yes, No. Default: No

ALTER TABLE students 
ADD COLUMN isISTQBCertified ENUM('Yes', 'No') DEFAULT 'No' AFTER lookingForJob;
