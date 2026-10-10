ALTER TABLE courses
ADD COLUMN attendance_tracking BOOLEAN NOT NULL DEFAULT 0
AFTER is_latest;

-- Started only for the latest course(s); everything else starts out stopped.
UPDATE courses SET attendance_tracking = is_latest;
