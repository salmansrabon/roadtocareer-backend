const express = require("express");
const GoogleDriveController = require("../controllers/googleDriveController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/list-folder", authenticateUser, GoogleDriveController.listFolderContents); // ✅ FIXED USAGE
router.post("/upload-video", authenticateUser, requireAdmin, GoogleDriveController.uploadVideo);
// Chunked + resumable video upload (large files). init -> chunk (repeat) -> complete; abort to cancel.
router.post("/upload-video/init", authenticateUser, requireAdmin, GoogleDriveController.initVideoUpload);
router.post("/upload-video/chunk", authenticateUser, requireAdmin, GoogleDriveController.uploadVideoChunk);
router.post("/upload-video/complete", authenticateUser, requireAdmin, GoogleDriveController.completeVideoUpload);
router.post("/upload-video/abort", authenticateUser, requireAdmin, GoogleDriveController.abortVideoUpload);
router.get("/list", GoogleDriveController.getAllGoogleDriveLinks); // Public route for gallery
router.post("/create", authenticateUser, GoogleDriveController.createGoogleDriveLink);
router.put("/update/:id", authenticateUser, GoogleDriveController.updateGoogleDriveLink);
router.put("/reorder", authenticateUser, GoogleDriveController.reorderGalleryItems);
router.delete("/delete/:id", authenticateUser, GoogleDriveController.deleteGoogleDriveLink);

module.exports = router;
