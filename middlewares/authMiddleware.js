const jwt = require("jsonwebtoken");

// ✅ Middleware to Authenticate User
exports.authenticateUser = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(403).json({ message: "Unauthorized" });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Invalid token" });

        req.user = decoded; // ✅ Store decoded token payload (id, role, etc.)
        next();
    });
};

// ✅ Middleware to Restrict Access to Admins Only
exports.requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin" && req.user.role !== "teacher") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    next();
};
