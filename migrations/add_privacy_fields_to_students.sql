-- Add privacy toggle fields to students table
-- By default, all fields are private (0)

ALTER TABLE students 
ADD COLUMN isMobilePublic TINYINT(1) DEFAULT 0 AFTER github,
ADD COLUMN isEmailPublic TINYINT(1) DEFAULT 0 AFTER isMobilePublic,
ADD COLUMN isLinkedInPublic TINYINT(1) DEFAULT 0 AFTER isEmailPublic,
ADD COLUMN isGithubPublic TINYINT(1) DEFAULT 0 AFTER isLinkedInPublic;
