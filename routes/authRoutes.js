const express = require("express");
const { register, login, logout, requestPasswordReset, resetPassword, changePassword, getLinkedAccounts, switchAccount } = require("../controllers/authController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout); // TASK-47: no auth required, clears whatever cookie exists
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/change-password/:username", authenticateUser, changePassword);
router.get("/linked-accounts", authenticateUser, getLinkedAccounts); // TASK-63
router.post("/switch-account", authenticateUser, switchAccount); // TASK-63

module.exports = router;
