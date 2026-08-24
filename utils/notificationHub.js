// In-memory SSE connection registry (SRS 24).
//
// SAFE ONLY BECAUSE THIS APP RUNS AS A SINGLE NODE PROCESS -- server.js has one
// app.listen with no PM2 cluster and no worker_threads (the in-process node-cron
// registration confirms it). If the app is ever clustered or horizontally
// scaled, this registry MUST be replaced by shared pub/sub (Redis), otherwise a
// client only receives events emitted by the process it happens to be connected
// to.
//
// Same philosophy as utils/emailQueue.js: in-memory, best-effort, and honest
// about it. MySQL is the source of truth for notifications; this is only the
// realtime optimisation on top.

// Must stay comfortably under Nginx's proxy_read_timeout default of 60s,
// otherwise idle connections are torn down and every client reconnects a minute.
const HEARTBEAT_MS = 25000;

// Caps sockets held by one tab-hoarding user. An open SSE stream permanently
// occupies one of the browser's 6 connections per origin under HTTP/1.1.
const MAX_CONNECTIONS_PER_USER = 5;

const clients = new Map(); // normalized username -> Map<connectionId, res>
let nextConnectionId = 1;
let heartbeatTimer = null;

// users.username collates utf8mb4_unicode_ci, so MySQL treats "Salman" and
// "salman" as the same row -- but a JS Map does not. Normalize on both sides so
// a call site that passes a differently-cased username still reaches the stream
// instead of silently missing it.
function normalizeKey(username) {
    return String(username).toLowerCase();
}

function startHeartbeat() {
    if (heartbeatTimer) return;

    heartbeatTimer = setInterval(() => {
        for (const [username, conns] of clients) {
            for (const [connectionId, res] of conns) {
                // SSE comment frame: discarded by EventSource, but it is traffic,
                // so it resets Nginx's proxy_read_timeout and any LB idle timer.
                //
                // The heartbeat is also the real liveness detector: Nginx fails on
                // write to a dead downstream and closes the upstream socket, which
                // fires 'close' on the request within ~25s. res.write() does NOT
                // throw on a dead socket -- it returns false and reports the error
                // asynchronously -- so the write callback is what reaps it here.
                res.write(": ping\n\n", (err) => {
                    if (err) removeClient(username, connectionId);
                });
            }
        }
    }, HEARTBEAT_MS);

    // Don't hold the process open on shutdown.
    if (typeof heartbeatTimer.unref === "function") heartbeatTimer.unref();
}

function addClient(username, res) {
    const key = normalizeKey(username);

    let conns = clients.get(key);
    if (!conns) {
        conns = new Map();
        clients.set(key, conns);
    }

    // Evict oldest when a single user exceeds the cap.
    //
    // A clean res.end() reads to EventSource as a normal disconnect, so the
    // evicted tab would just reconnect ~3s later and evict the next-oldest --
    // a permanent round-robin storm for anyone over the limit. The sentinel
    // frame tells the client this eviction is deliberate so it closes for good
    // instead of retrying. (Map iteration order is insertion order, so
    // entries().next() is genuinely the oldest.)
    while (conns.size >= MAX_CONNECTIONS_PER_USER) {
        const oldest = conns.entries().next().value;
        if (!oldest) break;
        const [oldestId, oldestRes] = oldest;
        conns.delete(oldestId);
        try {
            oldestRes.write(`event: evicted\ndata: ${JSON.stringify({ reason: "too_many_connections" })}\n\n`);
            oldestRes.end();
        } catch (_) { /* already gone */ }
    }

    const connectionId = nextConnectionId++;
    conns.set(connectionId, res);
    startHeartbeat();
    return connectionId;
}

// MUST be called from the request's 'close'/'error' handlers -- that is the only
// path that reaps a disconnected client, since res.write() never throws on a
// dead socket. See controllers/notificationController.js stream().
function removeClient(username, connectionId) {
    const key = normalizeKey(username);
    const conns = clients.get(key);
    if (!conns) return;

    conns.delete(connectionId);
    // Keep the outer Map bounded -- otherwise it accumulates dead usernames.
    if (conns.size === 0) clients.delete(key);
}

// Hand an already-persisted notification to every open stream for `username`.
//
// Returns the number of streams the frame was HANDED TO -- not a delivery
// receipt. res.write() returns false merely to signal backpressure (the data is
// still queued and will be sent), and it never throws on a dead socket, so there
// is no synchronous way to know a frame actually reached a human. Do not branch
// on this value as if it meant "the user saw it".
//
// 0 means the user has no open stream, which is fine and expected: the row is
// already committed in MySQL and they'll see it on their next page load.
function push(username, eventName, payload) {
    const conns = clients.get(normalizeKey(username));
    if (!conns || conns.size === 0) return 0;

    // Guard the serialization itself: a caller passing a circular structure or a
    // BigInt would otherwise throw out of push(), and several call sites are
    // fire-and-forget. In a single-process backend an unhandled rejection takes
    // down every user's session, so this must never escape.
    let frame;
    try {
        if (!/^[a-z_]+$/.test(eventName)) throw new Error(`Invalid SSE event name: ${eventName}`);
        const data = JSON.stringify(payload);
        if (data === undefined) throw new Error("Payload is not serializable");
        frame = `event: ${eventName}\ndata: ${data}\n\n`;
    } catch (err) {
        console.error(`[notificationHub] Failed to build frame for ${username}:`, err.message);
        return 0;
    }

    let handedOff = 0;
    for (const [connectionId, res] of conns) {
        // The write callback is the only reliable failure signal -- see above.
        res.write(frame, (err) => {
            if (err) {
                console.error(`[notificationHub] write failed for ${username}:`, err.message);
                removeClient(username, connectionId);
            }
        });
        handedOff++;
    }
    return handedOff;
}

// True when the user has at least one open stream. Lets callers skip work that
// only matters for connected users.
function hasClients(username) {
    const conns = clients.get(normalizeKey(username));
    return !!conns && conns.size > 0;
}

function stats() {
    let connections = 0;
    for (const [, conns] of clients) connections += conns.size;
    return { users: clients.size, connections };
}

module.exports = { addClient, removeClient, push, hasClients, stats, HEARTBEAT_MS, MAX_CONNECTIONS_PER_USER };
