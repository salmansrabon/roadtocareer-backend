const express = require("express");
const router = express.Router();
const ImageController = require("../controllers/imageController");

// Upload Image to Specific Folder
router.post("/:folder/upload", ImageController.uploadImage);

// List Images in All Folder
router.get("/images", ImageController.listAllImages);

// List Images in Specific Folder
router.get("/:folder", ImageController.listImages);



// View Specific Image in Specific Folder
router.get("/:folder/:filename", ImageController.viewImage);

module.exports = router;
