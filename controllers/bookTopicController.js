const BookChapter = require("../models/BookChapter");
const BookTopic = require("../models/BookTopic");

// POST /api/books/chapters/:chapterId/topics — admin only
exports.createTopic = async (req, res) => {
    try {
        const { chapterId } = req.params;
        const { title, content } = req.body;

        if (!title) {
            return res.status(400).json({ message: "title is required" });
        }

        const chapter = await BookChapter.findByPk(chapterId);
        if (!chapter) {
            return res.status(404).json({ message: "Chapter not found" });
        }

        const topic = await BookTopic.create({
            chapter_id: chapterId,
            title,
            content: content || null,
            sort_order: 0,
        });

        res.status(201).json({ message: "Topic created successfully", data: topic });
    } catch (error) {
        console.error("Error creating topic:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/books/topics/reorder — admin only
// Body: { orders: [{ id, sort_order }, ...] }
exports.reorderTopics = async (req, res) => {
    try {
        const { orders } = req.body;
        if (!Array.isArray(orders) || orders.length === 0) {
            return res.status(400).json({ message: "orders array is required" });
        }

        await Promise.all(
            orders.map(({ id, sort_order }) =>
                BookTopic.update({ sort_order }, { where: { id } })
            )
        );

        res.status(200).json({ message: "Topic order updated successfully" });
    } catch (error) {
        console.error("Error reordering topics:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/books/topics/:id — admin only
exports.updateTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;

        const topic = await BookTopic.findByPk(id);
        if (!topic) {
            return res.status(404).json({ message: "Topic not found" });
        }

        if (title !== undefined) topic.title = title;
        if (content !== undefined) topic.content = content;

        await topic.save();

        res.status(200).json({ message: "Topic updated successfully", data: topic });
    } catch (error) {
        console.error("Error updating topic:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/books/topics/:id — admin only
exports.deleteTopic = async (req, res) => {
    try {
        const { id } = req.params;

        const topic = await BookTopic.findByPk(id);
        if (!topic) {
            return res.status(404).json({ message: "Topic not found" });
        }

        await topic.destroy();

        res.status(200).json({ message: "Topic deleted successfully" });
    } catch (error) {
        console.error("Error deleting topic:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
