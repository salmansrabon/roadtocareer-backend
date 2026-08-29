const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const { listFolderContents: listFolderHelper, uploadFileToFolder } = require("../utils/googleDriveHelper");
const { enqueueEmail } = require("../utils/emailQueue");
const { notifyStudentsOfCourse } = require("../utils/notificationHelper");
const { NOTIFICATION_TYPES, ENTITY_TYPES } = require("../utils/notificationTypes");
const Gallery = require("../models/Gallery");
const Student = require("../models/Student");
const User = require("../models/User");

const videoUploadDir = path.join(__dirname, "../uploads/tmp-videos");
if (!fs.existsSync(videoUploadDir)) {
    fs.mkdirSync(videoUploadDir, { recursive: true });
}

const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".mkv", ".avi"];
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB per chunk
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // abandoned upload sessions expire after 2h

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

// Chunks are small (<= CHUNK_SIZE); keep them in memory and write to the .part
// file ourselves at the correct byte offset. Small slack over CHUNK_SIZE covers
// multipart framing overhead.
const chunkUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: CHUNK_SIZE + 1024 * 1024 },
});

// ─── Chunked upload session store ───────────────────────────────────────────
// In-memory only (single production Node process). A restart drops in-flight
// sessions — acceptable: the client would just re-start the upload. Each
// session tracks which chunk indices have landed in its .part file on disk.
const uploadSessions = new Map(); // uploadId -> session

const isAllowedVideoUpload = (fileName, mimeType) => {
    const ext = path.extname(fileName || "").toLowerCase();
    const isVideoMime = (mimeType || "").startsWith("video/");
    return isVideoMime && ALLOWED_VIDEO_EXTENSIONS.includes(ext);
};

const destroySession = (uploadId) => {
    const session = uploadSessions.get(uploadId);
    if (!session) return;
    uploadSessions.delete(uploadId);
    if (session.partPath) {
        fs.unlink(session.partPath, (err) => {
            if (err && err.code !== "ENOENT") {
                console.error(`[chunkedUpload] Failed to delete part file ${session.partPath}:`, err.message);
            }
        });
    }
};

// Periodically reap sessions abandoned mid-upload (browser closed, network died)
// so their .part files don't accumulate on disk.
setInterval(() => {
    const now = Date.now();
    for (const [uploadId, session] of uploadSessions.entries()) {
        if (now - session.createdAt > SESSION_TTL_MS) {
            console.warn(`[chunkedUpload] Reaping stale upload session ${uploadId}.`);
            destroySession(uploadId);
        }
    }
}, 30 * 60 * 1000).unref(); // every 30 min; unref so it never keeps the process alive

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

// ✅ Best-effort, non-blocking: notify every isValid=true student in the batch that a new class video is up,
// by email AND by in-app notification.
// Email delivery + per-email retry are handled entirely by the background emailQueue, and notifyStudentsOfCourse()
// never throws, so this returns fast and never delays (or fails) the admin's upload response.
const notifyBatchStudentsOfNewVideo = async (courseId, { actorUsername = null, file = null } = {}) => {
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

        const seenEmails = new Set();
        for (const student of students) {
            if (!student.User || student.User.isValid !== 1) continue;
            if (!student.email || seenEmails.has(student.email)) continue;
            seenEmails.add(student.email);

            enqueueEmail({ to: student.email, subject, body, meta: { courseId, studentId: student.StudentId } });
        }

        // In-app notification (SRS 24). Recipients are resolved independently by
        // notifyStudentsOfCourse, which additionally requires isEnrolled=true — so this set can be
        // slightly narrower than the email set above. That stricter filter is what every other
        // in-app type uses; keep them consistent rather than matching the looser email query.
        //
        // Links to the list page, not /classResources/watch/<id>: Drive is usually still rendering
        // the file at this point, so a deep link would land on a video that won't play yet.
        await notifyStudentsOfCourse(courseId, {
            type: NOTIFICATION_TYPES.CLASS_VIDEO_UPLOADED,
            title: "New class recording uploaded",
            body: "Today's class video is up. If it is still processing, please check again in 10-15 minutes.",
            link: "/classResources/classResourcesList",
            actorUsername,
            actorName: actorUsername,
            entityType: ENTITY_TYPES.CLASS_RESOURCE,
            entityId: file?.id || null,
            metadata: { courseId, fileId: file?.id || null, fileName: file?.name || null },
        });
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
                    notifyBatchStudentsOfNewVideo(courseId, {
                        actorUsername: req.user?.username || null,
                        file: result.file,
                    }).catch((err) => {
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

// ─── Chunked upload: init ────────────────────────────────────────────────────
// Validates the file up front (before any bytes are sent), opens an empty
// .part file, and registers an in-memory session. Returns the chunk size and
// total chunk count so the client can slice the file identically.
exports.initVideoUpload = async (req, res) => {
    const { fileName, fileSize, mimeType, folderId, courseId } = req.body;

    if (!fileName || !mimeType) {
        return res.status(400).json({ success: false, message: "fileName and mimeType are required." });
    }
    if (!folderId) {
        return res.status(400).json({ success: false, message: "folderId is required." });
    }

    const size = Number(fileSize);
    if (!Number.isFinite(size) || size <= 0) {
        return res.status(400).json({ success: false, message: "A valid fileSize is required." });
    }
    if (size > MAX_VIDEO_SIZE) {
        return res.status(400).json({ success: false, message: "Video exceeds the 2GB size limit." });
    }
    if (!isAllowedVideoUpload(fileName, mimeType)) {
        return res.status(400).json({ success: false, message: "Only video files (mp4, mov, webm, mkv, avi) are allowed." });
    }

    const uploadId = crypto.randomBytes(16).toString("hex");
    const totalChunks = Math.ceil(size / CHUNK_SIZE);
    const partPath = path.join(videoUploadDir, `${uploadId}.part`);

    try {
        // Create (or truncate) the destination part file.
        fs.closeSync(fs.openSync(partPath, "w"));
    } catch (err) {
        console.error("[chunkedUpload] Failed to create part file:", err);
        return res.status(500).json({ success: false, message: "Failed to initialize upload." });
    }

    uploadSessions.set(uploadId, {
        fileName,
        mimeType,
        folderId,
        courseId: courseId || null,
        fileSize: size,
        totalChunks,
        receivedChunks: new Set(),
        partPath,
        createdAt: Date.now(),
    });

    return res.status(201).json({ success: true, uploadId, chunkSize: CHUNK_SIZE, totalChunks });
};

// ─── Chunked upload: chunk ───────────────────────────────────────────────────
// Writes one chunk at its exact byte offset. Positional writes make retries
// idempotent — a re-sent chunk overwrites the same range instead of duplicating.
exports.uploadVideoChunk = [
    (req, res, next) => {
        chunkUpload.single("chunk")(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({ success: false, message: "Chunk exceeds the allowed size." });
                }
                return res.status(400).json({ success: false, message: err.message });
            } else if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            next();
        });
    },
    async (req, res) => {
        const { uploadId } = req.body;
        const chunkIndex = Number(req.body.chunkIndex);

        const session = uploadSessions.get(uploadId);
        if (!session) {
            return res.status(404).json({ success: false, message: "Upload session not found or expired." });
        }
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ success: false, message: "No chunk data received." });
        }
        if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= session.totalChunks) {
            return res.status(400).json({ success: false, message: "Invalid chunkIndex." });
        }

        const offset = chunkIndex * CHUNK_SIZE;
        let fd;
        try {
            fd = fs.openSync(session.partPath, "r+");
            fs.writeSync(fd, req.file.buffer, 0, req.file.buffer.length, offset);
        } catch (err) {
            console.error(`[chunkedUpload] Failed writing chunk ${chunkIndex} for ${uploadId}:`, err.message);
            return res.status(500).json({ success: false, message: "Failed to store chunk." });
        } finally {
            if (fd !== undefined) {
                try { fs.closeSync(fd); } catch (_) { /* ignore */ }
            }
        }

        session.receivedChunks.add(chunkIndex);
        return res.status(200).json({ success: true, received: session.receivedChunks.size, total: session.totalChunks });
    },
];

// ─── Chunked upload: complete ────────────────────────────────────────────────
// Verifies all chunks are present and the assembled size matches, then streams
// the file to Drive (hardened with timeout + retry), enqueues notifications,
// and cleans up.
exports.completeVideoUpload = async (req, res) => {
    const { uploadId } = req.body;

    const session = uploadSessions.get(uploadId);
    if (!session) {
        return res.status(404).json({ success: false, message: "Upload session not found or expired." });
    }

    if (session.receivedChunks.size !== session.totalChunks) {
        return res.status(400).json({
            success: false,
            message: `Upload incomplete: received ${session.receivedChunks.size} of ${session.totalChunks} chunks.`,
        });
    }

    let actualSize;
    try {
        actualSize = fs.statSync(session.partPath).size;
    } catch (err) {
        destroySession(uploadId);
        return res.status(400).json({ success: false, message: "Assembled file is missing." });
    }
    if (actualSize !== session.fileSize) {
        destroySession(uploadId);
        return res.status(400).json({
            success: false,
            message: `Assembled size mismatch (expected ${session.fileSize}, got ${actualSize}). Please re-upload.`,
        });
    }

    try {
        const result = await uploadFileToFolder(session.folderId, session.partPath, session.fileName, session.mimeType);

        if (result.success) {
            const courseId = session.courseId;
            res.status(201).json({ success: true, file: result.file });
            if (courseId) {
                notifyBatchStudentsOfNewVideo(courseId, {
                    actorUsername: req.user?.username || null,
                    file: result.file,
                }).catch((err) => {
                    console.error("[completeVideoUpload] Unexpected error notifying batch students:", err);
                });
            }
            destroySession(uploadId);
            return;
        }

        destroySession(uploadId);
        return res.status(500).json({ success: false, message: result.error });
    } catch (error) {
        console.error("Error finalizing chunked video upload to Drive:", error);
        destroySession(uploadId);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─── Chunked upload: abort ───────────────────────────────────────────────────
// Best-effort cleanup when the admin cancels or navigates away. Idempotent.
exports.abortVideoUpload = async (req, res) => {
    const { uploadId } = req.body;
    if (uploadId) destroySession(uploadId);
    return res.status(200).json({ success: true });
};

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
