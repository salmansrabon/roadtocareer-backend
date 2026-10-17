// Minimal in-memory sliding-window rate limiter for endpoints that must stay
// public (no auth) but call billable/abusable services (OpenAI, outbound
// email). No new dependency — the app runs as a single process (same
// assumption notificationHub.js already makes), so an in-memory Map is fine.
/**
 * @param {{ windowMs: number, max: number, message?: string }} opts
 */
exports.rateLimit = ({ windowMs, max, message }) => {
  // One bucket map per limiter, so two routes limited by the same IP never
  // count against each other's window/max.
  const buckets = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.start > windowMs) {
      buckets.set(key, { start: now, count: 1 });
      return next();
    }

    if (bucket.count >= max) {
      return res.status(429).json({
        message: message || "Too many requests. Please try again shortly.",
      });
    }

    bucket.count += 1;
    next();
  };
};
