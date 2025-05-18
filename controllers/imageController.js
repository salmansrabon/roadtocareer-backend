const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Memory storage to control folder saving
const upload = multer({ storage: multer.memoryStorage() });

const baseUploadDir = path.join(__dirname, "../images");

if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir, { recursive: true });
}

const ImageController = {
    // ✅ Upload Image to Dynamic Folder (from req.params.folder)
    uploadImage: [
        upload.single("image"),
        (req, res) => {
            const folderName = req.params.folder || "default";
            const targetDir = path.join(baseUploadDir, folderName);

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            if (!req.file) {
                return res.status(400).json({ success: false, message: "No image uploaded" });
            }

            const uniqueFilename = `${Date.now()}-${req.file.originalname}`;
            const filePath = path.join(targetDir, uniqueFilename);

            fs.writeFileSync(filePath, req.file.buffer);

            const imageUrl = `/images/${folderName}/${uniqueFilename}`;
            res.status(201).json({
                success: true,
                message: "Image uploaded successfully",
                imageUrl
            });
        }
    ],

    listAllImages: (req, res) => {
        fs.readdir(baseUploadDir, { withFileTypes: true }, (err, entries) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Failed to read base images folder" });
            }

            const folders = entries.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
            const allImages = [];

            folders.forEach(folder => {
                const folderPath = path.join(baseUploadDir, folder);
                const files = fs.readdirSync(folderPath);

                files.forEach(file => {
                    allImages.push({
                        folder,
                        filename: file,
                        url: `/images/${folder}/${file}`
                    });
                });
            });

            res.status(200).json({
                success: true,
                count: allImages.length,
                images: allImages
            });
        });
    },


    // ✅ List Images from a Specific Folder (req.params.folder)
    listImages: (req, res) => {
        const folderName = req.params.folder;  // ✅ Get folder from param
        const targetDir = path.join(baseUploadDir, folderName);

        if (!fs.existsSync(targetDir)) {
            return res.status(404).json({ success: false, message: "Folder not found" });
        }

        fs.readdir(targetDir, (err, files) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Failed to retrieve images" });
            }

            const imageUrls = files.map(file => ({
                filename: file,
                url: `/images/${folderName}/${file}`
            }));

            res.status(200).json({
                success: true,
                count: files.length,
                images: imageUrls
            });
        });
    },



    // ✅ View Specific Image (req.params.folder, req.params.filename)
    viewImage: (req, res) => {
        const { folder, filename } = req.params;
        const filePath = path.resolve(baseUploadDir, folder, filename); // Safe absolute path

        // Check file existence
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "Image not found" });
        }

        // Send file with safe path
        res.sendFile(filePath);
    }
};

module.exports = ImageController;
