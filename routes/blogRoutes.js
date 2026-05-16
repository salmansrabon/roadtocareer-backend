const express = require("express");
const router = express.Router();
const {
    createBlog,
    getAllPublishedBlogs,
    getBlogBySlug,
    getAllBlogsAdmin,
    updateBlog,
    deleteBlog,
    reorderBlogs,
} = require("../controllers/blogController");
const { authenticateUser, requireAdmin } = require("../middlewares/authMiddleware");

// Public routes
router.get("/", getAllPublishedBlogs);

// Admin-only list — registered before /:slug so "admin" is never matched as a slug
router.get("/admin", authenticateUser, requireAdmin, getAllBlogsAdmin);

// Public slug lookup (after /admin to avoid conflict)
router.get("/:slug", getBlogBySlug);

// Admin-only write routes
router.post("/", authenticateUser, requireAdmin, createBlog);
router.put("/reorder", authenticateUser, requireAdmin, reorderBlogs); // must be before /:id
router.put("/:id", authenticateUser, requireAdmin, updateBlog);
router.delete("/:id", authenticateUser, requireAdmin, deleteBlog);

module.exports = router;
