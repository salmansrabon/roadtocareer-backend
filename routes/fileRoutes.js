const express = require("express");
const FileController = require("../controllers/fileController");

const router = express.Router();

router.post("/upload", FileController.uploadFile);
router.get("/list", FileController.listFiles);
router.get("/view/:filename", FileController.viewFile);

module.exports = router;
