const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { listFolderContents: listFolderHelper, uploadFileToFolder } = require("../utils/googleDriveHelper");
const { sendEmail } = require("../utils/emailHelper");
const Gallery = require("../models/Gallery");
const Student = require("../models/Student");
const User = require("../models/User");

const videoUploadDir = path.join(__dirname, "../uploads/tmp-videos");
if (!fs.existsSync(videoUploadDir)) {
    fs.mkdirSync(videoUploadDir, { recursive: true });
}

const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".mkv", ".avi"];
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, videoUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const videoUpload = multer({
    storage: videoStorage,
    limits: { fileSize: MAX_VIDEO_SIZE },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const isVideoMime = (file.mimetype || "").startsWith("video/");
        if (!isVideoMime || !ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
            return cb(new Error("Only video files (mp4, mov, webm, mkv, avi) are allowed"), false);
        }
        cb(null, true);
    },
});

exports.listFolderContents = async (req, res) => {
    const { parentId, sharedDriveId } = req.query;

    if (!parentId) {
        return res.status(400).json({ success: false, error: "parentId query parameter is required." });
    }

    try {
        const result = await listFolderHelper(parentId, sharedDriveId);

        if (result.success) {
            return res.status(200).json(result.files);
        } else {
            return res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error("Controller error:", error);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
};

exports.getAllGoogleDriveLinks = async (req, res) => {
    try {
        const galleryItems = await Gallery.findAll({
            order: [["position", "ASC"], ["createdAt", "DESC"]],
        });

        return res.status(200).json({
            success: true,
            count: galleryItems.length,
            data: galleryItems,
        });
    } catch (error) {
        console.error("Error fetching gallery items:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

exports.createGoogleDriveLink = async (req, res) => {
    try {
        const { title, description, gdrive_link, thumbnail } = req.body;

        if (!title || !gdrive_link) {
            return res.status(400).json({
                success: false,
                message: "title and gdrive_link are required",
            });
        }

        // Get the highest position and add 1 for new item
        const maxPositionItem = await Gallery.findOne({
            order: [["position", "DESC"]],
        });
        const newPosition = maxPositionItem ? maxPositionItem.position + 1 : 1;

        const createdLink = await Gallery.create({
            position: newPosition,
            title,
            description: description || null,
            gdrive_link,
            thumbnail: thumbnail || null,
        });

        return res.status(201).json({
            success: true,
            message: "Gallery item added successfully",
            data: createdLink,
        });
    } catch (error) {
        console.error("Error creating gallery item:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

exports.updateGoogleDriveLink = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, gdrive_link, thumbnail } = req.body;

        const galleryItem = await Gallery.findByPk(id);

        if (!galleryItem) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found",
            });
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (gdrive_link !== undefined) updateData.gdrive_link = gdrive_link;
        if (thumbnail !== undefined) updateData.thumbnail = thumbnail;

        await galleryItem.update(updateData);

        return res.status(200).json({
            success: true,
            message: "Gallery item updated successfully",
            data: galleryItem,
        });
    } catch (error) {
        console.error("Error updating gallery item:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

exports.deleteGoogleDriveLink = async (req, res) => {
    try {
        const { id } = req.params;

        const galleryItem = await Gallery.findByPk(id);

        if (!galleryItem) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found",
            });
        }

        await galleryItem.destroy();

        return res.status(200).json({
            success: true,
            message: "Gallery item deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting gallery item:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// ✅ Best-effort, non-blocking: email every isValid=true student in the batch that a new class video is up.
// Never awaited by the request handler — a slow/failing email run must never delay the admin's upload response.
const notifyBatchStudentsOfNewVideo = async (courseId) => {
    try {
        const students = await Student.findAll({
            where: { CourseId: courseId },
            include: [{ model: User, attributes: ["isValid"] }],
        });

        const subject = "New Class Recording Uploaded";
        const body = `Hello,

Today's class video is being uploaded. Please login to the student portal and check on recorded video menu page.

If you see the video is still processing, please try again after 10-15 minutes until the video is fully rendered.

Regards,
Team, Road to SDET`;

        for (const student of students) {
            if (!student.User || student.User.isValid !== 1) continue;
            if (!student.email) continue;

            try {
                const sent = await sendEmail(student.email, subject, body);
                if (!sent) {
                    console.warn(`[uploadVideo] sendEmail returned false for ${student.email}.`);
                }
            } catch (emailErr) {
                console.error(`[uploadVideo] Failed sending new-video notification to ${student.email}:`, emailErr);
            }
        }
    } catch (error) {
        console.error("[uploadVideo] Error notifying batch students of new video:", error);
    }
};

exports.uploadVideo = [
    (req, res, next) => {
        videoUpload.single("video")(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({ success: false, message: "Video exceeds the 2GB size limit." });
                }
                return res.status(400).json({ success: false, message: err.message });
            } else if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            next();
        });
    },
    async (req, res) => {
        const { folderId, courseId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: "No video file uploaded." });
        }

        if (!folderId) {
            fs.unlink(file.path, () => {});
            return res.status(400).json({ success: false, message: "folderId is required." });
        }

        try {
            const result = await uploadFileToFolder(folderId, file.path, file.originalname, file.mimetype);

            if (result.success) {
                res.status(201).json({ success: true, file: result.file });
                if (courseId) {
                    notifyBatchStudentsOfNewVideo(courseId).catch((err) => {
                        console.error("[uploadVideo] Unexpected error notifying batch students:", err);
                    });
                }
                return;
            }
            return res.status(500).json({ success: false, message: result.error });
        } catch (error) {
            console.error("Error uploading video to Drive:", error);
            return res.status(500).json({ success: false, message: "Internal server error." });
        } finally {
            fs.unlink(file.path, (err) => {
                if (err) console.error("Failed to delete temp video file:", err);
            });
        }
    },
];

exports.reorderGalleryItems = async (req, res) => {
    try {
        const { items } = req.body; // Expected format: [{ id: 1, position: 0 }, { id: 2, position: 1 }, ...]

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "items array is required",
            });
        }

        // Update positions for all items
        const updatePromises = items.map((item) =>
            Gallery.update(
                { position: item.position },
                { where: { id: item.id } }
            )
        );

        await Promise.all(updatePromises);

        return res.status(200).json({
            success: true,
            message: "Gallery items reordered successfully",
        });
    } catch (error) {
        console.error("Error reordering gallery items:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
