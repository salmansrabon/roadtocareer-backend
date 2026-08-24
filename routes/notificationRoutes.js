const express = require("express");
const router = express.Router();
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const {
    getUnreadCount,
    listNotifications,
    markAsRead,
    markAllAsRead,
    createStreamTicket,
    stream,
    getStreamStats,
} = require("../controllers/notificationController");

// ── Static paths first, dynamic /:id last ────────────────────────────────────
router.get("/unread-count", authenticateUser, getUnreadCount);
router.get("/stream-stats", authenticateUser, requireAdmin, getStreamStats);

// The stream authenticates by single-use ticket, NOT by header: browser
// EventSource cannot send an Authorization header. See streamTickets.js.
router.post("/stream-ticket", authenticateUser, createStreamTicket);
router.get("/stream", stream);

router.patch("/read-all", authenticateUser, markAllAsRead);
router.patch("/:id/read", authenticateUser, markAsRead);

router.get("/", authenticateUser, listNotifications);

module.exports = router;
