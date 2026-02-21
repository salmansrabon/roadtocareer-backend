const express = require("express");
const GoogleDriveController = require("../controllers/googleDriveController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/list-folder", authenticateUser, GoogleDriveController.listFolderContents); // ✅ FIXED USAGE
router.get("/list", GoogleDriveController.getAllGoogleDriveLinks); // Public route for gallery
router.post("/create", authenticateUser, GoogleDriveController.createGoogleDriveLink);
router.put("/update/:id", authenticateUser, GoogleDriveController.updateGoogleDriveLink);
router.put("/reorder", authenticateUser, GoogleDriveController.reorderGalleryItems);
router.delete("/delete/:id", authenticateUser, GoogleDriveController.deleteGoogleDriveLink);

module.exports = router;
