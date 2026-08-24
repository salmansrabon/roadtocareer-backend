const { Op } = require("sequelize");
const Notification = require("../models/Notification");
const hub = require("../utils/notificationHub");
const { issueTicket, redeemTicket, TICKET_TTL_MS } = require("../utils/streamTickets");
const { serialize, getUnreadCount } = require("../utils/notificationHelper");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// GET /api/notifications/unread-count — any authenticated user (own count only)
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await getUnreadCount(req.user.username);
        res.status(200).json({ message: "Unread count fetched successfully", data: { count } });
    } catch (error) {
        console.error("Error fetching unread notification count:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/notifications?limit=20&before=<id>&unreadOnly=true — own notifications only
exports.listNotifications = async (req, res) => {
    try {
        const { before, unreadOnly } = req.query;

        const parsedLimit = parseInt(req.query.limit, 10);
        const limit = Number.isNaN(parsedLimit)
            ? DEFAULT_LIMIT
            : Math.min(Math.max(parsedLimit, 1), MAX_LIMIT);

        const where = { recipient_username: req.user.username };
        if (unreadOnly === "true") where.is_read = false;

        // Keyset pagination on id DESC, not OFFSET: rows are constantly inserted at
        // the top of this feed, so offset paging would duplicate and skip items.
        // Ordering by id rather than createdAt because TIMESTAMP has 1-second
        // granularity and a batch of rows inserted in the same second would tie.
        if (before !== undefined) {
            // MySQL would coerce a non-numeric literal to 0 and silently return an
            // empty page; reject it instead so a broken cursor is visible.
            if (!/^\d+$/.test(String(before))) {
                return res.status(400).json({ message: "Invalid 'before' cursor" });
            }
            where.id = { [Op.lt]: before };
        }

        const rows = await Notification.findAll({
            where,
            order: [["id", "DESC"]],
            limit,
        });

        const unreadCount = await getUnreadCount(req.user.username);

        res.status(200).json({
            message: "Notifications fetched successfully",
            data: {
                items: rows.map(serialize),
                nextCursor: rows.length === limit ? String(rows[rows.length - 1].id) : null,
                unreadCount,
            },
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PATCH /api/notifications/:id/read — own notifications only
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!/^\d+$/.test(String(id))) {
            return res.status(400).json({ message: "Invalid notification id" });
        }

        // Authorization IS the WHERE clause: scoping to the caller's username makes
        // IDOR structurally impossible without a separate ownership lookup.
        const [affected] = await Notification.update(
            { is_read: true, read_at: new Date() },
            { where: { id, recipient_username: req.user.username, is_read: false } }
        );

        if (affected === 0) {
            // Either it doesn't exist / isn't theirs, or it was already read.
            const exists = await Notification.count({
                where: { id, recipient_username: req.user.username },
            });
            if (exists === 0) {
                return res.status(404).json({ message: "Notification not found" });
            }
            // Already read — idempotent success.
        }

        const unreadCount = await getUnreadCount(req.user.username);

        // Keep this user's OTHER tabs in sync. Without this, marking read in tab A
        // leaves tab B's badge stale -- the exact two-tab drift the authoritative
        // server count was introduced to prevent.
        hub.push(req.user.username, "unread", { unreadCount });

        res.status(200).json({
            message: "Notification marked as read",
            data: { id: String(id), unreadCount },
        });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PATCH /api/notifications/read-all — own notifications only
exports.markAllAsRead = async (req, res) => {
    try {
        const [updated] = await Notification.update(
            { is_read: true, read_at: new Date() },
            { where: { recipient_username: req.user.username, is_read: false } }
        );

        // Re-read rather than assuming 0: a notification can arrive between the
        // UPDATE and this response, and its SSE frame may reach the client first.
        // Returning a hard 0 would clobber a correct badge with a stale one.
        const unreadCount = await getUnreadCount(req.user.username);
        hub.push(req.user.username, "unread", { unreadCount });

        res.status(200).json({
            message: "All notifications marked as read",
            data: { updated, unreadCount },
        });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/notifications/stream-ticket — any authenticated user
// EventSource cannot send an Authorization header, so the client mints a
// short-lived single-use ticket here and passes it on the stream URL. We do NOT
// accept the JWT itself in a query string: a 12h token would end up in Nginx
// access logs, Referer headers and browser history.
exports.createStreamTicket = async (req, res) => {
    try {
        const ticket = issueTicket({ username: req.user.username, role: req.user.role });
        res.status(201).json({
            message: "Stream ticket issued",
            data: { ticket, expiresIn: Math.floor(TICKET_TTL_MS / 1000) },
        });
    } catch (error) {
        console.error("Error issuing notification stream ticket:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/notifications/stream?ticket=<t> — authenticated by ticket, not header
exports.stream = (req, res) => {
    const session = redeemTicket(req.query.ticket);
    if (!session) {
        return res.status(401).json({ message: "Invalid or expired stream ticket" });
    }

    res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        // Tells Nginx not to buffer this response. Without it, Nginx's default
        // proxy_buffering=on holds the stream and the browser receives nothing
        // until a buffer fills. This single header is what lets SSE work through
        // a stock Nginx with no config change.
        "X-Accel-Buffering": "no",
    });
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    // Long-lived response: disable Node's socket timeout and flush small writes.
    req.socket.setTimeout(0);
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);

    // Deliberately NO `retry:` directive. Tickets are single-use, so the browser's
    // native EventSource reconnect can only ever re-fetch this URL with a burned
    // ticket and get a 401 -- advertising a retry interval would be a promise this
    // auth scheme cannot keep. The client drives its own reconnect and mints a
    // fresh ticket each time (frontend/hooks/useNotifications.js).
    res.write(`event: connected\ndata: ${JSON.stringify({ username: session.username })}\n\n`);

    // Cleanup is registered BEFORE addClient: if the client aborts in between, the
    // 'close' event would already have fired and be missed, leaving a stale entry
    // that inflates stream-stats until the next heartbeat reaps it.
    //
    // This is the only path that reaps a disconnected client -- res.write() never
    // throws on a dead socket. Registering these also prevents an unhandled
    // ECONNRESET on a detached response from taking down the single process.
    let connectionId = null;
    let cleanedUp = false;
    const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        if (connectionId !== null) hub.removeClient(session.username, connectionId);
    };

    req.on("close", cleanup);
    req.on("error", cleanup);
    res.on("error", cleanup);

    connectionId = hub.addClient(session.username, res);

    // Covers an abort that landed before the handlers were attached.
    if (req.destroyed || res.destroyed) cleanup();

    // Deliberately never calls next() and never calls res.end().
};

// GET /api/notifications/stream-stats — admin/teacher only.
// Five lines that save hours of "are the streams even connected in prod?".
exports.getStreamStats = async (req, res) => {
    try {
        res.status(200).json({ message: "Stream stats fetched successfully", data: hub.stats() });
    } catch (error) {
        console.error("Error fetching stream stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
