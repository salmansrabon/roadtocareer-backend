-- Add ON DELETE CASCADE foreign key to book_topic_batch_access.
-- Run this on any environment where the table already exists (post-JSON migration).
ALTER TABLE book_topic_batch_access
    ADD CONSTRAINT fk_btba_topic FOREIGN KEY (topic_id) REFERENCES book_topics(id) ON DELETE CASCADE;
