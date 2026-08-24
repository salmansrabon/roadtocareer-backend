const { Op } = require("sequelize");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Student = require("../models/Student");
const hub = require("./notificationHub");
const { NOTIFICATION_TYPES } = require("./notificationTypes");

// MySQL runs with STRICT_TRANS_TABLES, so an over-length value is a failed
// INSERT, not a silent truncation. Trim to the column widths rather than losing
// the notification entirely.
const MAX = { title: 255, link: 500, actorName: 255, entityId: 64, type: 64 };

function clamp(value, max) {
    if (value === null || value === undefined) return null;
    const str = String(value);
    return str.length > max ? str.slice(0, max) : str;
}

// The in-app notification service (SRS 24).
//
// THIS FILE IS THE EXTENSIBILITY SEAM. Adding a new notification type is:
//   1. add a constant to utils/notificationTypes.js
//   2. call notify({ ... }) from wherever the event happens
// No migration, no route change, no hub change, no frontend change.

// Wire shape, used identically by the SSE stream and the REST list endpoint so
// the frontend needs exactly one renderer.
//
// NOTE: title/body are built from user-supplied data (student names, assignment
// titles). The frontend MUST render them as text, never as HTML.
function serialize(row) {
    return {
        id: String(row.id),              // BIGINT comes back as a string from mysql2
        type: row.type,
        title: row.title,
        body: row.body,
        link: row.link,
        actorName: row.actor_name,
        entityType: row.entity_type,
        entityId: row.entity_id,
        metadata: row.metadata || null,
        isRead: !!row.is_read,
        createdAt: row.createdAt,
    };
}

// Rows per bulk INSERT when fanning out to a whole batch. Keeps any single
// statement small enough not to hold a long lock, while collapsing what would
// otherwise be hundreds of round-trips into a handful.
const INSERT_CHUNK_SIZE = 500;

// Insert one chunk. Returns how many rows actually landed. Never throws.
//
// bulkCreate is one statement, so a single bad row (e.g. a recipient whose users
// row was deleted between resolution and insert, violating the FK) fails the
// WHOLE chunk. The per-row fallback means one stale recipient can't cost the
// other 499 their notification.
async function insertChunk(records, type) {
    if (records.length === 0) return 0;

    try {
        const created = await Notification.bulkCreate(records);
        return created.length;
    } catch (error) {
        console.error(`[notify] Bulk insert failed for "${type}" (${records.length} rows), retrying individually:`, error.message);

        const settled = await Promise.allSettled(records.map((r) => Notification.create(r)));
        settled
            .filter((r) => r.status === "rejected")
            .forEach((r) => console.error(`[notify] Row failed for "${type}":`, r.reason?.message || r.reason));
        return settled.filter((r) => r.status === "fulfilled").length;
    }
}

// Current unread count for one recipient.
async function getUnreadCount(username) {
    return Notification.count({
        where: { recipient_username: username, is_read: false },
    });
}

// Push an already-persisted notification to a user's open streams, including the
// authoritative unread count so the client never has to do count+1 arithmetic
// (which drifts the moment two tabs are open or an event is missed).
async function pushToUser(username, row) {
    try {
        // Skip the COUNT entirely when the user has no open stream -- the common
        // case. Otherwise every fan-out pays one wasted query per offline
        // recipient, synchronously, on the triggering request's latency.
        if (!hub.hasClients(username)) return 0;

        const unreadCount = await getUnreadCount(username);
        return hub.push(username, "notification", {
            notification: serialize(row),
            unreadCount,
        });
    } catch (error) {
        console.error(`[notify] Failed to push to ${username}:`, error.message);
        return 0;
    }
}

/**
 * Persist one notification row per recipient, then push to any open stream.
 *
 * NEVER THROWS. Notifications are a side effect; a failure here must never break
 * the business action that triggered it. That guarantee lives HERE, not at the
 * call sites, so every future call site inherits it without remembering a
 * try/catch.
 *
 * Order is always persist-then-push: MySQL is the source of truth, SSE is only
 * an optimisation. A recipient with no open stream still gets the row.
 *
 * @returns {Promise<{ created: number, delivered: number }>}
 */
// opts defaults to {} and is destructured INSIDE the try: async parameter-binding
// failures reject, which would violate the never-throws contract for a caller
// that passes nothing.
async function notify(opts = {}) {
    try {
        const {
            recipients,             // string | string[] of users.username
            type,
            title,
            body = null,
            link = null,            // relative frontend path only
            actorUsername = null,
            actorName = null,
            entityType = null,
            entityId = null,
            metadata = null,
            excludeActor = true,    // never notify someone about their own action
        } = opts;

        if (!type || !title) {
            console.error("[notify] Missing required field: type and title are required.");
            return { created: 0, delivered: 0 };
        }

        // `type` is a free-form VARCHAR by design (no migration per new type), so
        // nothing at the DB level catches a typo. Warn loudly instead -- a typo'd
        // type persists forever and is undiscoverable short of SELECT DISTINCT.
        if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
            console.warn(`[notify] Unknown notification type "${type}" — add it to utils/notificationTypes.js`);
        }

        // A recipient is either a bare username, or an object carrying per-recipient
        // overrides: { username, title?, body?, link?, metadata? }. The object form
        // exists so a personalised fan-out (e.g. "your profile is 45% complete")
        // still goes through ONE batched insert path instead of N separate notify()
        // calls — which at 500+ students would be 500 round-trips against a
        // 5-connection pool.
        const raw = Array.isArray(recipients) ? recipients : [recipients];
        const byUsername = new Map();
        for (const r of raw) {
            if (!r) continue;
            const entry = typeof r === "object" ? { ...r, username: String(r.username || "") } : { username: String(r) };
            if (!entry.username) continue;
            if (excludeActor && actorUsername && entry.username === String(actorUsername)) continue;
            byUsername.set(entry.username, entry);   // dedupe, last wins
        }

        const list = [...byUsername.values()];
        if (list.length === 0) return { created: 0, delivered: 0 };

        const record = (entry) => ({
            recipient_username: entry.username,
            type: clamp(type, MAX.type),
            title: clamp(entry.title ?? title, MAX.title),
            body: entry.body ?? body,                // TEXT — no practical limit
            link: clamp(entry.link ?? link, MAX.link),
            actor_username: actorUsername,
            actor_name: clamp(actorName, MAX.actorName),
            entity_type: entityType,
            entity_id: clamp(entityId, MAX.entityId),
            // Pass a plain object. NEVER JSON.stringify() this — Sequelize's JSON
            // type serializes for you, and pre-stringifying double-encodes it (the
            // exact bug that hit events.event_description).
            metadata: entry.metadata ?? metadata,
        });

        // Split by connection state. Only recipients with an open stream need their
        // row's real id (to push it), and MySQL has no RETURNING — so they get
        // individual create()s. Everyone else is bulk-inserted, which is what keeps
        // a batch-wide fan-out from queueing hundreds of round-trips against the
        // pool (config/db.js sets no `pool`, so Sequelize's default max is 5 —
        // N individual creates there would starve every other request in the app).
        const online = list.filter((e) => hub.hasClients(e.username));
        const offline = list.filter((e) => !hub.hasClients(e.username));

        let created = 0;
        const rows = [];

        // allSettled, not all: there is no transaction here, so a rejection on
        // recipient 3 of 4 would otherwise leave rows 1-2 committed but never
        // pushed, and report created:0 — a lie. Partial success must still deliver.
        if (online.length > 0) {
            const settled = await Promise.allSettled(online.map((e) => Notification.create(record(e))));
            settled.forEach((r) => {
                if (r.status === "fulfilled") { rows.push(r.value); created++; }
                else console.error(`[notify] Row failed for "${type}":`, r.reason?.message || r.reason);
            });
        }

        for (let i = 0; i < offline.length; i += INSERT_CHUNK_SIZE) {
            created += await insertChunk(offline.slice(i, i + INSERT_CHUNK_SIZE).map(record), type);
        }

        let delivered = 0;
        for (const row of rows) {
            delivered += await pushToUser(row.recipient_username, row);
        }

        return { created, delivered };
    } catch (error) {
        console.error(`[notify] Failed to create "${type}" notification:`, error);
        return { created: 0, delivered: 0 };
    }
}

/**
 * notify(), fanned out to every enrolled student of a course.
 *
 * Mirrors the recipient resolution used by cron/attendanceReminderJob.js:
 * `{ CourseId, isEnrolled: true }` joined to a valid User. Note the field is
 * `CourseId` (capital C) on Student, unlike `courseId` elsewhere.
 *
 * Also never throws.
 *
 * @param {string} courseId
 * @param {object} payload  same shape as notify(), minus `recipients`
 */
async function notifyStudentsOfCourse(courseId, payload) {
    try {
        if (!courseId) {
            console.error("[notifyStudentsOfCourse] courseId is required.");
            return { created: 0, delivered: 0 };
        }

        const students = await Student.findAll({
            where: { CourseId: courseId, isEnrolled: true },
            attributes: ["StudentId"],
            include: [{ model: User, attributes: ["isValid"], required: true }],
        });

        // Skip deactivated accounts, matching how the email paths already filter.
        const recipients = students
            .filter((s) => s.User && s.User.isValid === 1)
            .map((s) => s.StudentId);

        if (recipients.length === 0) {
            console.warn(`[notifyStudentsOfCourse] No enrolled, valid students for course ${courseId}`);
            return { created: 0, delivered: 0 };
        }

        return await notify({ ...payload, recipients });
    } catch (error) {
        console.error(`[notifyStudentsOfCourse] Failed for course ${courseId}:`, error);
        return { created: 0, delivered: 0 };
    }
}

/**
 * notify(), with recipients resolved from users.role.
 * e.g. notifyRoles(["admin", "teacher"], { type, title, body, link })
 * Also never throws.
 */
async function notifyRoles(roles, payload) {
    try {
        const users = await User.findAll({
            where: { role: { [Op.in]: roles } },
            attributes: ["username"],
        });

        // Roles are exactly 'admin' | 'teacher' | 'student' (there is no
        // 'instructor', despite what CLAUDE.md says). A typo'd role silently
        // resolves to zero recipients, so say so rather than no-oping quietly.
        if (users.length === 0) {
            console.warn(`[notifyRoles] No users matched role(s): ${roles.join(", ")}`);
        }

        return await notify({ ...payload, recipients: users.map((u) => u.username) });
    } catch (error) {
        console.error(`[notifyRoles] Failed to resolve roles ${roles.join(",")}:`, error);
        return { created: 0, delivered: 0 };
    }
}

/**
 * True when EVERY intended recipient already has an equivalent notification for
 * this entity within `windowMs`. Used to stop a student hammering Save from
 * flooding the admin feed (and inbox).
 *
 * Scoped per recipient on purpose: a global "has anyone been notified?" check
 * would mean a teacher onboarded after the first submission never receives a
 * notification for that answer, and would also swallow the retry for a recipient
 * whose row failed to insert the first time.
 *
 * Never throws -- on error it returns false so the notification still goes out.
 */
async function wasRecentlyNotified({ recipients, type, entityType, entityId, windowMs = 10 * 60 * 1000 }) {
    try {
        // Accepts the same bare-username-or-object shape as notify().
        const list = [...new Set(
            (Array.isArray(recipients) ? recipients : [recipients])
                .filter(Boolean)
                .map((r) => (typeof r === "object" ? String(r.username || "") : String(r)))
                .filter(Boolean)
        )];
        if (list.length === 0) return false;

        const recent = await Notification.findAll({
            where: {
                recipient_username: { [Op.in]: list },
                type,
                entity_type: entityType,
                entity_id: String(entityId),
                createdAt: { [Op.gt]: new Date(Date.now() - windowMs) },
            },
            attributes: ["recipient_username"],
        });

        const notified = new Set(recent.map((r) => r.recipient_username));
        return list.every((u) => notified.has(u));
    } catch (error) {
        console.error("[notify] Suppression check failed:", error.message);
        return false;
    }
}

module.exports = {
    notify,
    notifyRoles,
    notifyStudentsOfCourse,
    serialize,
    getUnreadCount,
    wasRecentlyNotified,
};
