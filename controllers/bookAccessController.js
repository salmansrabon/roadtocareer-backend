const { Op } = require("sequelize");
const Book = require("../models/Book");
const BookChapter = require("../models/BookChapter");
const BookTopic = require("../models/BookTopic");
const BookTopicBatchAccess = require("../models/BookTopicBatchAccess");
const BookTopicStudentAccess = require("../models/BookTopicStudentAccess");
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
// Student: all chapters/topics shown; isUnlocked per topic based on course_ids array
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
            const student = await Student.findOne({
                where: { StudentId: req.user.username },
                attributes: ["CourseId", "previous_course_id"],
            });
            if (!student) {
                return res.status(403).json({ message: "Student profile not found" });
            }

            const studentCourseIds = [student.CourseId, student.previous_course_id].filter(Boolean);

            const allTopicIds = chapters.flatMap((ch) => ch.topics.map((t) => t.id));

            if (allTopicIds.length > 0) {
                const [accessRows, studentAccessRows] = await Promise.all([
                    BookTopicBatchAccess.findAll({
                        where: { topic_id: { [Op.in]: allTopicIds } },
                        attributes: ["topic_id", "course_ids"],
                    }),
                    BookTopicStudentAccess.findAll({
                        where: { topic_id: { [Op.in]: allTopicIds }, student_id: req.user.username },
                        attributes: ["topic_id"],
                    }),
                ]);
                const unlockedIds = new Set([
                    ...accessRows
                        .filter((a) => Array.isArray(a.course_ids) && a.course_ids.some((id) => studentCourseIds.includes(id)))
                        .map((a) => a.topic_id),
                    ...studentAccessRows.map((a) => a.topic_id),
                ]);
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
// Student: 403 if their CourseId is not in the topic's course_ids array
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
            attributes: ["CourseId", "previous_course_id"],
        });
        if (!student) {
            return res.status(403).json({ message: "Student profile not found" });
        }

        const studentCourseIds = [student.CourseId, student.previous_course_id].filter(Boolean);

        const [accessRow, studentAccessRow] = await Promise.all([
            BookTopicBatchAccess.findOne({ where: { topic_id: id }, attributes: ["course_ids"] }),
            BookTopicStudentAccess.findOne({ where: { topic_id: id, student_id: req.user.username }, attributes: ["id"] }),
        ]);
        const hasCourseAccess =
            accessRow && Array.isArray(accessRow.course_ids) && accessRow.course_ids.some((courseId) => studentCourseIds.includes(courseId));
        const hasStudentAccess = !!studentAccessRow;
        if (!hasCourseAccess && !hasStudentAccess) {
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
// Upsert-merge: merges new courseIds into the existing JSON array for each topic.
exports.unlockTopics = async (req, res) => {
    try {
        const { topicIds, courseIds } = req.body;

        if (!Array.isArray(topicIds) || !Array.isArray(courseIds) || !topicIds.length || !courseIds.length) {
            return res.status(400).json({ message: "topicIds and courseIds are required non-empty arrays" });
        }

        const unlockedBy = req.user.username;

        for (const topicId of topicIds) {
            const existing = await BookTopicBatchAccess.findOne({ where: { topic_id: topicId } });
            if (existing) {
                const merged = [...new Set([...(existing.course_ids || []), ...courseIds])];
                await existing.update({ course_ids: merged, unlocked_by: unlockedBy });
            } else {
                await BookTopicBatchAccess.create({
                    topic_id: topicId,
                    course_ids: [...new Set(courseIds)],
                    unlocked_by: unlockedBy,
                });
            }
        }

        res.status(200).json({ message: `Access updated for ${topicIds.length} topic(s)` });
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
            ],
            order: [["updatedAt", "DESC"]],
        });

        res.status(200).json({ message: "Access records fetched", data: access });
    } catch (error) {
        console.error("Error fetching book access:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/books/:bookId/access/students — admin only
exports.getStudentAccess = async (req, res) => {
    try {
        const { bookId } = req.params;

        const chapters = await BookChapter.findAll({ where: { book_id: bookId }, attributes: ["id"] });
        if (!chapters.length) return res.status(200).json({ message: "No chapters found", data: [] });

        const chapterIds = chapters.map((c) => c.id);
        const topics = await BookTopic.findAll({
            where: { chapter_id: { [Op.in]: chapterIds } },
            attributes: ["id"],
        });
        if (!topics.length) return res.status(200).json({ message: "No topics found", data: [] });

        const topicIds = topics.map((t) => t.id);
        const access = await BookTopicStudentAccess.findAll({
            where: { topic_id: { [Op.in]: topicIds } },
            include: [{ model: BookTopic, attributes: ["id", "title", "chapter_id"] }],
            order: [["updatedAt", "DESC"]],
        });

        res.status(200).json({ message: "Student access records fetched", data: access });
    } catch (error) {
        console.error("Error fetching student access:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/books/access/unlock-students — admin only
// Body: { topicIds: [1,2,3], studentIds: ["S001", "S002"] }
exports.unlockTopicsForStudents = async (req, res) => {
    try {
        const { topicIds, studentIds } = req.body;

        if (!Array.isArray(topicIds) || !Array.isArray(studentIds) || !topicIds.length || !studentIds.length) {
            return res.status(400).json({ message: "topicIds and studentIds are required non-empty arrays" });
        }

        const unlockedBy = req.user.username;
        for (const topicId of topicIds) {
            for (const studentId of studentIds) {
                await BookTopicStudentAccess.upsert({ topic_id: topicId, student_id: studentId, unlocked_by: unlockedBy });
            }
        }

        res.status(200).json({ message: `Access granted for ${topicIds.length} topic(s) to ${studentIds.length} student(s)` });
    } catch (error) {
        console.error("Error unlocking topics for students:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/books/access/student — admin only
// Body: { topic_id, student_id }
exports.removeStudentAccess = async (req, res) => {
    try {
        const { topic_id, student_id } = req.body;

        if (!topic_id || !student_id) {
            return res.status(400).json({ message: "topic_id and student_id are required" });
        }

        const record = await BookTopicStudentAccess.findOne({ where: { topic_id, student_id } });
        if (!record) return res.status(404).json({ message: "Access record not found" });

        await record.destroy();
        res.status(200).json({ message: "Student access removed successfully" });
    } catch (error) {
        console.error("Error removing student access:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/books/access — admin only
// Body: { topic_id, course_id }
// Removes one course_id from the JSON array; deletes the row if the array becomes empty.
exports.removeAccess = async (req, res) => {
    try {
        const { topic_id, course_id } = req.body;

        if (!topic_id || !course_id) {
            return res.status(400).json({ message: "topic_id and course_id are required" });
        }

        const record = await BookTopicBatchAccess.findOne({ where: { topic_id } });
        if (!record) {
            return res.status(404).json({ message: "Access record not found" });
        }

        const updated = (record.course_ids || []).filter((id) => id !== course_id);

        if (updated.length === 0) {
            await record.destroy();
        } else {
            await record.update({ course_ids: updated });
        }

        res.status(200).json({ message: "Access removed successfully" });
    } catch (error) {
        console.error("Error removing access:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
