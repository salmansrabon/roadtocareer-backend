const Book = require("../models/Book");
const BookChapter = require("../models/BookChapter");

// GET /api/books/admin — admin only
exports.getAllBooksAdmin = async (req, res) => {
    try {
        const books = await Book.findAll({
            include: [{
                model: BookChapter,
                attributes: ["id", "title", "sort_order", "status"],
                order: [["sort_order", "ASC"]],
            }],
            order: [["sort_order", "ASC"], ["createdAt", "DESC"]],
        });

        res.status(200).json({ message: "Books fetched successfully", data: books });
    } catch (error) {
        console.error("Error fetching books for admin:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/books — admin only
exports.createBook = async (req, res) => {
    try {
        const { title, description, cover_image, status } = req.body;

        if (!title) {
            return res.status(400).json({ message: "title is required" });
        }

        if (status && !["draft", "published"].includes(status)) {
            return res.status(400).json({ message: "status must be 'draft' or 'published'" });
        }

        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        const existing = await Book.findOne({ where: { slug } });
        if (existing) {
            return res.status(409).json({ message: "A book with this title already exists. Use a different title." });
        }

        const book = await Book.create({
            title,
            slug,
            description: description || null,
            cover_image: cover_image || null,
            status: status || "draft",
            sort_order: 0,
        });

        res.status(201).json({ message: "Book created successfully", data: book });
    } catch (error) {
        console.error("Error creating book:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/books/reorder — admin only
// Body: { orders: [{ id, sort_order }, ...] }
exports.reorderBooks = async (req, res) => {
    try {
        const { orders } = req.body;
        if (!Array.isArray(orders) || orders.length === 0) {
            return res.status(400).json({ message: "orders array is required" });
        }

        await Promise.all(
            orders.map(({ id, sort_order }) =>
                Book.update({ sort_order }, { where: { id } })
            )
        );

        res.status(200).json({ message: "Book order updated successfully" });
    } catch (error) {
        console.error("Error reordering books:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/books/:id/publish — admin only
exports.togglePublish = async (req, res) => {
    try {
        const { id } = req.params;

        const book = await Book.findByPk(id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        book.status = book.status === "published" ? "draft" : "published";
        await book.save();

        res.status(200).json({ message: `Book ${book.status === "published" ? "published" : "unpublished"} successfully`, data: book });
    } catch (error) {
        console.error("Error toggling book publish:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/books/:id — admin only
exports.updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, cover_image, status } = req.body;

        const book = await Book.findByPk(id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        if (status !== undefined && !["draft", "published"].includes(status)) {
            return res.status(400).json({ message: "status must be 'draft' or 'published'" });
        }

        if (title !== undefined) book.title = title;
        if (description !== undefined) book.description = description;
        if (cover_image !== undefined) book.cover_image = cover_image;
        if (status !== undefined) book.status = status;

        await book.save();

        res.status(200).json({ message: "Book updated successfully", data: book });
    } catch (error) {
        console.error("Error updating book:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/books/:id — admin only
exports.deleteBook = async (req, res) => {
    try {
        const { id } = req.params;

        const book = await Book.findByPk(id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        await book.destroy();

        res.status(200).json({ message: "Book deleted successfully" });
    } catch (error) {
        console.error("Error deleting book:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
