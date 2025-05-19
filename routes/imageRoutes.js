const express = require("express");
const router = express.Router();
const ImageController = require("../controllers/ImageController");

// Upload Image to Specific Folder
router.post("/:folder/upload", ImageController.uploadImage);

// List Images in Specific Folder
router.get("/:folder", ImageController.listImages);
// List Images in All Folder
router.get("/images", ImageController.listAllImages);


// View Specific Image in Specific Folder
router.get("/:folder/:filename", ImageController.viewImage);

module.exports = router;
