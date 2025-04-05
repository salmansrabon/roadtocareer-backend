const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads/resumes");

// Ensure the folder exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Only PDF files are allowed"), false);
        }
        cb(null, true);
    }
});

const FileController = {
    // POST /api/file/upload
    uploadFile: [
        (req, res, next) => {
            upload.single("file")(req, res, function (err) {
                if (err instanceof multer.MulterError) {
                    return res.status(400).json({ success: false, message: "File size should not exceed 1MB" });
                } else if (err) {
                    return res.status(400).json({ success: false, message: err.message });
                }
                next();
            });
        },
        (req, res) => {
            if (!req.file) {
                return res.status(400).json({ success: false, message: "No file uploaded" });
            }

            const fileUrl = `/uploads/resumes/${req.file.filename}`;
            res.status(201).json({
                success: true,
                message: "File uploaded successfully",
                fileName: req.file.filename,
                fileSize: req.file.size,
                fileUrl
            });
        }
    ],


    // GET /api/file/list
    listFiles: (req, res) => {
        fs.readdir(uploadDir, (err, files) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Failed to retrieve files" });
            }

            const fileUrls = files.map(file => ({
                filename: file,
                url: `/uploads/resumes/${file}`
            }));

            res.status(200).json({ success: true, files: fileUrls });
        });
    },

    // GET /api/view/file/:filename
    viewFile: (req, res) => {
        const filename = req.params.filename;
        const filePath = path.join(uploadDir, filename);

        if (!filename || !fs.existsSync(filePath)) {
            console.log("File not found:", filename);
            return res.status(404).json({ success: false, message: "File not found" });
        }

        res.download(filePath); // force download
    }
}

module.exports = FileController;
