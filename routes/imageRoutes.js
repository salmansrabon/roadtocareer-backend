const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// ✅ Ensure the "images" folder exists
const uploadDir = path.join(__dirname, "../images");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // ✅ Save files in "images" folder
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });

// ✅ API 1: Upload an Image
router.post("/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const imageUrl = `/images/${req.file.filename}`;
    res.status(201).json({ success: true, message: "Image uploaded successfully", imageUrl });
});

// ✅ API 2: Get List of All Images
router.get("/list", (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Failed to retrieve images" });
        }

        const imageUrls = files.map(file => ({
            filename: file,
            url: `/images/${file}`
        }));

        res.status(200).json({ success: true, images: imageUrls });
    });
});

// ✅ API 3: View Image in Browser
router.get("/:filename", (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "Image not found" });
    }

    res.sendFile(filePath);
});

module.exports = router;
