const express = require("express");
const ImageController = require("../controllers/imageController");

const router = express.Router();

router.post("/upload", ImageController.uploadImage);
router.get("/list", ImageController.listImages);
router.get("/:filename", ImageController.viewImage);

module.exports = router;
