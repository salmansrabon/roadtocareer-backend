const express = require("express");
const router = express.Router();
const { updateUserStatus } = require("../controllers/userController");

// ✅ PATCH route to update user status (Active/Disabled)
router.patch("/:studentId", updateUserStatus);

module.exports = router;
