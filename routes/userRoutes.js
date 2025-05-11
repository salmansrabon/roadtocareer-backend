const express = require("express");
const router = express.Router();
const { updateUserStatus, getAllUsers, updateUserById, deleteUserById } = require("../controllers/userController");

// ✅ PATCH route to update user status (Active/Disabled)
router.patch("/:studentId", updateUserStatus);
router.get("/list", getAllUsers);
router.put("/update/:id", updateUserById);
router.delete("/delete/:id", deleteUserById);

module.exports = router;
