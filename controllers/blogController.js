const Blog = require("../models/Blog");

// POST /api/blogs — admin only
exports.createBlog = async (req, res) => {
    try {
        const { title, excerpt, content, coverImage, author, status } = req.body;

        if (!title || !excerpt || !content) {
            return res.status(400).json({ message: "title, excerpt, and content are required" });
        }

        if (status && !["draft", "published"].includes(status)) {
            return res.status(400).json({ message: "status must be 'draft' or 'published'" });
        }

        const slug =
            title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "") +
            "-" +
            Date.now();

        const publishedAt =
            (status === "published") ? new Date() : null;

        const blog = await Blog.create({
            title,
            slug,
            excerpt,
            content,
            coverImage: coverImage || null,
            author: author || "Admin",
            status: status || "draft",
            publishedAt,
        });

        res.status(201).json({ message: "Blog created successfully", data: blog });
    } catch (error) {
        console.error("Error creating blog:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/blogs — public
exports.getAllPublishedBlogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: blogs } = await Blog.findAndCountAll({
            where: { status: "published" },
            attributes: ["id", "title", "slug", "excerpt", "coverImage", "author", "publishedAt"],
            order: [["publishedAt", "DESC"]],
            limit,
            offset,
        });

        res.status(200).json({
            message: "Published blogs fetched successfully",
            total: count,
            page,
            limit,
            blogs,
        });
    } catch (error) {
        console.error("Error fetching published blogs:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/blogs/:slug — public
exports.getBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const blog = await Blog.findOne({
            where: { slug, status: "published" },
        });

        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }

        res.status(200).json({ message: "Blog fetched successfully", data: blog });
    } catch (error) {
        console.error("Error fetching blog by slug:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/blogs/admin — admin only
exports.getAllBlogsAdmin = async (req, res) => {
    try {
        const blogs = await Blog.findAll({
            attributes: ["id", "title", "slug", "excerpt", "content", "coverImage", "author", "status", "publishedAt", "createdAt"],
            order: [["createdAt", "DESC"]],
        });

        res.status(200).json({ message: "All blogs fetched successfully", data: blogs });
    } catch (error) {
        console.error("Error fetching all blogs for admin:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/blogs/:id — admin only
exports.updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, excerpt, content, coverImage, author, status } = req.body;

        const blog = await Blog.findByPk(id);
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }

        if (title !== undefined) blog.title = title;
        if (excerpt !== undefined) blog.excerpt = excerpt;
        if (content !== undefined) blog.content = content;
        if (coverImage !== undefined) blog.coverImage = coverImage;
        if (author !== undefined) blog.author = author;

        if (status !== undefined) {
            if (!["draft", "published"].includes(status)) {
                return res.status(400).json({ message: "status must be 'draft' or 'published'" });
            }
            if (status === "published" && blog.publishedAt === null) {
                blog.publishedAt = new Date();
            }
            blog.status = status;
        }

        await blog.save();

        res.status(200).json({ message: "Blog updated successfully", data: blog });
    } catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/blogs/:id — admin only
exports.deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findByPk(id);
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }

        await blog.destroy();

        res.status(200).json({ message: "Blog deleted successfully" });
    } catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
