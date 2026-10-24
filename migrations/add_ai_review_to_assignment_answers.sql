-- TASK-67: automatic AI review of Self-Learning submissions.
-- reviewed_by: who wrote the current Score/Comments ('admin' or 'ai'); NULL = not reviewed yet.
-- ai_review_status: state of the automatic review ('pending', 'done', 'failed'); NULL = never auto-reviewed.
ALTER TABLE assignment_answers
ADD COLUMN reviewed_by VARCHAR(10) NULL DEFAULT NULL AFTER reviewDate,
ADD COLUMN ai_review_status VARCHAR(10) NULL DEFAULT NULL AFTER reviewed_by;
