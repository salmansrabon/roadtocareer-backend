-- Add position column to gallery table for drag-and-drop ordering
ALTER TABLE gallery ADD COLUMN position INT NOT NULL DEFAULT 0 AFTER id;

-- Set initial positions based on creation order
SET @row_number = 0;
UPDATE gallery 
SET position = (@row_number:=@row_number + 1)
ORDER BY created_at ASC;
