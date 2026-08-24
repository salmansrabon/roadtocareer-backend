-- In-app notification feed (TASK-42, SRS 24).
--
-- Generic by design: `type` is a free-form VARCHAR (see backend/utils/notificationTypes.js)
-- so adding a new notification kind requires NO schema migration -- add a constant
-- and call notify().
--
-- recipient_username is keyed to users.username (NOT users.id): models/User.js declares
-- `username` as the Sequelize primary key, models/Student.js already references it, and
-- req.user.username IS the StudentId -- so no translation is ever needed.
-- Charset/collation below MUST match users.username (utf8mb4 / utf8mb4_unicode_ci) or
-- the foreign key fails with the famously unhelpful errno 150.

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_username VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT DEFAULT NULL,
    -- Relative frontend path only. The app is served from several origins
    -- (see corsOptions in server.js), so absolute URLs would break.
    link VARCHAR(500) DEFAULT NULL,
    -- Deliberately no FK on actor: a notification row must never block a user delete.
    actor_username VARCHAR(100) DEFAULT NULL,
    -- Denormalized so the list endpoint never has to join users.
    actor_name VARCHAR(255) DEFAULT NULL,
    entity_type VARCHAR(64) DEFAULT NULL,
    -- VARCHAR because this platform's ids are heterogeneous: assignments are INT,
    -- students and courses are VARCHAR.
    entity_id VARCHAR(64) DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    read_at DATETIME DEFAULT NULL,
    -- Explicit NOT NULL: with explicit_defaults_for_timestamp=1 (the MySQL 8
    -- default) a TIMESTAMP DEFAULT CURRENT_TIMESTAMP is still nullable, so a raw
    -- INSERT could write NULL and break date rendering downstream.
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Unread badge count: WHERE recipient_username=? AND is_read=0
    INDEX idx_notifications_recipient_unread (recipient_username, is_read),
    -- Keyset-paginated list: WHERE recipient_username=? ORDER BY id DESC
    INDEX idx_notifications_recipient_id (recipient_username, id),
    -- Retention prune: WHERE is_read=? AND createdAt < ?
    INDEX idx_notifications_created (createdAt),
    -- Duplicate-suppression lookup in notificationHelper.wasRecentlyNotified():
    -- WHERE type=? AND entity_type=? AND entity_id=? AND createdAt > ?
    INDEX idx_notifications_entity (entity_type, entity_id, type),
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_username)
        REFERENCES users (username) ON DELETE CASCADE ON UPDATE CASCADE
);
