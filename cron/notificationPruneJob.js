const { Op } = require("sequelize");
const Notification = require("../models/Notification");

// Retention policy for the in-app notification feed (SRS 24).
// Read notifications are transient once seen; unread ones are kept longer so a
// student returning after a long gap still sees what they missed.
const READ_RETENTION_DAYS = 90;
const UNREAD_RETENTION_DAYS = 180;

// Delete in batches so a first run over a large backlog doesn't hold a long lock.
const BATCH_SIZE = 5000;
const MAX_BATCHES = 100; // safety stop: 500k rows in one run is already implausible

let isJobRunning = false;

async function pruneBatch(label, where) {
    let total = 0;

    for (let i = 0; i < MAX_BATCHES; i++) {
        const deleted = await Notification.destroy({ where, limit: BATCH_SIZE });
        total += deleted;
        if (deleted < BATCH_SIZE) return total;
    }

    // Hit the safety stop with a full batch still coming back — rows remain.
    // Say so, rather than reporting a clean run that silently left a backlog.
    console.warn(
        `[notificationPruneJob] Reached MAX_BATCHES (${MAX_BATCHES}) pruning ${label}; ` +
        `${total} deleted but more still match. Next run will continue.`
    );
    return total;
}

async function runNotificationPruneJob() {
    if (isJobRunning) {
        console.warn("[notificationPruneJob] Previous run still in progress — skipping this tick.");
        return;
    }
    isJobRunning = true;

    console.log("⏰ [notificationPruneJob] Starting notification retention prune...");

    try {
        const now = Date.now();
        const readCutoff = new Date(now - READ_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const unreadCutoff = new Date(now - UNREAD_RETENTION_DAYS * 24 * 60 * 60 * 1000);

        const readDeleted = await pruneBatch("read", {
            is_read: true,
            createdAt: { [Op.lt]: readCutoff },
        });

        const unreadDeleted = await pruneBatch("unread", {
            is_read: false,
            createdAt: { [Op.lt]: unreadCutoff },
        });

        console.log(
            `✅ [notificationPruneJob] Done. Deleted ${readDeleted} read (>${READ_RETENTION_DAYS}d) ` +
            `and ${unreadDeleted} unread (>${UNREAD_RETENTION_DAYS}d) notification(s).`
        );
    } catch (error) {
        console.error("❌ [notificationPruneJob] Failed:", error);
    } finally {
        isJobRunning = false;
    }
}

module.exports = { runNotificationPruneJob };
