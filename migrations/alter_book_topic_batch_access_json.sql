-- Migration: refactor book_topic_batch_access
-- Replace per-row course_id with a JSON array (course_ids), one row per topic_id.
-- Run each statement one at a time in order — do NOT skip ahead.

-- Step 1: Add new columns
ALTER TABLE book_topic_batch_access
  ADD COLUMN course_ids JSON NULL AFTER topic_id,
  ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER createdAt;

-- Step 2: For each topic_id, aggregate ALL course_ids into the row with the lowest id.
-- Uses GROUP_CONCAT so no batch data is lost even if a topic was unlocked for multiple courses.
UPDATE book_topic_batch_access btba
INNER JOIN (
  SELECT
    topic_id,
    MIN(id) AS keep_id,
    CONCAT('["', GROUP_CONCAT(course_id ORDER BY id SEPARATOR '","'), '"]') AS agg_ids
  FROM book_topic_batch_access
  GROUP BY topic_id
) grp ON btba.id = grp.keep_id
SET btba.course_ids = grp.agg_ids;

-- Step 3: Delete rows that are NOT the kept row per topic_id.
-- The kept row (min id) now holds the full course_ids array — others are safe to remove.
DELETE btba
FROM book_topic_batch_access btba
LEFT JOIN (
  SELECT MIN(id) AS keep_id
  FROM book_topic_batch_access
  GROUP BY topic_id
) grp ON btba.id = grp.keep_id
WHERE grp.keep_id IS NULL;

-- Step 4: Drop the old course_id column and its indexes; enforce one row per topic_id.
ALTER TABLE book_topic_batch_access
  DROP INDEX uq_topic_course,
  DROP INDEX idx_btba_course_id,
  DROP INDEX idx_btba_topic_id,
  DROP COLUMN course_id,
  ADD UNIQUE KEY uq_topic_id (topic_id),
  ADD INDEX idx_btba_topic_id (topic_id);

-- Step 5: Enforce NOT NULL now that all rows are populated.
ALTER TABLE book_topic_batch_access
  MODIFY COLUMN course_ids JSON NOT NULL;
