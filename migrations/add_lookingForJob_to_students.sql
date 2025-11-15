-- Add lookingForJob field to students table
-- Enum values: Yes, No. Default: No

ALTER TABLE students 
ADD COLUMN lookingForJob ENUM('Yes', 'No') DEFAULT 'No' AFTER skill;
