const express = require("express");
const router = express.Router();
const { updateUserStatus, getAllUsers, updateUserById, deleteUserById } = require("../controllers/userController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

// ✅ PATCH route to update user status (Active/Disabled)
router.patch("/:studentId", authenticateUser, requireAdmin, updateUserStatus);
router.get("/list", authenticateUser, requireAdmin, getAllUsers);
router.put("/update/:id", authenticateUser, requireAdmin, updateUserById);
router.delete("/delete/:id", authenticateUser, requireAdmin, deleteUserById);

module.exports = router;
