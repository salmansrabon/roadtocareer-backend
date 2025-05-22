const Course = require("../models/Course");
const Package = require("../models/Package");

exports.createCourse = async (req, res) => {
    try {
        const {
            courseId,
            batch_no,
            course_title,
            course_initial,
            drive_folder_id,
            short_description,
            is_enabled,
            enrollment,
            enrollment_start_date,
            enrollment_end_date,
            orientation_date,
            class_start_date,
            class_days, // Array
            class_time,
            course_image
        } = req.body;

        // Validate required fields
        if (!courseId || !batch_no || !course_title || !course_initial || !drive_folder_id ||
            !short_description || !enrollment_start_date || !enrollment_end_date ||
            !orientation_date || !class_start_date || !class_days || !class_time || !course_image) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const existingCourse = await Course.findOne({ where: { courseId } });
        if (existingCourse) {
            return res.status(400).json({ message: "Course ID already exists." });
        }

        const newCourse = await Course.create({
            courseId,
            batch_no,
            course_title,
            course_initial,
            drive_folder_id,
            short_description,
            is_enabled,
            enrollment,
            enrollment_start_date,
            enrollment_end_date,
            orientation_date,
            class_start_date,
            class_days: JSON.stringify(class_days), // Store as JSON array
            class_time,
            course_image
        });

        res.status(201).json({ message: "Course created successfully", course: newCourse });
    } catch (error) {
        console.error("Error creating course:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// ✅ Fetch Course Details by courseId
exports.getCourseDetails = async (req, res) => {
    try {
        const { courseId } = req.params;

        // ✅ Find Course by courseId including Package details
        const course = await Course.findOne({
            where: { courseId },
            attributes: [
                "courseId",
                "batch_no",
                "course_title",
                "course_initial",
                "drive_folder_id",
                "short_description",
                "is_enabled",
                "enrollment",
                "enrollment_start_date",
                "enrollment_end_date",
                "orientation_date",
                "class_start_date",
                "class_days",
                "class_time",
                "course_image",
                "createdAt",
                "updatedAt"
            ],
            include: [
                {
                    model: Package,
                    attributes: ["packageName", "studentFee", "jobholderFee", "installment"], // ✅ Fetch related package details
                }
            ]
        });

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        res.status(200).json({ success: true, course });
    } catch (error) {
        console.error("Error fetching course details:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getCoursesList = async (req, res) => {
    try {
        const { is_enabled } = req.query;

        const condition = {};
        if (is_enabled === "true") {
            condition.is_enabled = true;
        } else if (is_enabled === "false") {
            condition.is_enabled = false;
        }

        const courses = await Course.findAll({
            where: Object.keys(condition).length ? condition : undefined,
            attributes: [
                "courseId", "batch_no", "course_title", "drive_folder_id",
                "short_description", "is_enabled", "enrollment", "enrollment_start_date",
                "enrollment_end_date", "orientation_date", "class_start_date", "class_days",
                "class_time", "course_image"
            ],
            include: [
                {
                    model: Package,
                    attributes: ["id", "packageName", "studentFee", "jobholderFee", "installment"]
                }
            ]
        });

        res.status(200).json({
            count: courses.length,
            courses
        });
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const {
            batch_no,
            course_title,
            short_description,
            drive_folder_id,
            is_enabled,
            enrollment,
            enrollment_start_date,
            enrollment_end_date,
            orientation_date,
            class_start_date,
            class_days,
            class_time,
            course_image
        } = req.body;

        // ✅ Check if Course Exists
        const course = await Course.findOne({ where: { courseId } });
        if (!course) return res.status(404).json({ message: "Course not found." });

        // ✅ Update Course Details
        await course.update({
            batch_no,
            course_title,
            short_description,
            drive_folder_id,
            is_enabled,
            enrollment,
            enrollment_start_date,
            enrollment_end_date,
            orientation_date,
            class_start_date,
            class_days, // ✅ Stored as JSON string
            class_time,
            course_image
        });

        res.status(200).json({ message: "Course updated successfully!", course });
    } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        // ✅ Check if Course Exists
        const course = await Course.findOne({ where: { courseId } });
        if (!course) return res.status(404).json({ message: "Course not found." });

        // ✅ Delete Course
        await course.destroy();

        res.status(200).json({ message: "Course deleted successfully!" });
    } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

