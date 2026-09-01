const express = require("express");
const router = express.Router();
const ImageController = require("../controllers/imageController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

// Upload Image to Specific Folder
router.post("/:folder/upload", authenticateUser, ImageController.uploadImage);

// List Images in All Folder
router.get("/images", authenticateUser, requireAdmin, ImageController.listAllImages);

// List Images in Specific Folder
router.get("/:folder", authenticateUser, requireAdmin, ImageController.listImages);



// View Specific Image in Specific Folder
router.get("/:folder/:filename", ImageController.viewImage);

module.exports = router;
