const crypto = require("crypto");

// Short-lived, single-use tickets that let a browser EventSource authenticate
// without an Authorization header (EventSource cannot send one).
//
// Deliberately NOT the JWT itself: a 12h token in a query string ends up in
// Nginx access logs, Referer headers and browser history. For an admin account
// that is a privilege-escalation vector, not a hygiene nit.
//
// In-memory only -- safe because the app is a single Node process (server.js has
// one app.listen, and the in-process node-cron jobs confirm it). If the backend
// is ever clustered, this MUST move to shared storage (Redis) or a ticket minted
// by one worker won't be redeemable on another.

// IMPORTANT CLIENT CONTRACT: tickets are SINGLE USE, which means the browser's
// native EventSource auto-reconnect CANNOT work -- it re-fetches the identical
// URL, the ticket is already burned, it gets a 401, and per spec a non-2xx makes
// EventSource fail PERMANENTLY AND SILENTLY.
//
// The client must therefore drive its own reconnect: close the stream in
// onerror, POST /api/notifications/stream-ticket for a fresh ticket, and open a
// new EventSource (with backoff). frontend/hooks/useNotifications.js does this.
// Do not "simplify" that away.

const TICKET_TTL_MS = 60 * 1000;

// A user legitimately needs several live tickets at once: each browser tab mints
// its own, and a reconnect mints another. Capping at 1 per user would mean tab 2's
// mint invalidates tab 1's ticket before tab 1 can redeem it. Sized a little above
// notificationHub's MAX_CONNECTIONS_PER_USER (5) to absorb reconnect churn.
const MAX_TICKETS_PER_USER = 8;

const tickets = new Map();       // ticket -> { username, role, expiresAt }
const ticketsByUser = new Map(); // normalized username -> ticket[] (oldest first)

function normalizeKey(username) {
    return String(username).toLowerCase();
}

// Mint a ticket for an already-authenticated user.
//
// Per-user bounding rather than a global sweep: this backend has no rate limiting
// anywhere, so an unbounded store would be a trivially reachable memory/CPU DoS
// from any logged-in account (and an O(n) sweep on every mint would make it O(n^2)).
// Here the store is bounded at users x MAX_TICKETS_PER_USER no matter how hard the
// endpoint is hit, with no scan.
function issueTicket({ username, role }) {
    const key = normalizeKey(username);

    let userTickets = ticketsByUser.get(key);
    if (!userTickets) {
        userTickets = [];
        ticketsByUser.set(key, userTickets);
    }

    // Drop this user's expired tickets, then the oldest if still over the cap.
    const now = Date.now();
    for (let i = userTickets.length - 1; i >= 0; i--) {
        const entry = tickets.get(userTickets[i]);
        if (!entry || entry.expiresAt <= now) {
            tickets.delete(userTickets[i]);
            userTickets.splice(i, 1);
        }
    }
    while (userTickets.length >= MAX_TICKETS_PER_USER) {
        tickets.delete(userTickets.shift());
    }

    const ticket = crypto.randomBytes(32).toString("hex");
    tickets.set(ticket, { username, role, expiresAt: now + TICKET_TTL_MS });
    userTickets.push(ticket);
    return ticket;
}

// Redeem a ticket. Single use: the entry is removed whether or not it was still
// valid, so a ticket scraped from a log has already lost the race.
function redeemTicket(ticket) {
    if (!ticket) return null;

    const entry = tickets.get(ticket);
    if (!entry) return null;

    tickets.delete(ticket);

    const key = normalizeKey(entry.username);
    const userTickets = ticketsByUser.get(key);
    if (userTickets) {
        const i = userTickets.indexOf(ticket);
        if (i !== -1) userTickets.splice(i, 1);
        if (userTickets.length === 0) ticketsByUser.delete(key);
    }

    if (entry.expiresAt <= Date.now()) return null;

    return { username: entry.username, role: entry.role };
}

module.exports = { issueTicket, redeemTicket, TICKET_TTL_MS };
