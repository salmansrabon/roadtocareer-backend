const express = require("express");
const GoogleDriveController = require("../controllers/googleDriveController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/list-folder", authenticateUser, GoogleDriveController.listFolderContents); // ✅ FIXED USAGE

module.exports = router;
