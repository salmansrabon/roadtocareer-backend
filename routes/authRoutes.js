const express = require("express");
const { register, login, requestPasswordReset, resetPassword, changePassword } = require("../controllers/authController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/change-password/:username", authenticateUser, changePassword);

module.exports = router;
