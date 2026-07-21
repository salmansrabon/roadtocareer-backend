const { sendEmail } = require("./emailHelper");

// In-memory background queue for fire-and-forget notification emails.
// Jobs live only in process memory — a restart/deploy drops whatever is
// still pending. Acceptable for best-effort notifications; switch to a
// persistent, Redis-backed queue (e.g. BullMQ) if guaranteed delivery is
// ever required.

const CONCURRENCY = 5;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000; // multiplied by attempt number for backoff

const queue = [];
let activeWorkers = 0;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runJob(job) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const sent = await sendEmail(job.to, job.subject, job.body, job.contentType || "text/plain", job.options || {});
            if (sent) return true;
            throw new Error("sendEmail returned false");
        } catch (err) {
            const isLastAttempt = attempt === MAX_ATTEMPTS;
            console.error(
                `[emailQueue] Failed to send "${job.subject}" to ${job.to} (attempt ${attempt}/${MAX_ATTEMPTS})${job.meta ? ` [${JSON.stringify(job.meta)}]` : ""}:`,
                err.message || err
            );
            if (isLastAttempt) return false;
            await delay(RETRY_DELAY_MS * attempt);
        }
    }
    return false;
}

function processQueue() {
    while (activeWorkers < CONCURRENCY && queue.length > 0) {
        const job = queue.shift();
        activeWorkers++;
        runJob(job)
            .then((sent) => job.resolve(sent))
            .finally(() => {
                activeWorkers--;
                processQueue();
            });
    }
}

// Adds an email job to the in-memory queue and returns immediately with a
// promise callers may optionally await to learn the final success/failure
// outcome (after retries) — existing fire-and-forget call-sites that ignore
// the return value are unaffected.
// Call-site is responsible for deduping recipients within a single request.
function enqueueEmail({ to, subject, body, meta, contentType, options }) {
    return new Promise((resolve) => {
        queue.push({ to, subject, body, meta, contentType, options, resolve });
        processQueue();
    });
}

module.exports = { enqueueEmail };
