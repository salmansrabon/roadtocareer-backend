-- Add sortOrder column to blogs table for drag-and-drop ordering.
-- Lower value = shown first. Defaults to 0 so all existing posts start equal.
ALTER TABLE blogs ADD COLUMN sortOrder INT NOT NULL DEFAULT 0;

-- Initialize sortOrder from existing createdAt order so the list stays
-- in its current visual order after the migration.
SET @rank = 0;
UPDATE blogs SET sortOrder = (@rank := @rank + 1) ORDER BY createdAt ASC;
