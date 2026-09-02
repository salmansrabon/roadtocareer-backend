const User = require("../models/User"); // ✅ Import Sequelize User Model
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { sendEmail } = require("../utils/emailHelper");

// TASK-47: dual-write the JWT into an httpOnly cookie alongside the existing
// response-body token (backward compatible — Bearer-header clients are
// unaffected, see authMiddleware.authenticateUser).
//
// `secure` is derived from the actual request (`req.secure`), NOT
// `process.env.NODE_ENV` — this project's local `.env` sets
// `NODE_ENV=production` even for local dev (see env.template), so gating on
// NODE_ENV would mark the cookie Secure locally too and browsers silently
// refuse to store/send a Secure cookie over plain http://localhost.
// `req.secure` reflects the real scheme in both environments because
// `app.js` already sets `app.set("trust proxy", true)`, so it honors
// `X-Forwarded-Proto` behind the production reverse proxy.
//
// `domain` is left undefined in local dev (defaults to the exact request
// host) and set via COOKIE_DOMAIN in production to share the cookie across
// the frontend/API subdomains (see env.template).
const AUTH_COOKIE_NAME = "token";
const AUTH_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // matches the JWT's 12h expiry

function getAuthCookieOptions(req) {
    return {
        httpOnly: true,
        secure: req.secure,
        sameSite: "lax",
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: "/",
    };
}

// ✅ Register User
exports.register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // ✅ Check if user already exists
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // ✅ Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Create User
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            role,
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                createdAt: newUser.createdAt
            }
        });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ✅ Login User
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body; // ✅ Expect username instead of email

        // ✅ Find user by username
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // ✅ Check if the account is disabled
        if (user.isValid === 0) {
            return res.status(403).json({ message: "Sorry, your account is disabled." });
        }

        // ✅ Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // ✅ Generate JWT Token
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" });

        // TASK-47: dual-write — still returned in the body exactly as before,
        // ALSO set as an httpOnly cookie for the (currently unused) edge/SSR path.
        res.cookie(AUTH_COOKIE_NAME, token, { ...getAuthCookieOptions(req), maxAge: AUTH_COOKIE_MAX_AGE_MS });

        res.json({
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// TASK-47: clears the httpOnly auth cookie. Frontend localStorage/Bearer logout
// is unchanged (still purely client-side) — this only clears what client JS
// cannot reach on its own. No auth required: a caller with no/expired/invalid
// cookie should still be able to reach this and get a clean 200.
exports.logout = (req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions(req));
    res.json({ message: "Logged out" });
};


exports.requestPasswordReset = async (req, res) => {
    try {
        const { studentId } = req.body;

        // ✅ Find user by studentId
        const user = await User.findOne({ where: { username: studentId } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // ✅ Generate Reset Token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // ✅ Generate Reset Link
        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // ✅ Store token temporarily (expires in 15 mins)
        user.resetToken = resetToken;
        user.resetTokenExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        // ✅ Send Email with Reset Link
        const emailBody = `You requested to reset your password. 
        Click ${resetLink} here to reset your password.
        If you did not request this, ignore this email.`;

        await sendEmail(user.email, "Password Reset Request", emailBody);

        res.status(200).json({ message: "Password reset link sent to email." });
    } catch (error) {
        console.error("Error sending reset email:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // ✅ Find user by token
        const user = await User.findOne({
            where: { resetToken: token, resetTokenExpires: { [Op.gt]: Date.now() } }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // ✅ Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // ✅ Update password & remove token
        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpires = null;
        await user.save();

        res.status(200).json({ message: "Password reset successful!" });
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { username } = req.params; // Extract studentId (username) from URL
        const { currentPassword, newPassword } = req.body;

        // ✅ Find User by StudentId (username)
        const user = await User.findOne({ where: { username: username } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // ✅ Compare Current Password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        // ✅ Hash New Password & Update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};




