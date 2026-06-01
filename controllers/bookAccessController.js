const { Op } = require("sequelize");
const Book = require("../models/Book");
const BookChapter = require("../models/BookChapter");
const BookTopic = require("../models/BookTopic");
const BookTopicBatchAccess = require("../models/BookTopicBatchAccess");
const Course = require("../models/Course");
const Student = require("../models/Student");

// GET /api/books — authenticated
exports.getPublishedBooks = async (req, res) => {
    try {
        const books = await Book.findAll({
            where: { status: "published" },
            attributes: ["id", "title", "slug", "description", "cover_image"],
            order: [
                ["sort_order", "ASC"],
                ["createdAt", "DESC"],
            ],
        });

        res.status(200).json({ message: "Books fetched successfully", data: books });
    } catch (error) {
        console.error("Error fetching published books:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/books/:slug — authenticated
// Admin: all chapters/topics (draft+published), no isUnlocked
// Student: published only, isUnlocked per topic; content field never included
exports.getBookBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const isAdmin = req.user.role === "admin" || req.user.role === "teacher";

        const book = await Book.findOne({
            where: isAdmin ? { slug } : { slug, status: "published" },
            include: [
                {
                    model: BookChapter,
                    attributes: ["id", "title", "sort_order", "status"],
                    include: [
                        {
                            model: BookTopic,
                            // content intentionally excluded — fetched separately via /topics/:id/content
                            attributes: ["id", "title", "sort_order", "status"],
                        },
                    ],
                },
            ],
            order: [
                [BookChapter, "sort_order", "ASC"],
                [BookChapter, "id", "ASC"],
                [BookChapter, BookTopic, "sort_order", "ASC"],
                [BookChapter, BookTopic, "id", "ASC"],
            ],
        });

        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        const bookData = book.toJSON();

        // sort_order tiebreaker: fall back to id ASC so newly created items (all sort_order=0) appear oldest-first
        let chapters = (bookData.BookChapters || []).sort((a, b) =>
            a.sort_order !== b.sort_order ? a.sort_order - b.sort_order : a.id - b.id
        );
        chapters.forEach((ch) => {
            ch.topics = (ch.BookTopics || []).sort((a, b) =>
                a.sort_order !== b.sort_order ? a.sort_order - b.sort_order : a.id - b.id
            );
            delete ch.BookTopics;
        });
        delete bookData.BookChapters;

        if (!isAdmin) {
            // No status filtering — all chapters and topics of a published book are shown.
            // Topic accessibility is governed entirely by book_topic_batch_access.
            const student = await Student.findOne({
                where: { StudentId: req.user.username },
                attributes: ["CourseId"],
            });
            if (!student) {
                return res.status(403).json({ message: "Student profile not found" });
            }

            const allTopicIds = chapters.flatMap((ch) => ch.topics.map((t) => t.id));

            if (allTopicIds.length > 0) {
                const unlockedAccess = await BookTopicBatchAccess.findAll({
                    where: {
                        topic_id: { [Op.in]: allTopicIds },
                        course_id: student.CourseId,
                    },
                    attributes: ["topic_id"],
                });
                const unlockedIds = new Set(unlockedAccess.map((a) => a.topic_id));
                chapters.forEach((ch) => {
                    ch.topics = ch.topics.map((t) => ({ ...t, isUnlocked: unlockedIds.has(t.id) }));
                });
            } else {
                chapters.forEach((ch) => {
                    ch.topics = ch.topics.map((t) => ({ ...t, isUnlocked: false }));
                });
            }
        }

        bookData.chapters = chapters;

        res.status(200).json({ message: "Book fetched successfully", data: bookData });
    } catch (error) {
        console.error("Error fetching book by slug:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/books/topics/:id/content — authenticated
// Admin: always returns content
// Student: 403 if topic not unlocked for their course
exports.getTopicContent = async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === "admin" || req.user.role === "teacher";

        const topic = await BookTopic.findByPk(id, {
            attributes: ["id", "title", "content", "status"],
        });

        if (!topic) {
            return res.status(404).json({ message: "Topic not found" });
        }

        if (isAdmin) {
            return res.status(200).json({
                message: "Topic content fetched",
                data: { id: topic.id, title: topic.title, content: topic.content },
            });
        }

        const student = await Student.findOne({
            where: { StudentId: req.user.username },
            attributes: ["CourseId"],
        });
        if (!student) {
            return res.status(403).json({ message: "Student profile not found" });
        }

        const access = await BookTopicBatchAccess.findOne({
            where: { topic_id: id, course_id: student.CourseId },
        });
        if (!access) {
            return res.status(403).json({ message: "Access denied: this topic is not unlocked for your course" });
        }

        res.status(200).json({
            message: "Topic content fetched",
            data: { id: topic.id, title: topic.title, content: topic.content },
        });
    } catch (error) {
        console.error("Error fetching topic content:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/books/access/unlock — admin only
// Body: { topicIds: [1,2,3], courseIds: ["SDET-B12", "SDET-B13"] }
exports.unlockTopics = async (req, res) => {
    try {
        const { topicIds, courseIds } = req.body;

        if (!Array.isArray(topicIds) || !Array.isArray(courseIds) || !topicIds.length || !courseIds.length) {
            return res.status(400).json({ message: "topicIds and courseIds are required non-empty arrays" });
        }

        const unlockedBy = req.user.username;
        const records = [];
        for (const topicId of topicIds) {
            for (const courseId of courseIds) {
                records.push({ topic_id: topicId, course_id: courseId, unlocked_by: unlockedBy });
            }
        }

        // ignoreDuplicates generates INSERT IGNORE — safe to call multiple times
        await BookTopicBatchAccess.bulkCreate(records, { ignoreDuplicates: true });

        res.status(200).json({ message: `${records.length} topic-course combinations processed` });
    } catch (error) {
        console.error("Error unlocking topics:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/books/:bookId/access — admin only
exports.getBookAccess = async (req, res) => {
    try {
        const { bookId } = req.params;

        const chapters = await BookChapter.findAll({
            where: { book_id: bookId },
            attributes: ["id"],
        });

        if (!chapters.length) {
            return res.status(200).json({ message: "No chapters found", data: [] });
        }

        const chapterIds = chapters.map((c) => c.id);

        const topics = await BookTopic.findAll({
            where: { chapter_id: { [Op.in]: chapterIds } },
            attributes: ["id"],
        });

        if (!topics.length) {
            return res.status(200).json({ message: "No topics found", data: [] });
        }

        const topicIds = topics.map((t) => t.id);

        const access = await BookTopicBatchAccess.findAll({
            where: { topic_id: { [Op.in]: topicIds } },
            include: [
                {
                    model: BookTopic,
                    attributes: ["id", "title", "chapter_id"],
                },
                {
                    model: Course,
                    attributes: ["courseId", "course_title", "batch_no"],
                },
            ],
        });

        res.status(200).json({ message: "Access records fetched", data: access });
    } catch (error) {
        console.error("Error fetching book access:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/books/access — admin only
// Body: { topic_id, course_id }
exports.removeAccess = async (req, res) => {
    try {
        const { topic_id, course_id } = req.body;

        if (!topic_id || !course_id) {
            return res.status(400).json({ message: "topic_id and course_id are required" });
        }

        const deleted = await BookTopicBatchAccess.destroy({
            where: { topic_id, course_id },
        });

        if (!deleted) {
            return res.status(404).json({ message: "Access record not found" });
        }

        res.status(200).json({ message: "Access removed successfully" });
    } catch (error) {
        console.error("Error removing access:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
