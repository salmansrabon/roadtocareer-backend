const Book = require("../models/Book");
const BookChapter = require("../models/BookChapter");

// POST /api/books/:bookId/chapters — admin only
exports.createChapter = async (req, res) => {
    try {
        const { bookId } = req.params;
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ message: "title is required" });
        }

        const book = await Book.findByPk(bookId);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        const chapter = await BookChapter.create({
            book_id: bookId,
            title,
            sort_order: 0,
        });

        res.status(201).json({ message: "Chapter created successfully", data: chapter });
    } catch (error) {
        console.error("Error creating chapter:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/books/chapters/reorder — admin only
// Body: { orders: [{ id, sort_order }, ...] }
exports.reorderChapters = async (req, res) => {
    try {
        const { orders } = req.body;
        if (!Array.isArray(orders) || orders.length === 0) {
            return res.status(400).json({ message: "orders array is required" });
        }

        await Promise.all(
            orders.map(({ id, sort_order }) =>
                BookChapter.update({ sort_order }, { where: { id } })
            )
        );

        res.status(200).json({ message: "Chapter order updated successfully" });
    } catch (error) {
        console.error("Error reordering chapters:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/books/chapters/:id — admin only
exports.updateChapter = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        const chapter = await BookChapter.findByPk(id);
        if (!chapter) {
            return res.status(404).json({ message: "Chapter not found" });
        }

        if (title !== undefined) chapter.title = title;

        await chapter.save();

        res.status(200).json({ message: "Chapter updated successfully", data: chapter });
    } catch (error) {
        console.error("Error updating chapter:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/books/chapters/:id — admin only
exports.deleteChapter = async (req, res) => {
    try {
        const { id } = req.params;

        const chapter = await BookChapter.findByPk(id);
        if (!chapter) {
            return res.status(404).json({ message: "Chapter not found" });
        }

        await chapter.destroy();

        res.status(200).json({ message: "Chapter deleted successfully" });
    } catch (error) {
        console.error("Error deleting chapter:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
