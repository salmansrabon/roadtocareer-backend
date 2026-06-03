const express = require("express");
const router = express.Router();
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

const {
    getAllBooksAdmin,
    createBook,
    reorderBooks,
    togglePublish,
    updateBook,
    deleteBook,
} = require("../controllers/bookController");

const {
    createChapter,
    reorderChapters,
    updateChapter,
    deleteChapter,
} = require("../controllers/bookChapterController");

const {
    createTopic,
    reorderTopics,
    updateTopic,
    deleteTopic,
} = require("../controllers/bookTopicController");

const {
    unlockTopics,
    unlockTopicsForStudents,
    getBookAccess,
    getStudentAccess,
    removeAccess,
    removeStudentAccess,
    getPublishedBooks,
    getBookBySlug,
    getTopicContent,
} = require("../controllers/bookAccessController");

// ── GET: static paths first, dynamic /:slug last ──────────────────────────────
router.get("/admin", authenticateUser, requireAdmin, getAllBooksAdmin);
router.get("/topics/:id/content", authenticateUser, getTopicContent);
router.get("/", authenticateUser, getPublishedBooks);

// ── POST: static paths first, then dynamic /:bookId/* ─────────────────────────
router.post("/", authenticateUser, requireAdmin, createBook);
router.post("/access/unlock", authenticateUser, requireAdmin, unlockTopics);
router.post("/access/unlock-students", authenticateUser, requireAdmin, unlockTopicsForStudents);
router.post("/chapters/:chapterId/topics", authenticateUser, requireAdmin, createTopic);
router.post("/:bookId/chapters", authenticateUser, requireAdmin, createChapter);

// ── PUT: static reorder routes first, then /chapters/:id, /topics/:id, /:id ──
router.put("/reorder", authenticateUser, requireAdmin, reorderBooks);
router.put("/chapters/reorder", authenticateUser, requireAdmin, reorderChapters);
router.put("/topics/reorder", authenticateUser, requireAdmin, reorderTopics);
router.put("/chapters/:id", authenticateUser, requireAdmin, updateChapter);
router.put("/topics/:id", authenticateUser, requireAdmin, updateTopic);
router.put("/:id/publish", authenticateUser, requireAdmin, togglePublish);     // before /:id
router.put("/:id", authenticateUser, requireAdmin, updateBook);

// ── DELETE: static /access and /chapters|topics/:id before /:id ───────────────
router.delete("/access/student", authenticateUser, requireAdmin, removeStudentAccess);
router.delete("/access", authenticateUser, requireAdmin, removeAccess);
router.delete("/chapters/:id", authenticateUser, requireAdmin, deleteChapter);
router.delete("/topics/:id", authenticateUser, requireAdmin, deleteTopic);
router.delete("/:id", authenticateUser, requireAdmin, deleteBook);

// ── Remaining dynamic GET routes ──────────────────────────────────────────────
router.get("/:bookId/access/students", authenticateUser, requireAdmin, getStudentAccess);
router.get("/:bookId/access", authenticateUser, requireAdmin, getBookAccess);
router.get("/:slug", authenticateUser, getBookBySlug);                          // LAST

module.exports = router;
